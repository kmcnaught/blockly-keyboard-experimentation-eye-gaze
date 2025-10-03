/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  IDragger,
  IDragStrategy,
  RenderedConnection,
  IDraggable,
  IFocusableNode,
  IBoundedElement,
  ISelectable,
} from 'blockly';
import {
  Connection,
  dragging,
  getFocusManager,
  registry,
  utils,
  WorkspaceSvg,
  ShortcutRegistry,
  BlockSvg,
  comments,
} from 'blockly';
import * as Constants from '../constants';
import {Direction, getXYFromDirection} from '../drag_direction';
import {KeyboardDragStrategy} from '../keyboard_drag_strategy';
import {Navigation} from '../navigation';
import {clearMoveHints} from '../hints';
import {MoveIndicatorBubble} from '../move_indicator';
import {isWorkspaceElement} from '../dom_utils';

/**
 * The distance to move an item, in workspace coordinates, when
 * making an unconstrained move.
 */
const UNCONSTRAINED_MOVE_DISTANCE = 20;

/**
 * The amount of additional padding to include during a constrained move.
 */
const CONSTRAINED_ADDITIONAL_PADDING = 70;

/**
 * Identifier for a keyboard shortcut that commits the in-progress move.
 */
export const COMMIT_MOVE_SHORTCUT = 'commitMove';

/**
 * Whether this is an insert or a move.
 */
export enum MoveType {
  /**
   * An insert will remove the block if the move is aborted.
   */
  Insert,
  /**
   * A regular move of a pre-existing block.
   */
  Move,
}

/**
 * Low-level code for moving elements with keyboard shortcuts.
 */
export class Mover {
  /**
   * Map of moves in progress.
   *
   * An entry for a given workspace in this map means that the this
   * Mover is moving an element on that workspace, and will disable
   * normal cursor movement until the move is complete.
   */
  protected moves: Map<WorkspaceSvg, MoveInfo> = new Map();

  /**
   * PHASE 6: Store original drag strategies per-block using WeakMap.
   * This prevents strategy corruption when multiple blocks are involved or
   * when operations are interrupted. WeakMap ensures strategies are garbage
   * collected when blocks are disposed.
   */
  private oldDragStrategies: WeakMap<BlockSvg, IDragStrategy> = new WeakMap();

  private moveIndicator?: MoveIndicatorBubble;

  /** Whether connection highlighting is enabled for moves. */
  private highlightConnections: boolean;

  /** Optional callback to check if auto-scrolling should be disabled. */
  private shouldDisableAutoScroll?: () => boolean;

  constructor(
    protected navigation: Navigation,
    highlightConnections = true,
    shouldDisableAutoScroll?: () => boolean,
  ) {
    this.highlightConnections = highlightConnections;
    this.shouldDisableAutoScroll = shouldDisableAutoScroll;
  }

  /**
   * Returns true iff we are able to begin moving the draggable element which
   * currently has focus on the given workspace.
   *
   * @param workspace The workspace to move on.
   * @param draggable The draggable element to try to drag.
   * @returns True iff we can begin a move.
   */
  canMove(workspace: WorkspaceSvg, draggable: IDraggable) {
    return !!(
      this.navigation.getState() === Constants.STATE.WORKSPACE &&
      this.navigation.canCurrentlyEdit(workspace) &&
      !this.moves.has(workspace) && // No move in progress.
      draggable?.isMovable()
    );
  }

  /**
   * Returns true iff we are currently moving an element on the given
   * workspace.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff we are moving.
   */
  isMoving(workspace: WorkspaceSvg) {
    return (
      this.navigation.canCurrentlyEdit(workspace) && this.moves.has(workspace)
    );
  }

