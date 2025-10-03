/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {enableBlocksOnDrag} from './disabled_blocks';
import {registerHtmlToast} from './html_toast';
import {getNonShadowBlock} from './workspace_utilities';

/** Plugin for keyboard navigation. */
export class KeyboardNavigation {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;

  /** Keyboard navigation controller instance for the workspace. */
  private navigationController: NavigationController;

  /** Cursor for the main workspace. */
  private cursor: Blockly.LineCursor;

  /**
   * Focus ring in the workspace.
   */
  private workspaceFocusRing: Element | null = null;

  /**
   * Selection ring inside the workspace.
   */
  private workspaceSelectionRing: Element | null = null;

  /**
   * The block currently in sticky mode (following the cursor).
   * When non-null, indicates we're in "click and stick" mode.
   */
  private stickyBlock: Blockly.BlockSvg | null = null;

  /**
   * Used to restore monkey patch.
   */
  private oldWorkspaceResize:
    | InstanceType<typeof Blockly.WorkspaceSvg>['resize']
    | null = null;

  /**
   * Returns whether the plugin is currently in sticky mode (click-and-stick).
   * @returns True if a block is in sticky mode, false otherwise.
   */
  get isInStickyMode(): boolean {
    return !!this.stickyBlock;
  }

  /**
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will be added to.
   * @param options Options for plugin
   * @param options.allowCrossWorkspacePaste If true, will allow paste
   * option to appear enabled when pasting in a different workspace
   * than was copied from. Defaults to false. Set to true if using
   * cross-tab-copy-paste plugin or similar.
   * @param options.highlightConnections If true, will highlight all
   * valid connection points when entering move mode. Defaults to true.
   * Useful for improving mouse accessibility.
   */
  constructor(
    workspace: Blockly.WorkspaceSvg,
    options: {
      allowCrossWorkspacePaste?: boolean;
      highlightConnections?: boolean;
    } = {
      allowCrossWorkspacePaste: false,
      highlightConnections: true,
    },
  ) {
    this.workspace = workspace;

    this.navigationController = new NavigationController({
      allowCrossWorkspacePaste: options.allowCrossWorkspacePaste ?? false,
      highlightConnections: options.highlightConnections ?? true,
      // Disable automatic scroll-to-view during sticky mode to prevent jarring jumps
      // as the block moves near viewport edges. Manual scrolling (mouse wheel, etc.)
      // is still available on desktop. On touch devices, touch-based scrolling is
      // prevented during drags (see handleTouchMove) to avoid conflicts with block movement.
      shouldDisableAutoScroll: () => !!this.stickyBlock,
    });
    this.navigationController.init();
    this.navigationController.addWorkspace(workspace);
    this.navigationController.enable(workspace);

    this.cursor = new Blockly.LineCursor(workspace);

    // Add the event listener to enable disabled blocks on drag.
    workspace.addChangeListener(enableBlocksOnDrag);

    // Set up click and stick functionality
    this.setupClickAndStick();

    // Make this instance available globally for testing
    (window as any).keyboardNavigation = this;

    // Move the flyout for logical tab order.
    const flyout = workspace.getFlyout();
    if (flyout != null && flyout instanceof Blockly.Flyout) {
      // This relies on internals.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flyoutElement = ((flyout as any).svgGroup_ as SVGElement) ?? null;
      flyoutElement?.parentElement?.insertBefore(
        flyoutElement,
        workspace.getParentSvg(),
      );
    }

    this.oldWorkspaceResize = workspace.resize;
    workspace.resize = () => {
      this.oldWorkspaceResize?.call(this.workspace);
      this.resizeWorkspaceRings();
    };
    this.workspaceSelectionRing = Blockly.utils.dom.createSvgElement('rect', {
      fill: 'none',
      class: 'blocklyWorkspaceSelectionRing',
    });
    workspace.getSvgGroup().appendChild(this.workspaceSelectionRing);
    this.workspaceFocusRing = Blockly.utils.dom.createSvgElement('rect', {
      fill: 'none',
      class: 'blocklyWorkspaceFocusRing',
    });
    workspace.getSvgGroup().appendChild(this.workspaceFocusRing);
    this.resizeWorkspaceRings();

    registerHtmlToast();
  }

  /**
   * Gets the mover from the navigation controller.
   */
  private get mover() {
    return (this.navigationController as any).mover;
  }

  /**
   * Gets the drag strategy from a block.
   */
  private getDragStrategy(block: Blockly.BlockSvg) {
    return (block as any).dragStrategy;
  }

  /**
   * Sets click-and-stick mode on the sticky block's drag strategy.
   */
  private setClickAndStickMode(enabled: boolean) {
    if (!this.stickyBlock) return;
    const strategy = this.getDragStrategy(this.stickyBlock);
    if (strategy?.setClickAndStickMode) {
      strategy.setClickAndStickMode(enabled);
    }
  }

