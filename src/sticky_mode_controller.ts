/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {Mover, MoveType} from './actions/mover';
import {getNonShadowBlock} from './workspace_utilities';
import {MoveGrip} from './move_grip';

/**
 * Trigger modes for entering sticky mode.
 */
export enum TriggerMode {
  /** Double-click to enter sticky mode (default behavior). */
  DOUBLE_CLICK = 'double_click',
  /** Shift + single click to enter sticky mode. */
  SHIFT_CLICK = 'shift_click',
  /** Single click on an already-focused block to enter sticky mode. */
  FOCUSED_CLICK = 'focused_click',
  /** Any single click enters sticky mode when singleClickToMove is enabled. */
  MODE_TOGGLE = 'mode_toggle',
  /** Click on the grip handle to enter sticky mode. */
  GRIP_CLICK = 'grip_click',
}

/**
 * Information about an active sticky mode operation.
 */
export class StickyModeInfo {
  constructor(
    readonly block: Blockly.BlockSvg,
    readonly startClientX: number,
    readonly startClientY: number,
  ) {}
}

/**
 * Controller for click-and-stick functionality.
 * Manages the lifecycle of sticky mode where blocks follow the cursor after double-click.
 * Follows the same architectural pattern as Mover (Map-based tracking, lifecycle methods).
 */
export class StickyModeController {
  /** Map tracking active sticky mode operations per workspace. */
  private stickyModes: Map<Blockly.WorkspaceSvg, StickyModeInfo> = new Map();