  /**
   * Start moving the currently-focused item on workspace, if
   * possible.
   *
   * Should only be called if canMove has returned true.
   *
   * @param workspace The workspace we might be moving on.
   * @param draggable The element to start dragging.
   * @param moveType Whether this is an insert or a move.
   * @param startPoint Where to start the move, or null to use the current
   *     location if any.
   * @param onMoveFinished Optional callback to call when move finishes (for exiting sticky mode).
   * @returns True iff a move has successfully begun.
   */
  startMove(
    workspace: WorkspaceSvg,
    draggable: IDraggable & IFocusableNode & IBoundedElement & ISelectable,
    moveType: MoveType,
    startPoint: RenderedConnection | null,
    onMoveFinished?: () => void,
  ) {
    console.log('Mover.startMove called with:', {
      draggableType: draggable.constructor.name,
      moveType,
      highlightConnections: this.highlightConnections,
    });

    if (draggable instanceof BlockSvg) {
      console.log('Patching drag strategy for BlockSvg');
      this.patchDragStrategy(draggable, moveType, startPoint, onMoveFinished);
    } else if (draggable instanceof comments.RenderedWorkspaceComment) {
      console.log('Setting up move indicator for comment');
      this.moveIndicator = new MoveIndicatorBubble(draggable);
    }
    // Begin dragging element.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(draggable, workspace);
    // Set up a blur listener to end the move if the user clicks away
    // BUT: During click-and-stick mode, only auto-finish if focus moved to something
    // meaningful (toolbox, other UI), not if clicking workspace background to drop
    const blurListener = (evt: Event) => {
      const event = evt as FocusEvent;

      // Check if we're in click-and-stick mode
      const dragStrategy = (draggable as any).dragStrategy;
      const isClickAndStick = dragStrategy?.isClickAndStickMode?.();

      if (!isClickAndStick) {
        console.log('Blur listener finishing move (not in click-and-stick mode)');
        this.finishMove(workspace);
        return;
      }

      // In click-and-stick mode: check where focus is going
      const newFocusTarget = event.relatedTarget as any;
      const activeElement = document.activeElement;

      console.log('Blur during click-and-stick mode:');
      console.log('  relatedTarget:', newFocusTarget);
      console.log('  activeElement:', activeElement?.className);

      const isWorkspaceBackground =
        isWorkspaceElement(newFocusTarget) ||
        isWorkspaceElement(activeElement);

      if (isWorkspaceBackground) {
        console.log('  → Ignoring blur (workspace background - will drop via click handler)');
      } else {
        console.log('  → Auto-finishing (focus moved to meaningful UI element)');
        this.finishMove(workspace);
      }
    };
    // Record that a move is in progress and start dragging.
    workspace.setKeyboardMoveInProgress(true);
    const info = new MoveInfo(workspace, draggable, dragger, blurListener, onMoveFinished);
    this.moves.set(workspace, info);
    // Begin drag.
    dragger.onDragStart(info.fakePointerEvent('pointerdown'));
    info.updateTotalDelta();
    // In case a block is detached, ensure that it still retains focus
    // (otherwise dragging will break). This is also the point a new block's
    // initial insert position is scrolled into view.
    workspace.getCursor().setCurNode(draggable);
    draggable.getFocusableElement().addEventListener('blur', blurListener);

    // Register a keyboard shortcut under the key combos of all existing
    // keyboard shortcuts that commits the move before allowing the real
    // shortcut to proceed. This avoids all kinds of fun brokenness when
    // deleting/copying/otherwise acting on a element in move mode.
    const shortcutKeys = Object.values(ShortcutRegistry.registry.getRegistry())
      .flatMap((shortcut) => shortcut.keyCodes)
      .filter((keyCode) => {
        return (
          keyCode &&
          ![
            utils.KeyCodes.RIGHT,
            utils.KeyCodes.LEFT,
            utils.KeyCodes.UP,
            utils.KeyCodes.DOWN,
            utils.KeyCodes.ENTER,
            utils.KeyCodes.ESC,
            utils.KeyCodes.M,
          ].includes(
            typeof keyCode === 'number'
              ? keyCode
              : parseInt(`${keyCode.split('+').pop()}`),
          )
        );
      })
      // Convince TS there aren't undefined values.
      .filter((keyCode): keyCode is string | number => !!keyCode);

    const commitMoveShortcut = {
      name: COMMIT_MOVE_SHORTCUT,
      preconditionFn: (workspace: WorkspaceSvg) => {
        return !!this.moves.get(workspace);
      },
      callback: (workspace: WorkspaceSvg) => {
        this.finishMove(workspace);
        return false;
      },
      keyCodes: shortcutKeys,
      allowCollision: true,
    };

    ShortcutRegistry.registry.register(commitMoveShortcut);

    return true;
  }