  /**
   * Common cleanup for exiting sticky mode.
   * Clears click-and-stick mode, ends the move, and resets sticky state.
   */
  private cleanupStickyMode(action: 'finish' | 'abort') {
    if (!this.stickyBlock) return;

    // Clear click-and-stick mode before ending the move
    this.setClickAndStickMode(false);

    // End the move via mover
    if (this.mover && this.mover.isMoving(this.workspace)) {
      if (action === 'finish') {
        this.mover.finishMove(this.workspace);
      } else {
        this.mover.abortMove(this.workspace);
      }
    }

    // Reset sticky UI state
    this.resetStickyState();
  }

  private resizeWorkspaceRings() {
    if (!this.workspaceFocusRing || !this.workspaceSelectionRing) return;
    this.resizeFocusRingInternal(this.workspaceSelectionRing, 5);
    this.resizeFocusRingInternal(this.workspaceFocusRing, 0);
  }

  private resizeFocusRingInternal(ring: Element, inset: number) {
    const metrics = this.workspace.getMetrics();
    ring.setAttribute('x', (metrics.absoluteLeft + inset).toString());
    ring.setAttribute('y', (metrics.absoluteTop + inset).toString());
    ring.setAttribute(
      'width',
      Math.max(0, metrics.viewWidth - inset * 2).toString(),
    );
    ring.setAttribute(
      'height',
      Math.max(0, metrics.svgHeight - inset * 2).toString(),
    );
  }

  /**
   * Disables keyboard navigation for this navigator's workspace.
   */
  dispose() {
    this.workspaceFocusRing?.remove();
    this.workspaceSelectionRing?.remove();
    if (this.oldWorkspaceResize) {
      this.workspace.resize = this.oldWorkspaceResize;
    }

    // Remove the event listener that enables blocks on drag
    this.workspace.removeChangeListener(enableBlocksOnDrag);
    this.navigationController.dispose();
  }

  /**
   * Toggle visibility of a help dialog for the keyboard shortcuts.
   */
  toggleShortcutDialog(): void {
    this.navigationController.shortcutDialog.toggle(this.workspace);
  }

  /**
   * Registers a default toolbox implementation that doesn't handle
   * keydown events, since we now handle them in this plugin. If you
   * use the default toolbox, call this function before calling
   * `Blockly.inject`. If you use a custom toolbox, override the
   * `onKeyDown_` method in your toolbox implementation to make it a no-op.
   */
  static registerNavigationDeferringToolbox() {
    this.registerNavigationDeferringToolbox();
  }

