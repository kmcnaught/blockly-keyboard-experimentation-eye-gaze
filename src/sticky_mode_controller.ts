/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {Mover, MoveType} from './actions/mover';
import {getNonShadowBlock} from './workspace_utilities';

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

  constructor(
    private workspace: Blockly.WorkspaceSvg,
    private navigationController: NavigationController,
  ) {}

  /**
   * Gets the mover from the navigation controller.
   */
  private get mover(): Mover {
    return (this.navigationController as any).mover;
  }

  /**
   * Gets the drag strategy from a block.
   */
  private getDragStrategy(block: Blockly.BlockSvg) {
    return (block as any).dragStrategy;
  }

  /**
   * Sets click-and-stick mode on a block's drag strategy.
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
   * Check if the given block can enter sticky mode.
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

    this.addListener(document, 'click', (event) => {
      this.handleClick(event as MouseEvent);
    }, true);
  }

  /**
   * Removes all event listeners.
   */
  uninstall() {
    for (const {target, type, handler, options} of this.listeners) {
      target.removeEventListener(type, handler, options);
    }
    this.listeners = [];
  }

  /**
   * Helper to add and track event listeners.
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
   * Handles double-click events on blocks to enter sticky mode.
   */
  private handleDoubleClick(event: MouseEvent) {
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
   * Handles click events during sticky mode.
   */
  private handleClick(event: MouseEvent) {
    if (!this.isActive()) return;
    this.handleStickyModeClick(event);
  }

  /**
   * Handles pointer movement during sticky mode to make blocks follow the cursor.
   */
  private handlePointerMove(event: PointerEvent) {
    if (!this.isActive()) return;

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

    // Accept preview if it has changed from original (allows immediate drops)
    const dragStrategy = this.getDragStrategy(info.block);
    if (dragStrategy && dragStrategy.connectionCandidate) {
      const initialNeighbour = dragStrategy.getInitialConnectionNeighbour();
      const currentNeighbour = dragStrategy.connectionCandidate.neighbour;

      if (currentNeighbour !== initialNeighbour) {
        this.acceptConnectionCandidate();
        return;
      }
    }

    this.exitStickyModeAndDrop(clientX, clientY);
  }

  /**
   * Gets a block from an event target.
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
   * Checks if a double-click event is on a field element.
   * Uses Blockly's gesture system for reliable field detection.
   */
  private isDoubleClickOnField(target: Element): boolean {
    const workspace = this.workspace;
    const currentGesture = (workspace as any).currentGesture_;

    if (currentGesture && (currentGesture as any).startField) {
      return true;
    }

    return false;
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