  /**
   * Finish moving the currently-focused item on workspace.
   *
   * Should only be called if isMoving has returned true.
   *
   * @param workspace The workspace on which we are moving.
   * @returns True iff move successfully finished.
   */
  finishMove(workspace: WorkspaceSvg) {
    console.log('=== Mover.finishMove called ===');
    console.log('Call stack:', new Error().stack);
    console.log('Workspace ID:', workspace?.id);
    console.log('Has moves:', this.moves.has(workspace));
    console.log('Moves size:', this.moves.size);

    // Check if there's actually a move in progress
    // This prevents errors if finishMove is called multiple times
    if (!this.moves.has(workspace)) {
      console.log('Mover.finishMove: No move in progress, skipping');
      return false;
    }

    console.log('Calling preDragEndCleanup...');
    const info = this.preDragEndCleanup(workspace);

    console.log('Calling dragger.onDragEnd...');
    // The fakePointerEvent already contains the correct coordinates based on totalDelta
    // The second parameter (0,0) represents that there's no additional delta since the last move
    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    console.log('Calling postDragEndCleanup...');
    this.postDragEndCleanup(workspace, info);
    console.log('finishMove complete, returning true');
    return true;
  }

  /**
   * Abort moving the currently-focused item on workspace.
   *
   * Should only be called if isMoving has returned true.
   *
   * @param workspace The workspace on which we are moving.
   * @returns True iff move successfully aborted.
   */
  abortMove(workspace: WorkspaceSvg) {
    // Check if there's actually a move in progress
    // This prevents errors if abortMove is called multiple times
    if (!this.moves.has(workspace)) {
      console.log('Mover.abortMove: No move in progress, skipping');
      return false;
    }

    const info = this.preDragEndCleanup(workspace);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dragStrategy = (info.draggable as any)
      .dragStrategy as KeyboardDragStrategy;
    this.patchDragger(info.dragger as dragging.Dragger, dragStrategy.moveType);

    // Save the position so we can put the cursor in a reasonable spot.
    // @ts-expect-error Access to private property connectionCandidate.
    const target = dragStrategy.connectionCandidate?.neighbour;

    // Prevent the strategy connecting the block so we just delete one block.
    // @ts-expect-error Access to private property connectionCandidate.
    dragStrategy.connectionCandidate = null;

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      info.startLocation,
    );

    if (dragStrategy.moveType === MoveType.Insert && target) {
      workspace.getCursor().setCurNode(target);
    }