  /**
   * Register CSS used by the plugin.
   * This is broken up into sections by purpose, with some notes about
   * where it should eventually live.
   * Must be called before `Blockly.inject`.
   */
  static registerKeyboardNavigationStyles() {
    // Enable the delete icon for comments.
    //
    // This should remain in the plugin for the time being because we do
    // not want to display the delete icon by default.
    Blockly.Css.register(`
  .blocklyDeleteIcon {
    display: block;
  }
`);

    // Set variables that will be used to control the appearance of the
    // focus indicators.  Attach them to the injectionDiv since they will
    // apply to things contained therein.
    //
    // This should be moved to core, either to core/css.ts
    // or to core/renderers/.
    Blockly.Css.register(`
  .injectionDiv {
    --blockly-active-node-color: #fff200;
    --blockly-active-tree-color: #60a5fa;
    --blockly-selection-width: 3px;
  }
`);

    // Styling focusing blocks, connections and fields.
    //
    // This should be moved to core, being integrated into the
    // existing styling of renderers in core/renderers/*/constants.ts.
    //
    // Many selectors include .blocklyKeyboardNavigation to ensure keyboard
    // nav is on (via the heuristic). This class is added/removed from body.
    Blockly.Css.register(`
  /* Active focus cases: */
  /* Blocks with active focus. */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus:is(.blocklyPath, .blocklyHighlightedConnectionPath),
  /* Fields with active focus, */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus.blocklyField
    > .blocklyFieldRect,
  /* Icons with active focus. */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus.blocklyIconGroup
    > .blocklyIconShape:first-child {
    stroke: var(--blockly-active-node-color);
    stroke-width: var(--blockly-selection-width);
  }

  /* Passive focus cases: */
  /* Blocks with passive focus except when widget/dropdown div in use. */
  .blocklyKeyboardNavigation:not(
          :has(
              .blocklyDropDownDiv:focus-within,
              .blocklyWidgetDiv:focus-within
            )
        )
    .blocklyPassiveFocus:is(
      .blocklyPath:not(.blocklyFlyout .blocklyPath),
      .blocklyHighlightedConnectionPath
    ),
  /* Fields with passive focus except when widget/dropdown div in use. */
  .blocklyKeyboardNavigation:not(
          :has(
              .blocklyDropDownDiv:focus-within,
              .blocklyWidgetDiv:focus-within
            )
        )
    .blocklyPassiveFocus.blocklyField
    > .blocklyFieldRect,
  /* Icons with passive focus except when widget/dropdown div in use. */
  .blocklyKeyboardNavigation:not(
          :has(
              .blocklyDropDownDiv:focus-within,
              .blocklyWidgetDiv:focus-within
            )
        )
    .blocklyPassiveFocus.blocklyIconGroup
    > .blocklyIconShape:first-child {
    stroke: var(--blockly-active-node-color);
    stroke-dasharray: 5px 3px;
    stroke-width: var(--blockly-selection-width);
  }

  /* Workaround for unexpectedly hidden connection path due to core style. */
  .blocklyKeyboardNavigation
    .blocklyPassiveFocus.blocklyHighlightedConnectionPath {
    display: unset !important;
  }
`);

    // Styling for focusing the toolbox and flyout.
    //
    // This should be moved to core, to core/css.ts if not to somewhere
    // more specific in core/toolbox/.
    Blockly.Css.register(`
  /* Different ways for toolbox/flyout to be the active tree: */
  /* Active focus in the flyout. */
  .blocklyKeyboardNavigation .blocklyFlyout:has(.blocklyActiveFocus),
  /* Active focus in the toolbox. */
  .blocklyKeyboardNavigation .blocklyToolbox:has(.blocklyActiveFocus),
  /* Active focus on the toolbox/flyout. */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus:is(.blocklyFlyout, .blocklyToolbox) {
    outline-offset: calc(var(--blockly-selection-width) * -1);
    outline: var(--blockly-selection-width) solid
      var(--blockly-active-tree-color);
  }

  /* Suppress default outline. */
  .blocklyKeyboardNavigation
    .blocklyToolboxCategoryContainer:focus-visible {
    outline: none;
  }
`);

    // Styling for focusing the Workspace.
    //
    // This should be move to core, probably to core/css.ts.
    Blockly.Css.register(`
  /* Different ways for the workspace to be the active tree: */
  /* Active focus within workspace. */
  .blocklyKeyboardNavigation
    .blocklyWorkspace:has(.blocklyActiveFocus)
    .blocklyWorkspaceFocusRing,
  /* Active focus within drag layer. */
  .blocklyKeyboardNavigation
    .blocklySvg:has(~ .blocklyBlockDragSurface .blocklyActiveFocus)
    .blocklyWorkspaceFocusRing,
  /* Active focus on workspace. */
  .blocklyKeyboardNavigation
    .blocklyWorkspace.blocklyActiveFocus
    .blocklyWorkspaceFocusRing,
  /* Focus in widget/dropdown div considered to be in workspace. */
  .blocklyKeyboardNavigation:has(
    .blocklyWidgetDiv:focus-within,
    .blocklyDropDownDiv:focus-within
  )
    .blocklyWorkspace
    .blocklyWorkspaceFocusRing {
    stroke: var(--blockly-active-tree-color);
    stroke-width: calc(var(--blockly-selection-width) * 2);
  }

  /* The workspace itself is the active node. */
  .blocklyKeyboardNavigation
    .blocklyWorkspace.blocklyActiveFocus
    .blocklyWorkspaceSelectionRing {
    stroke: var(--blockly-active-node-color);
    stroke-width: var(--blockly-selection-width);
  }
  
  /* The workspace itself is the active node. */
  .blocklyKeyboardNavigation
    .blocklyBubble.blocklyActiveFocus
    .blocklyDraggable {
    stroke: var(--blockly-active-node-color);
    stroke-width: var(--blockly-selection-width);
  }
`);

    // Keyboard-nav-specific styling for the context menu.
    //
    // This should remain in the plugin for the time being because the
    // classes selected are currently only defined in the plugin.
    Blockly.Css.register(`
  .blocklyRTL .blocklyMenuItemContent .blocklyShortcutContainer {
    flex-direction: row-reverse;
  }
  .blocklyMenuItemContent .blocklyShortcutContainer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .blocklyMenuItemContent .blocklyShortcutContainer .blocklyShortcut {
    color: #ccc;
  }
`);

    // Styling for connection highlighting during move mode.
    //
    // This should remain in the plugin for the time being because these
    // classes are specific to the keyboard navigation plugin's move functionality.
    Blockly.Css.register(`
  /* Clean highlighting for potential connection points */
  .blocklyPotentialConnection {
    stroke: #00ff00 !important;
    stroke-width: 5px !important;
    fill: rgba(0, 255, 0, 0.9) !important;
    z-index: 9999 !important;
    pointer-events: auto !important;
    display: block !important;
  }

  /* Ensure highlights are visible in keyboard navigation mode */
  .blocklyKeyboardNavigation .blocklyPotentialConnection {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
`);

    // Register classes used by the shortcuts modal
    Blockly.Css.register(`
:root {
  --divider-border-color: #eee;
  --key-border-color: #ccc;
  --shortcut-modal-border-color: #9aa0a6;
}

.shortcut-modal {
  border: 1px solid var(--shortcut-modal-border-color);
  border-radius: 12px;
  box-shadow: 6px 6px 32px rgba(0,0,0,.5);
  flex-direction: column;
  gap: 12px;
  margin: auto;
  max-height: 82vh;
  max-width: calc(100% - 10em);
  padding: 24px 12px 24px 32px;
  position: relative;
  z-index: 99;
}

.shortcut-modal[open] {
  display: flex;
}

.shortcut-modal .close-modal {
  border: 0;
  background: transparent;
  float: inline-end;
  margin: 0 0 0 0;
  position: absolute;
  top: 16px;
  right: 24px;
}

.shortcut-modal h1 {
  font-weight: 600;
  font-size: 1.2em;
}

.shortcut-modal:before {
  background: radial-gradient(rgba(244, 244, 244, 0.43), rgba(75, 75, 75, 0.51));
  align-items: center;
  display: block;
  font-family: Roboto;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
}

.shortcut-tables {
  display: grid;
  align-items: start;
  grid-template-columns: 1fr;
  row-gap: 1em;
  column-gap: 2em;
}

@media (min-width: 950px) {
  .shortcut-tables {
    grid-template-columns: 1fr 1fr
  }
}

@media (min-width: 1360px) {
  .shortcut-tables {
    grid-template-columns: 1fr 1fr 1fr
  }
}

.shortcut-table {
  border-collapse: collapse;
  font-family: Roboto;
  font-size: .9em;
}

.shortcut-table th {
  padding-inline-end: 0.5em;
  text-align: left;
  text-wrap: nowrap;
  vertical-align: baseline;
}

.shortcut-table td:first-child {
  text-wrap: auto;
  width: 40%;
}

.shortcut-table tr:has(+ .category) {
  --divider-border-color: transparent;
  margin-end: 1em;
}

.shortcut-table tr:not(.category, :last-child) {
  border-bottom: 1px solid var(--divider-border-color);
}

.shortcut-table td {
  padding: 0.2em 1em 0.3em 0;
  text-wrap: nowrap;
}

.shortcut-table h2 {
  border-bottom: 1px solid #999;
  font-size: 1em;
  padding-block-end: 0.5em;
}

.shortcut-table .key {
  border: 1px solid var(--key-border-color);
  border-radius: 8px;
  display: inline-block;
  margin: 0 4px;
  min-width: 2em;
  padding: .3em .5em;
  text-align: center;
}

.shortcut-table .separator {
  color: gray;
  display: inline-block;
  padding: 0 0.5em;
}

.shortcut-container {
  font-size: 0.95em;
  overflow: auto;
  padding: 0.5em;
}

.shortcut-combo {
  display: inline-block;
  padding: 0.25em 0;
  text-wrap: nowrap;
}

/* Styling for blocks in sticky mode (click and stick) */
.blockly-sticky-mode {
  filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8)) !important;
  opacity: 0.9 !important;
}

/* Use child combinator (>) to only style the immediate block, not descendants */
.blockly-sticky-mode > .blocklyPath {
  stroke: #00ff00 !important;
  stroke-width: 3 !important;
}

`);
  }