  /** Event listeners that need cleanup. */
  private listeners: Array<{
    target: EventTarget;
    type: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  /** The current trigger mode for entering sticky mode. */
  private triggerMode: TriggerMode = TriggerMode.DOUBLE_CLICK;

  /** The block that was focused before pointerdown (for focused-click trigger mode). */
  private focusedBlockBeforePointerdown: Blockly.BlockSvg | null = null;

  /** Flag to ignore the next click event after entering sticky mode via shift+click. */
  private ignoreNextClick: boolean = false;

  /** The current move grip displayed on the focused block, if any. */
  private currentGrip: MoveGrip | null = null;

  /** The block that currently has a grip attached. */
  private gripBlock: Blockly.BlockSvg | null = null;

  /** Whether the block should follow the mouse cursor during sticky move (default: true). */
  private keepBlockOnMouse: boolean = true;

  constructor(
    private workspace: Blockly.WorkspaceSvg,
    private navigationController: NavigationController,
  ) {}

  /**
   * Enable or disable keeping the block on the mouse during sticky move.
   *
   * @param enabled Whether the block should follow the cursor (true) or stay at click position (false).
   */
  setKeepBlockOnMouse(enabled: boolean): void {
    this.keepBlockOnMouse = enabled;
  }

  /**
   * Gets the mover from the navigation controller.
   */
  private get mover(): Mover {
    return (this.navigationController as any).mover;
  }

  /**
   * Gets the drag strategy from a block.
   *
   * @param block
   */
  private getDragStrategy(block: Blockly.BlockSvg) {
    return (block as any).dragStrategy;
  }

  /**
   * Sets click-and-stick mode on a block's drag strategy.
   *
   * @param block
   * @param enabled
   */
  private setClickAndStickMode(block: Blockly.BlockSvg, enabled: boolean) {
    const strategy = this.getDragStrategy(block);
    if (strategy?.setClickAndStickMode) {
      strategy.setClickAndStickMode(enabled);
    }
  }

  /**
   * Check if sticky mode is currently active for this workspace.
   */
  isActive(): boolean {
    return this.stickyModes.has(this.workspace);
  }

  /**
   * Get the block currently in sticky mode, if any.
   */
  getActiveBlock(): Blockly.BlockSvg | null {
    const info = this.stickyModes.get(this.workspace);
    return info ? info.block : null;
  }

  /**
   * Set the trigger mode for entering sticky mode.
   *
   * @param mode The trigger mode to use.
   */
  setTriggerMode(mode: TriggerMode): void {
    this.triggerMode = mode;
  }

  /**
   * Check if the given block can enter sticky mode.
   *
   * @param block
   */
  canEnter(block: Blockly.BlockSvg): boolean {
    return !!(
      block &&
      !block.isDisposed() &&
      block.isMovable() &&
      !this.mover.isMoving(this.workspace)
    );
  }

  /**
   * Sets up event listeners for click and stick functionality.
   */
  install() {
    const workspaceElement = this.workspace.getParentSvg();
    if (!workspaceElement) return;

    this.addListener(workspaceElement, 'dblclick', (event) => {
      this.handleDoubleClick(event as MouseEvent);
    }, false);

    this.addListener(document, 'pointermove', (event) => {
      this.handlePointerMove(event as PointerEvent);
    }, false);

    // Capture pointerdown BEFORE it changes focus (capture phase)
    // Must be on document with capture:true to catch ALL pointerdowns before focus changes
    // Blockly uses pointerdown (not mousedown) for blocks to support touch
    this.addListener(document, 'pointerdown', (event) => {
      this.handlePointerDown(event as PointerEvent);
    }, true);

    this.addListener(document, 'click', (event) => {
      this.handleClick(event as MouseEvent);
    }, true);

    // Listen for focus changes to manage grip display
    this.workspace.addChangeListener(this.handleFocusChange.bind(this));
  }

  /**
   * Removes all event listeners.
   */
  uninstall() {
    for (const {target, type, handler, options} of this.listeners) {
      target.removeEventListener(type, handler, options);
    }
    this.listeners = [];
    this.hideGrip();
  }

  /**
   * Handles focus change events to show/hide grip on focused blocks.
   *
   * @param event
   */
  private handleFocusChange(event: Blockly.Events.Abstract): void {
    // Only show grip in GRIP_CLICK mode
    if (this.triggerMode !== TriggerMode.GRIP_CLICK) {
      return;
    }

    // Don't show grip during sticky mode
    if (this.isActive()) {
      return;
    }

    // Get the currently focused block
    const cursor = this.workspace.getCursor();
    if (!cursor) {
      this.hideGrip();
      return;
    }

    const curNode = cursor.getCurNode();
    if (!curNode) {
      this.hideGrip();
      return;
    }

    // Get the block from the cursor node
    let block: Blockly.BlockSvg | null = null;
    if (curNode instanceof Blockly.BlockSvg) {
      block = curNode;
    } else if ('getSourceBlock' in curNode && typeof (curNode as any).getSourceBlock === 'function') {
      block = (curNode as any).getSourceBlock();
    }

    if (!block) {
      this.hideGrip();
      return;
    }

    // If it's the same block, don't recreate the grip
    if (this.gripBlock === block && this.currentGrip) {
      return;
    }

    // Show grip on the new focused block
    this.showGrip(block);
  }

  /**
   * Shows the grip on the given block.
   *
   * @param block
   */
  private showGrip(block: Blockly.BlockSvg): void {
    // Hide any existing grip first
    this.hideGrip();

    // Create and show new grip
    this.currentGrip = new MoveGrip(block, (clickedBlock, event) => {
      this.handleGripClick(clickedBlock, event);
    });
    this.currentGrip.show();
    this.gripBlock = block;
  }

  /**
   * Hides the current grip if one is showing.
   */
  private hideGrip(): void {
    if (this.currentGrip) {
      this.currentGrip.hide();
      this.currentGrip = null;
    }
    this.gripBlock = null;
  }

  /**
   * Handles click events on the grip.
   *
   * @param block
   * @param event
   */
  private handleGripClick(block: Blockly.BlockSvg, event: MouseEvent): void {
    const nonShadowBlock = getNonShadowBlock(block);
    if (nonShadowBlock && nonShadowBlock.isMovable()) {
      if (this.enter(nonShadowBlock, event.clientX, event.clientY)) {
        // Hide grip when entering sticky mode
        this.hideGrip();
      }
    }
  }

  /**
   * Helper to add and track event listeners.
   *
   * @param target
   * @param type
   * @param handler
   * @param options
   */
  private addListener(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) {
    target.addEventListener(type, handler, options);
    this.listeners.push({target, type, handler, options});
  }

  /**
   * Enters sticky mode where a block follows the cursor.
   *
   * @param block The block to enter sticky mode with.
   * @param clientX Screen X coordinate where the block was grabbed.
   * @param clientY Screen Y coordinate where the block was grabbed.
   * @returns True if sticky mode was successfully entered.
   */
  enter(block: Blockly.BlockSvg, clientX: number, clientY: number): boolean {
    if (this.mover.isMoving(this.workspace)) {
      this.mover.abortMove(this.workspace);
    }

    if (this.isActive()) {
      this.exit('finish');
    }

    if (!block || block.isDisposed()) {
      return false;
    }

    // Close any open fields before entering sticky mode
    Blockly.DropDownDiv.hide();
    Blockly.WidgetDiv.hide();

    try {
      const onMoveFinished = () => {
        this.resetStickyState();
      };

      const success = this.mover.startMove(
        this.workspace,
        block,
        MoveType.Move,
        null,
        onMoveFinished,
      );

      if (success) {
        this.stickyModes.set(
          this.workspace,
          new StickyModeInfo(block, clientX, clientY),
        );
        block.getSvgRoot().classList.add('blockly-sticky-mode');
        this.setClickAndStickMode(block, true);
        return true;
      }
      return false;
    } catch (error) {
      this.stickyModes.delete(this.workspace);
      return false;
    }
  }

  /**
   * Exits sticky mode.
   *
   * @param action Whether to finish (commit) or abort the move.
   */
  exit(action: 'finish' | 'abort') {
    const info = this.stickyModes.get(this.workspace);
    if (!info) return;

    this.setClickAndStickMode(info.block, false);

    if (this.mover.isMoving(this.workspace)) {
      if (action === 'finish') {
        this.mover.finishMove(this.workspace);
      } else {
        this.mover.abortMove(this.workspace);
      }
    }

    this.resetStickyState();
  }

  /**
   * Handles pointerdown to capture which block was focused BEFORE the click changes focus,
   * and to handle shift+click trigger mode.
   *
   * @param event
   */
  private handlePointerDown(event: PointerEvent) {
    // Handle shift+click mode - enter sticky mode immediately on pointerdown
    if (this.triggerMode === TriggerMode.SHIFT_CLICK && event.shiftKey) {
      const clickedBlock = this.getBlockFromEvent(event);
      if (clickedBlock) {
        const target = event.target as Element;
        if (target && this.isDoubleClickOnField(target)) {
          return;
        }

        const block = getNonShadowBlock(clickedBlock);
        if (block && block.isMovable()) {
          // Prevent Blockly's gesture from starting
          event.preventDefault();
          event.stopPropagation();

          // Enter sticky mode immediately
          if (this.enter(block, event.clientX, event.clientY)) {
            // Set flag to ignore the next click event
            this.ignoreNextClick = true;
          }
        }
      }
      return;
    }

    // Track focus state for FOCUSED_CLICK mode
    if (this.triggerMode !== TriggerMode.FOCUSED_CLICK) {
      return;
    }

    // Don't trigger sticky mode if clicking on a field
    const target = event.target as Element;
    if (target && this.isClickOnField(target)) {
      this.focusedBlockBeforePointerdown = null;
      return;
    }

    // Capture the currently focused block before the pointerdown changes focus
    const cursor = this.workspace.getCursor();
    if (!cursor) {
      this.focusedBlockBeforePointerdown = null;
      return;
    }

    const curNode = cursor.getCurNode();
    if (!curNode) {
      this.focusedBlockBeforePointerdown = null;
      return;
    }

    // Get the block that's currently focused
    if (curNode instanceof Blockly.BlockSvg) {
      this.focusedBlockBeforePointerdown = curNode;
    } else if ('getSourceBlock' in curNode && typeof (curNode as any).getSourceBlock === 'function') {
      this.focusedBlockBeforePointerdown = (curNode as any).getSourceBlock();
    } else {
      this.focusedBlockBeforePointerdown = null;
    }
  }

  /**
   * Handles double-click events on blocks to enter sticky mode.
   *
   * @param event
   */
  private handleDoubleClick(event: MouseEvent) {
    // Only handle double-clicks if trigger mode is set to DOUBLE_CLICK
    if (this.triggerMode !== TriggerMode.DOUBLE_CLICK) {
      return;
    }

    if (event.defaultPrevented) return;

    if (this.isActive()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const target = event.target as Element;
    const clickedBlock = this.getBlockFromEvent(event);

    if (clickedBlock) {
      this.workspace.getAudioManager().preload();
    }

    if (target && this.isDoubleClickOnField(target)) {
      return;
    }

    const block = getNonShadowBlock(clickedBlock);
    if (block && block.isMovable()) {
      if (this.enter(block, event.clientX, event.clientY)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  /**
   * Handles click events during sticky mode or to trigger sticky mode.
   *
   * @param event
   */
  private handleClick(event: MouseEvent) {
    // If we just entered sticky mode via shift+click, ignore this click
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // If already in sticky mode, handle the drop/connect action
    if (this.isActive()) {
      this.handleStickyModeClick(event);
      return;
    }

    // Get the clicked block once to avoid inconsistencies
    const clickedBlock = this.getBlockFromEvent(event);

    // Check if this click should trigger sticky mode based on trigger mode
    const shouldTrigger = this.shouldTriggerStickyMode(event, clickedBlock);

    if (shouldTrigger && clickedBlock) {
      const target = event.target as Element;

      this.workspace.getAudioManager().preload();

      if (target && this.isDoubleClickOnField(target)) {
        return;
      }

      const block = getNonShadowBlock(clickedBlock);
      if (block && block.isMovable()) {
        if (this.enter(block, event.clientX, event.clientY)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  }

  /**
   * Check if the current click event should trigger sticky mode.
   *
   * @param event The click event.
   * @param clickedBlock The block that was clicked (or null if no block).
   * @returns True if sticky mode should be triggered.
   */
  private shouldTriggerStickyMode(event: MouseEvent, clickedBlock: Blockly.BlockSvg | null): boolean {
    if (!clickedBlock) return false;

    switch (this.triggerMode) {
      case TriggerMode.SHIFT_CLICK:
        return event.shiftKey;

      case TriggerMode.FOCUSED_CLICK:
        // Check if the clicked block was the one that was focused BEFORE the pointerdown
        // (clicking a block makes it focused, so we need to check the pre-click state)
        // Note: Field detection happens earlier in handlePointerDown to set focusedBlockBeforePointerdown
        return this.focusedBlockBeforePointerdown === clickedBlock;

      case TriggerMode.MODE_TOGGLE:
        // MODE_TOGGLE requires explicit enablement through external state management
        return false;

      case TriggerMode.GRIP_CLICK:
        // GRIP_CLICK is handled by handleGripClick() which is invoked directly
        // when the grip element is clicked (with stopPropagation to prevent this
        // method from being called). Regular clicks outside the grip don't trigger
        // sticky mode in this mode.
        return false;

      case TriggerMode.DOUBLE_CLICK:
      default:
        // Double-click is handled separately
        return false;
    }
  }

  /**
   * Handles pointer movement during sticky mode to make blocks follow the cursor.
   *
   * @param event
   */
  private handlePointerMove(event: PointerEvent) {
    if (!this.isActive()) return;

    // Only update block position if keepBlockOnMouse is enabled
    if (!this.keepBlockOnMouse) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moveInfo = (this.mover as any)?.moves?.get(this.workspace);
    if (!moveInfo) return;

    const targetWorkspaceCoords =
      Blockly.utils.svgMath.screenToWsCoordinates(
        this.workspace,
        new Blockly.utils.Coordinate(event.clientX, event.clientY),
      );

    const deltaX = targetWorkspaceCoords.x - moveInfo.startLocation.x;
    const deltaY = targetWorkspaceCoords.y - moveInfo.startLocation.y;

    moveInfo.totalDelta.x = deltaX;
    moveInfo.totalDelta.y = deltaY;

    if (moveInfo.dragger) {
      moveInfo.dragger.onDrag(
        event as any,
        moveInfo.totalDelta,
      );
    }
  }

  /**
   * Handles clicks during sticky mode for drop/connect/delete actions.
   *
   * @param event
   */
  private handleStickyModeClick(event: MouseEvent | PointerEvent) {
    const info = this.stickyModes.get(this.workspace);
    if (!info) return;

    event.preventDefault();
    event.stopPropagation();

    const clientX = event.clientX;
    const clientY = event.clientY;

    if (this.isClickOnBin(clientX, clientY)) {
      this.deleteBlockOnBin();
      return;
    }

    const connectionInfo = this.findConnectionAtPoint(clientX, clientY);
    if (connectionInfo) {
      this.connectToClickedConnection(connectionInfo, clientX, clientY);
      return;
    }

    // Accept any valid connection preview (whether original location or new)
    const dragStrategy = this.getDragStrategy(info.block);
    if (dragStrategy && dragStrategy.connectionCandidate) {
      this.acceptConnectionCandidate();
      return;
    }

    // No connection preview - exit sticky mode and drop the block where it is
    this.exitStickyModeAndDrop();
  }

  /**
   * Gets a block from an event target.
   *
   * @param event
   * @param event.target
   */
  private getBlockFromEvent(event: {
    target: EventTarget | null;
  }): Blockly.BlockSvg | null {
    const target = event.target as Element;
    if (!target) return null;

    const blocks = this.workspace.getAllBlocks();

    const allBlockElements: Element[] = [];
    let currentElement: Element | null = target;

    while (currentElement) {
      if (currentElement.classList?.contains('blocklyBlock')) {
        allBlockElements.push(currentElement);
      }
      currentElement = currentElement.parentElement;
    }

    if (allBlockElements.length > 0) {
      const innermostBlockElement = allBlockElements[0];
      const block = blocks.find((b) => b.getSvgRoot() === innermostBlockElement);

      if (block && block instanceof Blockly.BlockSvg) {
        return block;
      }
    }

    return null;
  }

  /**
   * Checks if a click is on a field element by inspecting the DOM tree.
   * More reliable than gesture-based detection for events that fire after gesture disposal.
   * Only detects truly interactive/editable fields, not static text labels.
   *
   * @param target The event target element.
   */
  private isClickOnField(target: Element): boolean {
    // Walk up the DOM tree looking for interactive field elements
    let currentElement: Element | null = target;

    while (currentElement) {
      const classList = currentElement.classList;

      if (classList) {
        // Only check for EDITABLE/INTERACTIVE field CSS classes
        // Do NOT include blocklyText or blocklyNonEditableText - those are static labels
        if (classList.contains('blocklyEditableText') ||
            classList.contains('blocklyDropdownText') ||
            classList.contains('blocklyDropDownDiv')) {
          return true;
        }

        // Check for specific interactive field types
        if (classList.contains('blocklyFieldTextInput') ||
            classList.contains('blocklyFieldNumber') ||
            classList.contains('blocklyFieldColour') ||
            classList.contains('blocklyFieldDropdown') ||
            classList.contains('blocklyFieldCheckbox') ||
            classList.contains('blocklyFieldAngle')) {
          return true;
        }
      }

      // Stop at block boundary - don't search beyond the block
      if (classList && classList.contains('blocklyBlock')) {
        break;
      }

      currentElement = currentElement.parentElement;
    }

    return false;
  }

  /**
   * Checks if a double-click event is on a field element.
   * Uses Blockly's gesture system for reliable field detection.
   *
   * @param target
   */
  private isDoubleClickOnField(target: Element): boolean {
    const workspace = this.workspace;
    const currentGesture = (workspace as any).currentGesture_;

    if (currentGesture && (currentGesture as any).startField) {
      return true;
    }

    // Fall back to DOM-based detection
    return this.isClickOnField(target);
  }

  /**
   * Accepts the current connection candidate from the drag strategy.
   */
  private acceptConnectionCandidate() {
    if (!this.isActive()) return;
    this.exit('finish');
  }

  /**
   * Checks if the given screen coordinates are over the trashcan/bin.
   *
   * @param clientX Screen X coordinate.
   * @param clientY Screen Y coordinate.
   * @returns True if the coordinates are over the trashcan.
   */
  private isClickOnBin(clientX: number, clientY: number): boolean {
    const trashcanElement = document.querySelector('.blocklyTrash');
    if (!trashcanElement) {
      return false;
    }

    const rect = trashcanElement.getBoundingClientRect();

    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  /**
   * Deletes the sticky block when dropped on the bin.
   */
  private deleteBlockOnBin() {
    const info = this.stickyModes.get(this.workspace);
    if (!info) return;

    const blockToDelete = info.block;
    this.exit('abort');

    // Unplug with healStack to preserve children
    blockToDelete.unplug(true);
    blockToDelete.dispose();
  }

  /**
   * Finds a connection point at the given screen coordinates.
   *
   * @param clientX
   * @param clientY
   */
  private findConnectionAtPoint(clientX: number, clientY: number): any {
    const info = this.stickyModes.get(this.workspace);
    if (!info) return null;

    const dragStrategy = (info.block as any)?.dragStrategy;
    if (dragStrategy && dragStrategy.connectionHighlighter) {
      const highlightedConnection =
        dragStrategy.connectionHighlighter.findConnectionAtPoint(
          clientX,
          clientY,
        );

      if (highlightedConnection) {
        const stickyConnections = info.block.getConnections_(true);
        if (stickyConnections) {
          for (const stickyConnection of stickyConnections) {
            const connectionChecker = this.workspace.connectionChecker;
            if (
              connectionChecker.canConnect(
                stickyConnection,
                highlightedConnection,
                true,
                Infinity,
              )
            ) {
              return {
                connection: highlightedConnection,
                stickyConnection: stickyConnection,
                distance: 0,
                isHighlighted: true,
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Connects the sticky block to a specific connection point.
   *
   * @param connectionInfo
   * @param clientX
   * @param clientY
   */
  private connectToClickedConnection(
    connectionInfo: any,
    clientX: number,
    clientY: number,
  ) {
    const info = this.stickyModes.get(this.workspace);
    if (!info) return;

    const {connection, stickyConnection} = connectionInfo;

    const dragStrategy = this.getDragStrategy(info.block);
    if (dragStrategy) {
      dragStrategy.connectionCandidate = {
        local: stickyConnection,
        neighbour: connection,
        distance: 0,
      };
    }

    this.exit('finish');
  }

  /**
   * Resets the sticky mode UI state.
   * Called after mover.finishMove() or mover.abortMove().
   */
  private resetStickyState() {
    const info = this.stickyModes.get(this.workspace);
    if (info) {
      info.block.getSvgRoot().classList.remove('blockly-sticky-mode');
    }

    this.stickyModes.delete(this.workspace);
    this.ignoreNextClick = false;

    const selection = Blockly.common.getSelected();
    if (selection) {
      selection.unselect();
    }

    // Clear touch identifier to prevent stuck gestures
    try {
      Blockly.Touch.clearTouchIdentifier();
      setTimeout(() => {
        Blockly.Touch.clearTouchIdentifier();
      }, 0);
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Exits sticky mode by dropping the block at the specified or current position.
   *
   * @param clientX Optional screen X coordinate where to drop the block
   * @param clientY Optional screen Y coordinate where to drop the block
   */
  private exitStickyModeAndDrop(clientX?: number, clientY?: number) {
    const info = this.stickyModes.get(this.workspace);
    if (!info) return;

    // Clear connection candidate - Blockly will recalculate from final position
    const dragStrategy = this.getDragStrategy(info.block);
    if (dragStrategy) {
      dragStrategy.connectionCandidate = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moveInfo = (this.mover as any)?.moves?.get(this.workspace);

    // Update position if coordinates provided
    if (
      clientX !== undefined &&
      clientY !== undefined &&
      info.block &&
      !info.block.isDisposed()
    ) {
      const targetWorkspaceCoords =
        Blockly.utils.svgMath.screenToWsCoordinates(
          this.workspace,
          new Blockly.utils.Coordinate(clientX, clientY),
        );

      if (moveInfo) {
        const currentX = moveInfo.startLocation.x + moveInfo.totalDelta.x;
        const currentY = moveInfo.startLocation.y + moveInfo.totalDelta.y;

        const additionalDeltaX = targetWorkspaceCoords.x - currentX;
        const additionalDeltaY = targetWorkspaceCoords.y - currentY;

        moveInfo.totalDelta.x += additionalDeltaX;
        moveInfo.totalDelta.y += additionalDeltaY;

        // Move block directly to ensure positioning is correct
        info.block.moveBy(additionalDeltaX, additionalDeltaY);
      }
    }

    this.setClickAndStickMode(info.block, false);

    if (this.mover && this.mover.isMoving(this.workspace)) {
      this.mover.finishMove(this.workspace);
    }

    this.resetStickyState();
  }
}