    this.postDragEndCleanup(workspace, info);
    return true;
  }

  /**
   * Common clean-up for finish/abort.
   *
   * @param workspace The workspace on which we are moving.
   * @returns The info for the element.
   */
  private preDragEndCleanup(workspace: WorkspaceSvg) {
    ShortcutRegistry.registry.unregister(COMMIT_MOVE_SHORTCUT);
    clearMoveHints(workspace);

    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Remove the blur listener before ending the drag
    info.draggable
      .getFocusableElement()
      .removeEventListener('blur', info.blurListener);

    return info;
  }

  /**
   * Common clean-up for finish/abort.
   *
   * @param workspace The workspace on which we are moving.
   * @param info The info for the element.
   */
  private postDragEndCleanup(workspace: WorkspaceSvg, info: MoveInfo) {
    console.log('Mover.postDragEndCleanup called');

    this.moveIndicator?.dispose();
    this.moveIndicator = undefined;
    if (info.draggable instanceof BlockSvg) {
      this.unpatchDragStrategy(info.draggable);
    }
    this.moves.delete(workspace);
    workspace.setKeyboardMoveInProgress(false);

    // Call onMoveFinished callback after moves cleanup is complete
    // This ensures the mover is no longer in moving state when the callback runs
    if (info.onMoveFinished) {
      console.log('Calling onMoveFinished callback after cleanup');
      info.onMoveFinished();
    }

    // Use requestAnimationFrame to ensure rendering happens on the next frame
    // This is deterministic and synchronized with the browser's rendering cycle
    requestAnimationFrame(() => {
      console.log('Rendering after move completion');

      if (info.draggable instanceof BlockSvg) {
        // Find the root block of the stack to render from the top
        let rootBlock = info.draggable;
        let parent = info.draggable.getParent();
        while (parent instanceof BlockSvg) {
          rootBlock = parent;
          parent = parent.getParent() as BlockSvg;
        }

        // Render from the root of the entire stack
        console.log(`Rendering from root block: ${rootBlock.type}`);
        rootBlock.render();

        // If the moved block is different from root, ensure it's also rendered
        if (rootBlock !== info.draggable) {
          info.draggable.render();
        }
      }

      // Force full workspace render to catch any other changes
      workspace.render();

      // After rendering, scroll the element into view
      this.scrollCurrentElementIntoView(workspace);

      // Ensure focus is maintained
      getFocusManager().focusNode(info.draggable);
    });
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @param direction The direction to move the dragged item.
   * @returns True iff this action applies and has been performed.
   */
  moveConstrained(workspace: WorkspaceSvg, direction: Direction) {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    if (info.draggable instanceof comments.RenderedWorkspaceComment) {
      return this.moveUnconstrained(workspace, direction);
    }

    info.dragger.onDrag(
      info.fakePointerEvent('pointermove', direction),
      info.totalDelta.clone().scale(workspace.scale),
    );

    info.updateTotalDelta();
    this.scrollCurrentElementIntoView(
      workspace,
      CONSTRAINED_ADDITIONAL_PADDING,
    );
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * without constraint.
   *
   * @param workspace The workspace to move on.
   * @param direction The direction to move the dragged item.
   * @returns True iff this action applies and has been performed.
   */
  moveUnconstrained(workspace: WorkspaceSvg, direction: Direction): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    const {x, y} = getXYFromDirection(direction);
    info.totalDelta.x += x * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y += y * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(
      info.fakePointerEvent('pointermove'),
      info.totalDelta.clone().scale(workspace.scale),
    );
    this.scrollCurrentElementIntoView(workspace);
    this.moveIndicator?.updateLocation();
    return true;
  }

  /**
   * Monkeypatch: replace the block's drag strategy and cache the old value.
   * PHASE 6: Store strategy per-block in WeakMap for robustness.
   *
   * @param block The block to patch.
   * @param moveType Whether this is an insert or a move.
   * @param startPoint Where to start the move, or null to use the current
   *     location if any.
   */
  private patchDragStrategy(
    block: BlockSvg,
    moveType: MoveType,
    startPoint: RenderedConnection | null,
    onMoveFinished?: () => void,
  ) {
    // @ts-expect-error block.dragStrategy is private.
    const currentStrategy = block.dragStrategy;

    // PHASE 6: Store in WeakMap keyed by block (prevents corruption from overlapping operations)
    this.oldDragStrategies.set(block, currentStrategy);

    // Create callback to complete the move when connection is clicked
    const onMoveComplete = () => {
      console.log('onMoveComplete callback invoked');
      const workspace = block.workspace as WorkspaceSvg;
      console.log('Workspace:', workspace?.id);
      console.log('Calling this.finishMove...');
      const result = this.finishMove(workspace);
      console.log('finishMove returned:', result);
    };

    block.setDragStrategy(
      new KeyboardDragStrategy(
        block,
        moveType,
        startPoint,
        this.highlightConnections,
        onMoveComplete,
        onMoveFinished,
      ),
    );
  }

  /**
   * Undo the monkeypatching of the block's drag strategy.
   * PHASE 6: Retrieve strategy from WeakMap and add error handling.
   *
   * @param block The block to unpatch.
   */
  private unpatchDragStrategy(block: BlockSvg) {
    try {
      // @ts-expect-error block.dragStrategy is private
      const currentStrategy = block.dragStrategy;
      if (currentStrategy instanceof KeyboardDragStrategy) {
        // Disable click-and-stick mode so highlights will be cleared
        console.log('Disabling click-and-stick mode');
        currentStrategy.setClickAndStickMode(false);

        // Clear any remaining connection highlights from the keyboard drag strategy
        console.log('Clearing connection highlights from KeyboardDragStrategy');
        currentStrategy.connectionHighlighter.clearHighlights();
      }

      // PHASE 6: Retrieve from WeakMap (per-block storage)
      const oldStrategy = this.oldDragStrategies.get(block);
      if (oldStrategy) {
        block.setDragStrategy(oldStrategy);
        this.oldDragStrategies.delete(block);
        console.log('Restored original drag strategy for block');
      } else {
        console.warn('No original drag strategy found for block - may indicate corrupted state');
      }
    } catch (error) {
      console.error('Error restoring drag strategy:', error);
      // Don't throw - allow cleanup to continue even if strategy restoration fails
    }
  }

  /**
   * Scrolls the current element into view.
   *
   * @param workspace The workspace to get current element from.
   * @param padding Amount of spacing to put between the bounds and the edge of
   *     the workspace's viewport.
   */
  private scrollCurrentElementIntoView(workspace: WorkspaceSvg, padding = 0) {
    // Skip auto-scrolling if the callback indicates it should be disabled
    if (this.shouldDisableAutoScroll?.()) {
      return;
    }

    const draggable = this.moves.get(workspace)?.draggable;
    if (draggable) {
      const bounds = (
        draggable instanceof BlockSvg
          ? draggable.getBoundingRectangleWithoutChildren()
          : draggable.getBoundingRectangle()
      ).clone();
      bounds.top -= padding;
      bounds.bottom += padding;
      bounds.left -= padding;
      bounds.right += padding;
      workspace.scrollBoundsIntoView(bounds);
    }
  }

  /**
   * Monkeypatch: override either wouldDeleteDraggable or shouldReturnToStart,
   * based on whether this was an insertion of a new block or a movement of
   * an existing element.
   *
   * @param dragger The dragger to patch.
   * @param moveType Whether this is an insert or a move.
   */
  private patchDragger(dragger: dragging.Dragger, moveType: MoveType) {
    if (moveType === MoveType.Insert) {
      // Monkey patch dragger to trigger delete.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dragger as any).wouldDeleteDraggable = () => true;
    } else {
      // Monkey patch dragger to trigger call to draggable.revertDrag.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dragger as any).shouldReturnToStart = () => true;
    }
  }
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
export class MoveInfo {
  /** Total distance moved, in workspace units. */
  totalDelta = new utils.Coordinate(0, 0);
  readonly parentNext: Connection | null = null;
  readonly parentInput: Connection | null = null;
  readonly startLocation: utils.Coordinate;
  readonly onMoveFinished?: () => void;

  constructor(
    readonly workspace: WorkspaceSvg,
    readonly draggable: IDraggable & IFocusableNode & IBoundedElement,
    readonly dragger: IDragger,
    readonly blurListener: EventListener,
    onMoveFinished?: () => void,
  ) {
    if (draggable instanceof BlockSvg) {
      this.parentNext = draggable.previousConnection?.targetConnection ?? null;
      this.parentInput = draggable.outputConnection?.targetConnection ?? null;
    }
    this.startLocation = draggable.getRelativeToSurfaceXY();
    this.onMoveFinished = onMoveFinished;
  }

  /**
   * Create a fake pointer event for dragging.
   *
   * @param type Which type of pointer event to create.
   * @param direction The direction if this movement is a constrained drag.
   * @returns A synthetic PointerEvent that can be consumed by Blockly's
   *     dragging code.
   */
  fakePointerEvent(type: string, direction?: Direction): PointerEvent {
    const coordinates = utils.svgMath.wsToScreenCoordinates(
      this.workspace,
      new utils.Coordinate(
        this.startLocation.x + this.totalDelta.x,
        this.startLocation.y + this.totalDelta.y,
      ),
    );
    const tilts = getXYFromDirection(direction);
    return new PointerEvent(type, {
      clientX: coordinates.x,
      clientY: coordinates.y,
      tiltX: tilts.x,
      tiltY: tilts.y,
    });
  }

  /**
   * The keyboard drag may have moved a block to an appropriate location
   * for a preview. Update the saved delta to reflect the element's new
   * location, so that it does not jump during the next unconstrained move.
   */
  updateTotalDelta() {
    if (this.draggable instanceof BlockSvg) {
      this.totalDelta = new utils.Coordinate(
        this.draggable.relativeCoords.x - this.startLocation.x,
        this.draggable.relativeCoords.y - this.startLocation.y,
      );
    } else {
      this.totalDelta = new utils.Coordinate(
        this.draggable.getBoundingRectangle().left - this.startLocation.x,
        this.draggable.getBoundingRectangle().top - this.startLocation.y,
      );
    }
  }
}