  /**
   * Sets up click and stick functionality for blocks.
   * Uses native dblclick event for simplicity.
   */
  private setupClickAndStick() {
    const workspaceElement = this.workspace.getParentSvg();
    if (!workspaceElement) return;

    // Add dblclick listener (native browser event).
    workspaceElement.addEventListener('dblclick', (event) => {
      this.handleDoubleClick(event);
    }, false);

    // Add pointermove listener for cursor-following during sticky mode.
    // This makes blocks follow the mouse/touch during click-and-stick mode.
    document.addEventListener('pointermove', (event) => {
      this.handlePointerMove(event);
    }, false);

    // Add click listener to handle sticky mode drops on mouse clicks.
    // Touch/pen taps are also handled here via the PointerEvent's click event.
    document.addEventListener('click', (event) => {
      this.handleClick(event);
    }, true);

    // Escape and Enter keys exit sticky mode (handled by Mover shortcuts).
    // Note: The Mover's keyboard shortcuts already handle Enter/Escape,
    // but we keep this as a fallback for consistency.
    document.addEventListener('keydown', (event) => {
      if (this.stickyBlock) {
        if (event.key === 'Escape' || event.key === 'Enter') {
          // Let the Mover handle this via its shortcuts
          // This is just a safety net
        }
      }
    });
  }

  /**
   * Handles double-click events on blocks to enter sticky mode.
   */
  private handleDoubleClick(event: MouseEvent) {
    if (event.defaultPrevented) return;

    console.log('=== DOUBLE-CLICK EVENT ===');
    console.log('Currently in sticky mode:', !!this.stickyBlock);
    console.log('Target:', event.target);

    // If already in sticky mode, ignore double-clicks (prevents workspace background double-clicks from interfering)
    if (this.stickyBlock) {
      console.log('Ignoring double-click during sticky mode');
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const target = event.target as Element;
    const clickedBlock = this.getBlockFromEvent(event);

    // Prime audio for sound effects
    if (clickedBlock) {
      this.workspace.getAudioManager().preload();
    }

    // Don't handle double-click on fields - let them handle their own interactions
    if (target && this.isDoubleClickOnField(target)) {
      return;
    }

    // Get the non-shadow parent block
    const block = getNonShadowBlock(clickedBlock);
    if (block && block.isMovable()) {
      if (this.enterStickyMode(block, event.clientX, event.clientY)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  /**
   * Handles click events during sticky mode.
   * Supports mouse, touch, and pen interactions via PointerEvents.
   */
  private handleClick(event: MouseEvent) {
    // Only process clicks during sticky mode
    if (!this.stickyBlock) return;

    // Delegate to sticky mode click handler
    this.handleStickyModeClick(event);
  }

  /**
   * Handles pointer movement during sticky mode to make blocks follow the cursor.
   * Uses PointerEvents following Blockly core pattern for unified mouse/touch/pen handling.
   */
  private handlePointerMove(event: PointerEvent) {
    // Only process during sticky mode
    if (!this.stickyBlock) return;

    // Get the mover and moveInfo
    const moveInfo = this.mover?.moves?.get(this.workspace);

    if (!moveInfo) {
      console.warn('No moveInfo found during pointer move');
      return;
    }

    // Convert screen coordinates to workspace coordinates
    const targetWorkspaceCoords = Blockly.utils.svgMath.screenToWsCoordinates(
      this.workspace,
      new Blockly.utils.Coordinate(event.clientX, event.clientY)
    );

    // Calculate the delta from the start position
    const deltaX = targetWorkspaceCoords.x - moveInfo.startLocation.x;
    const deltaY = targetWorkspaceCoords.y - moveInfo.startLocation.y;

    // Update the total delta
    moveInfo.totalDelta.x = deltaX;
    moveInfo.totalDelta.y = deltaY;

    // Call onDrag to update the block position and connection previews
    if (moveInfo.dragger) {
      moveInfo.dragger.onDrag(
        new Blockly.utils.Coordinate(event.clientX, event.clientY),
        moveInfo.totalDelta
      );
    }
  }

  /**
   * Handles clicks during sticky mode for drop/connect/delete actions.
   * Supports both mouse and touch/pen interactions.
   */
  private handleStickyModeClick(event: MouseEvent | PointerEvent) {
    if (!this.stickyBlock) return;

    event.preventDefault();
    event.stopPropagation();

    const clientX = event.clientX;
    const clientY = event.clientY;

    // Check if clicking on the bin - highest priority
    if (this.isClickOnBin(clientX, clientY)) {
      this.deleteBlockOnBin();
      return;
    }

    // Check if clicking on a connection highlight
    const connectionInfo = this.findConnectionAtPoint(clientX, clientY);
    if (connectionInfo) {
      this.connectToClickedConnection(connectionInfo, clientX, clientY);
      return;
    }

    // Check if there's a connection preview that has changed from the original
    const dragStrategy = this.getDragStrategy(this.stickyBlock);
    if (dragStrategy && dragStrategy.connectionCandidate) {
      const initialNeighbour = dragStrategy.getInitialConnectionNeighbour();
      const currentNeighbour = dragStrategy.connectionCandidate.neighbour;

      // Only accept the preview if it has changed from the original connection
      // This allows immediate workspace drops without moving the mouse first
      if (currentNeighbour !== initialNeighbour) {
        this.acceptConnectionCandidate();
        return;
      }
    }

    // Otherwise, drop the block at the clicked position
    this.exitStickyModeAndDrop(clientX, clientY);
  }

  /**
   * Gets a block from a mouse/touch event target.
   */
  private getBlockFromEvent(event: { target: EventTarget | null }): Blockly.BlockSvg | null {
    const target = event.target as Element;
    if (!target) return null;

    // Get all blocks in the workspace
    const blocks = this.workspace.getAllBlocks();

    // Find all block elements that contain the click target
    const allBlockElements: Element[] = [];
    let currentElement: Element | null = target;

    while (currentElement) {
      if (currentElement.classList?.contains('blocklyBlock')) {
        allBlockElements.push(currentElement);
      }
      currentElement = currentElement.parentElement;
    }

    // If we found block elements, find the innermost (most specific) one
    if (allBlockElements.length > 0) {
      // The first element in our array is the innermost block
      const innermostBlockElement = allBlockElements[0];

      // Find the BlockSvg instance for this element
      const block = blocks.find(b => b.getSvgRoot() === innermostBlockElement);

      if (block && block instanceof Blockly.BlockSvg) {
        console.log('Found innermost block:', block.type, 'from', allBlockElements.length, 'nested blocks');
        return block;
      }
    }

    return null;
  }

  /**
   * Checks if a double-click event is on a field element that should handle its own double-click.
   * Uses Blockly's existing gesture system field detection logic.
   */
  private isDoubleClickOnField(target: Element): boolean {
    // Use Blockly's existing gesture field detection - this is the most reliable method
    // By the time our double-click handler runs, Blockly has already processed the mousedown
    // event and created a gesture with proper field detection
    const workspace = this.workspace;
    const currentGesture = (workspace as any).currentGesture_;

    if (currentGesture && (currentGesture as any).startField) {
      console.log('Current gesture started on a field:', (currentGesture as any).startField.constructor.name);
      return true;
    }

    // If no gesture detected a field, this is likely a block double-click
    console.log('No field detected by gesture system, treating as block double-click');
    return false;
  }

  /**
   * Enters sticky mode where a block follows the cursor.
   * Integrates with the existing move infrastructure.
   */
  private enterStickyMode(block: Blockly.BlockSvg, clientX: number, clientY: number): boolean {
    // Abort any move already in progress
    if (this.mover.isMoving(this.workspace)) {
      this.mover.abortMove(this.workspace);
    }

    // Exit if already in sticky mode
    if (this.stickyBlock) {
      this.exitStickyModeAndDrop();
    }

    // Validate block
    if (!block || block.isDisposed()) {
      return false;
    }

    try {
      // Pass callback to reset sticky state when move finishes
      const onMoveFinished = () => {
        this.resetStickyState();
      };

      const success = this.mover.startMove(this.workspace, block, 'Move' as any, null, onMoveFinished);

      if (success) {
        this.stickyBlock = block;

        // Add visual indication
        block.getSvgRoot().classList.add('blockly-sticky-mode');

        // Enable click-and-stick mode in drag strategy
        this.setClickAndStickMode(true);

        return true;
      }
      return false;
    } catch (error) {
      this.stickyBlock = null;
      return false;
    }
  }

  /**
   * Accepts the current connection candidate from the drag strategy.
   * PHASE 3: Simplified - Mover handles render and cleanup.
   */
  private acceptConnectionCandidate() {
    if (!this.stickyBlock) return;

    console.log('Accepting connection and exiting sticky mode');

    // The drag strategy already has a connection candidate set up
    // Just finish the move normally - this will use the existing connection candidate
    // Mover.postDragEndCleanup handles render in requestAnimationFrame
    this.cleanupStickyMode('finish');
  }

  /**
   * Checks if the given screen coordinates are over the trashcan/bin.
   *
   * @param clientX Screen X coordinate.
   * @param clientY Screen Y coordinate.
   * @returns True if the coordinates are over the trashcan.
   */
  private isClickOnBin(clientX: number, clientY: number): boolean {
    // Find the trashcan element in the DOM using the standard Blockly CSS class
    const trashcanElement = document.querySelector('.blocklyTrash');
    if (!trashcanElement) {
      return false;
    }

    // Get the bounding box of the trashcan
    const rect = trashcanElement.getBoundingClientRect();

    // Check if the click coordinates are within the trashcan bounds
    return clientX >= rect.left &&
           clientX <= rect.right &&
           clientY >= rect.top &&
           clientY <= rect.bottom;
  }

  /**
   * Deletes the sticky block when it's dropped on the bin.
   * PHASE 3: Simplified to use Mover properly.
   */
  private deleteBlockOnBin() {
    if (!this.stickyBlock) return;

    console.log('=== DELETING BLOCK ON BIN ===');
    console.log('Deleting block:', this.stickyBlock.type, this.stickyBlock.id);

    // Store the block for deletion
    const blockToDelete = this.stickyBlock;

    // PHASE 3: Abort the move properly through Mover
    this.cleanupStickyMode('abort');

    // Unplug the block with healStack=true to reconnect children to parent
    // This ensures only the single block is deleted, not its entire subtree
    blockToDelete.unplug(true);
    console.log('Block unplugged with healStack - children reconnected to parent');

    // Delete only the single block
    blockToDelete.dispose();
    console.log('Block deleted successfully');
  }

  /**
   * Finds a connection point at the given screen coordinates.
   * Uses the ConnectionHighlighter to get accurate bounding boxes for highlighted connections.
   */
  private findConnectionAtPoint(clientX: number, clientY: number): any {
    console.log('KM --- findConnectionAtPoint ---');
    console.log('KM Screen coords:', clientX, clientY);

    // First, check if we have highlighted connections from the drag strategy
    const dragStrategy = (this.stickyBlock as any)?.dragStrategy;
    if (dragStrategy && dragStrategy.connectionHighlighter) {
      // Use the ConnectionHighlighter to find connections at the point
      const highlightedConnection = dragStrategy.connectionHighlighter.findConnectionAtPoint(clientX, clientY);

      if (highlightedConnection) {
        console.log('Found highlighted connection at point:', highlightedConnection);

        // Verify compatibility with the sticky block
        const stickyConnections = this.stickyBlock?.getConnections_(true);
        if (stickyConnections) {
          for (const stickyConnection of stickyConnections) {
            // Use the workspace's connection checker to verify compatibility
            const connectionChecker = this.workspace.connectionChecker;
            if (connectionChecker.canConnect(stickyConnection, highlightedConnection, true, Infinity)) {
              console.log('Highlighted connection is compatible!');
              return {
                connection: highlightedConnection,
                stickyConnection: stickyConnection,
                distance: 0, // Direct hit on highlighted connection
                isHighlighted: true
              };
            }
          }
        }
      }
    }

    console.log('No connection found at point');
    return null;
  }

  /**
   * Connects the sticky block to a specific connection point.
   * PHASE 3: Simplified - just set connection candidate and let Mover handle it.
   */
  private connectToClickedConnection(connectionInfo: any, clientX: number, clientY: number) {
    if (!this.stickyBlock) return;

    const { connection, stickyConnection } = connectionInfo;

    console.log('Connecting to clicked connection');

    // Get the drag strategy and set up the connection candidate
    const dragStrategy = this.getDragStrategy(this.stickyBlock);
    if (dragStrategy) {
      // Set up the connection candidate - Mover will handle positioning and connecting
      dragStrategy.connectionCandidate = {
        local: stickyConnection,
        neighbour: connection,
        distance: 0
      };

      console.log('Set connection candidate:', dragStrategy.connectionCandidate);
    }

    // Now finish the move - Mover will handle positioning and connection
    // Mover.postDragEndCleanup handles render and all cleanup
    this.cleanupStickyMode('finish');
  }

  /**
   * Resets the sticky mode UI state.
   * PHASE 4: Simplified - Mover handles strategy/highlight cleanup.
   * This should be called AFTER mover.finishMove() or mover.abortMove().
   */
  private resetStickyState() {
    // Clear sticky mode UI state
    if (this.stickyBlock) {
      this.stickyBlock.getSvgRoot().classList.remove('blockly-sticky-mode');
      this.stickyBlock = null;
    }

    // Clear the selection to allow new clicks to work
    const selection = Blockly.common.getSelected();
    if (selection) {
      selection.unselect();
    }

    // Clear Blockly's touch identifier
    // After sticky mode, the touch identifier from the drop gesture is stuck,
    // causing Blockly to ignore new touch events with different pointer IDs
    try {
      // Clear immediately
      Blockly.Touch.clearTouchIdentifier();
      // And also clear after event loop to be extra safe
      setTimeout(() => {
        Blockly.Touch.clearTouchIdentifier();
      }, 0);
    } catch (e) {
      console.warn('Failed to clear touch identifier:', e);
    }

    // Defensive safety check: we shouldn't get here with mover still moving
    if (this.mover && this.mover.isMoving(this.workspace)) {
      console.warn('Mover still in moving state after cleanup - this indicates a bug in exit path');
    }
  }

  /**
   * Exits sticky mode by dropping the block at the current position or specified coordinates.
   * Preserves critical coordinate positioning logic for workspace drops.
   * @param clientX Optional screen X coordinate where to drop the block
   * @param clientY Optional screen Y coordinate where to drop the block
   */
  private exitStickyModeAndDrop(clientX?: number, clientY?: number) {
    if (!this.stickyBlock) return;

    console.log('=== EXITING STICKY MODE AND DROPPING ===');
    console.log('  Client coords provided:', clientX, clientY);
    console.log('  Sticky block:', this.stickyBlock.type, this.stickyBlock.id);

    // Clear any existing connection candidate - Blockly will recalculate based on final position
    // and auto-reconnect if the block is close enough to a valid connection
    const dragStrategy = this.getDragStrategy(this.stickyBlock);
    if (dragStrategy) {
      const hadCandidate = !!dragStrategy.connectionCandidate;
      dragStrategy.connectionCandidate = null;
      if (hadCandidate) {
        console.log('  Cleared connection candidate - Blockly will recalculate based on drop position');
      }
    }

    // Check if mover is still in moving state
    const isMoving = this.mover?.isMoving(this.workspace);
    console.log('  Mover isMoving:', isMoving);

    const moveInfo = this.mover?.moves?.get(this.workspace);
    console.log('  MoveInfo exists:', !!moveInfo);

    if (moveInfo) {
      console.log('  MoveInfo state:');
      console.log('    startLocation:', moveInfo.startLocation);
      console.log('    currentDelta:', moveInfo.totalDelta);
    }

    // If coordinates were provided, update the moveInfo total delta to that position
    if (clientX !== undefined && clientY !== undefined && this.stickyBlock && !this.stickyBlock.isDisposed()) {
      const targetWorkspaceCoords = Blockly.utils.svgMath.screenToWsCoordinates(
        this.workspace,
        new Blockly.utils.Coordinate(clientX, clientY)
      );
      console.log('  Target workspace coords:', targetWorkspaceCoords);

      if (moveInfo) {
        // Calculate block's CURRENT position (start + accumulated delta)
        const currentX = moveInfo.startLocation.x + moveInfo.totalDelta.x;
        const currentY = moveInfo.startLocation.y + moveInfo.totalDelta.y;
        console.log('  Current block position:', { x: currentX, y: currentY });

        // Calculate additional delta needed to reach target from current position
        const additionalDeltaX = targetWorkspaceCoords.x - currentX;
        const additionalDeltaY = targetWorkspaceCoords.y - currentY;
        console.log('  Additional delta needed:', { x: additionalDeltaX, y: additionalDeltaY });

        // Add the additional delta to move from current position to target
        moveInfo.totalDelta.x += additionalDeltaX;
        moveInfo.totalDelta.y += additionalDeltaY;
        console.log('  Updated moveInfo.totalDelta:', moveInfo.totalDelta);

        // CRITICAL: Actually move the block to the new position NOW
        // Don't wait for Blockly's drag end - it might not apply the delta correctly
        this.stickyBlock.moveBy(additionalDeltaX, additionalDeltaY);
        console.log('  Moved block directly by additional delta');
      } else {
        console.log('  ⚠️ Cannot update position - moveInfo is null!');
      }
    }

    // Clear click-and-stick mode so highlights are cleared on endDrag
    this.setClickAndStickMode(false);

    // Finish the move operation - Mover handles positioning, render, and all cleanup
    if (this.mover && this.mover.isMoving(this.workspace)) {
      this.mover.finishMove(this.workspace);
    }

    // Reset sticky UI state
    this.resetStickyState();
  }

  /**
   * Diagnostic method to check why gestures might not be working.
   * Call from browser console: window.kbNav.diagnoseGestureIssue()
   */
  diagnoseGestureIssue() {
    console.log('=== GESTURE DIAGNOSTIC ===');

    const ws = this.workspace as any;

    // Check all workspace flags that might block gestures
    console.log('Workspace gesture state:');
    console.log('  currentGesture_:', ws.currentGesture_);
    console.log('  gestureStack_:', ws.gestureStack_);
    console.log('  isDragging():', ws.isDragging());
    console.log('  isMovable():', ws.isMovable());
    console.log('  eventsEnabled_:', ws.eventsEnabled_);
    console.log('  rendered:', ws.rendered);
    console.log('  isVisible():', ws.isVisible());
    console.log('  options.readOnly:', ws.options.readOnly);
    console.log('  resizesEnabled_:', ws.resizesEnabled_);

    // Check if there's a stuck keyboard move
    if (this.mover) {
      console.log('Keyboard move state:');
      console.log('  isMoving:', this.mover.isMoving(this.workspace));
      console.log('  moves.size:', this.mover.moves?.size);
    }

    // Check sticky mode state
    console.log('Sticky mode state:');
    console.log('  stickyBlock:', this.stickyBlock);

    // Try to detect what's blocking
    console.log('Potential blockers:');
    if (ws.currentGesture_) console.log('  ⚠️ Stuck gesture detected');
    if (ws.isDragging()) console.log('  ⚠️ Workspace thinks it\'s dragging');
    if (ws.eventsEnabled_ === false) console.log('  ⚠️ Events explicitly disabled');
    if (!ws.rendered) console.log('  ⚠️ Workspace not rendered');
    if (ws.options.readOnly) console.log('  ⚠️ Workspace is read-only');
    if (this.mover?.isMoving(this.workspace)) console.log('  ⚠️ Keyboard move still active');
    if (this.stickyBlock) console.log('  ⚠️ Still in sticky mode');

    if (!ws.currentGesture_ && !ws.isDragging() && ws.rendered && !ws.options.readOnly &&
        !this.mover?.isMoving(this.workspace) && !this.stickyBlock) {
      console.log('  ✓ No obvious blockers found - gesture system should be working');
      console.log('  → If gestures still don\'t work, this may be a Blockly core issue');
    }

    console.log('=== END DIAGNOSTIC ===');
  }
}

// Export build info components for use by plugin consumers
export {createBuildInfoComponent, registerBuildInfoStyles, updateBuildInfo, startBuildInfoAutoRefresh} from './build_info_component';
export {BUILD_INFO} from './build_info';
