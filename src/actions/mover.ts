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
  /** Map of moves in progress per workspace. */
  protected moves: Map<WorkspaceSvg, MoveInfo> = new Map();

  /** Original drag strategies per-block (WeakMap for automatic garbage collection). */
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
   * Check if we can begin moving the draggable element on the workspace.
   */
  canMove(workspace: WorkspaceSvg, draggable: IDraggable) {
    return !!(
      this.navigation.getState() === Constants.STATE.WORKSPACE &&
      this.navigation.canCurrentlyEdit(workspace) &&
      !this.moves.has(workspace) &&
      draggable?.isMovable()
    );
  }

  /**
   * Check if we are currently moving an element on the workspace.
   */
  isMoving(workspace: WorkspaceSvg) {
    return (
      this.navigation.canCurrentlyEdit(workspace) && this.moves.has(workspace)
    );
  }

  /**
   * Start moving the currently-focused item on workspace.
   *
   * @param workspace The workspace to move on.
   * @param draggable The element to start dragging.
   * @param moveType Whether this is an insert or a move.
   * @param startPoint Where to start the move, or null for current location.
   * @param onMoveFinished Optional callback when move finishes.
   * @returns True if a move has successfully begun.
   */
  startMove(
    workspace: WorkspaceSvg,
    draggable: IDraggable & IFocusableNode & IBoundedElement & ISelectable,
    moveType: MoveType,
    startPoint: RenderedConnection | null,
    onMoveFinished?: () => void,
  ) {
    if (draggable instanceof BlockSvg) {
      this.patchDragStrategy(draggable, moveType, startPoint, onMoveFinished);
    } else if (draggable instanceof comments.RenderedWorkspaceComment) {
      this.moveIndicator = new MoveIndicatorBubble(draggable);
    }
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(draggable, workspace);

    // Blur listener to auto-finish move when focus leaves
    const blurListener = (evt: Event) => {
      const event = evt as FocusEvent;

      const dragStrategy = (draggable as any).dragStrategy;
      const isClickAndStick = dragStrategy?.isClickAndStickMode?.();

      if (!isClickAndStick) {
        this.finishMove(workspace);
        return;
      }

      // In click-and-stick mode: only auto-finish if focus moved to meaningful UI
      const newFocusTarget = event.relatedTarget as any;
      const activeElement = document.activeElement;

      const isWorkspaceBackground =
        isWorkspaceElement(newFocusTarget) ||
        isWorkspaceElement(activeElement);

      if (!isWorkspaceBackground) {
        this.finishMove(workspace);
      }
    };

    workspace.setKeyboardMoveInProgress(true);
    const info = new MoveInfo(workspace, draggable, dragger, blurListener, onMoveFinished);
    this.moves.set(workspace, info);

    dragger.onDragStart(info.fakePointerEvent('pointerdown'));
    info.updateTotalDelta();

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
   * @returns True if move successfully finished.
   */
  finishMove(workspace: WorkspaceSvg) {
    if (!this.moves.has(workspace)) {
      return false;
    }

    const info = this.preDragEndCleanup(workspace);

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.postDragEndCleanup(workspace, info);
    return true;
  }

  /**
   * Abort moving the currently-focused item on workspace.
   *
   * @returns True if move successfully aborted.
   */
  abortMove(workspace: WorkspaceSvg) {
    if (!this.moves.has(workspace)) {
      return false;
    }

    const info = this.preDragEndCleanup(workspace);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dragStrategy = (info.draggable as any)
      .dragStrategy as KeyboardDragStrategy;
    this.patchDragger(info.dragger as dragging.Dragger, dragStrategy.moveType);

    // @ts-expect-error Access to private property connectionCandidate.
    const target = dragStrategy.connectionCandidate?.neighbour;

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
   * Common cleanup before ending drag.
   */
  private preDragEndCleanup(workspace: WorkspaceSvg) {
    ShortcutRegistry.registry.unregister(COMMIT_MOVE_SHORTCUT);
    clearMoveHints(workspace);

    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.draggable
      .getFocusableElement()
      .removeEventListener('blur', info.blurListener);

    return info;
  }

  /**
   * Common cleanup after ending drag.
   */
  private postDragEndCleanup(workspace: WorkspaceSvg, info: MoveInfo) {
    this.moveIndicator?.dispose();
    this.moveIndicator = undefined;
    if (info.draggable instanceof BlockSvg) {
      this.unpatchDragStrategy(info.draggable);
    }
    this.moves.delete(workspace);
    workspace.setKeyboardMoveInProgress(false);

    if (info.onMoveFinished) {
      info.onMoveFinished();
    }

    // Render on next frame for proper block positioning
    requestAnimationFrame(() => {
      if (info.draggable instanceof BlockSvg) {
        let rootBlock = info.draggable;
        let parent = info.draggable.getParent();
        while (parent instanceof BlockSvg) {
          rootBlock = parent;
          parent = parent.getParent() as BlockSvg;
        }

        rootBlock.render();

        if (rootBlock !== info.draggable) {
          info.draggable.render();
        }
      }

      workspace.render();
      this.scrollCurrentElementIntoView(workspace);
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
   * Replace the block's drag strategy with KeyboardDragStrategy.
   */
  private patchDragStrategy(
    block: BlockSvg,
    moveType: MoveType,
    startPoint: RenderedConnection | null,
    onMoveFinished?: () => void,
  ) {
    // @ts-expect-error block.dragStrategy is private.
    const currentStrategy = block.dragStrategy;

    this.oldDragStrategies.set(block, currentStrategy);

    const onMoveComplete = () => {
      const workspace = block.workspace as WorkspaceSvg;
      this.finishMove(workspace);
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
   * Restore the block's original drag strategy.
   */
  private unpatchDragStrategy(block: BlockSvg) {
    try {
      // @ts-expect-error block.dragStrategy is private
      const currentStrategy = block.dragStrategy;
      if (currentStrategy instanceof KeyboardDragStrategy) {
        currentStrategy.setClickAndStickMode(false);
        currentStrategy.connectionHighlighter.clearHighlights();
      }

      const oldStrategy = this.oldDragStrategies.get(block);
      if (oldStrategy) {
        block.setDragStrategy(oldStrategy);
        this.oldDragStrategies.delete(block);
      }
    } catch (error) {
      // Silently fail during cleanup
    }
  }

  /**
   * Scrolls the current element into view.
   */
  private scrollCurrentElementIntoView(workspace: WorkspaceSvg, padding = 0) {
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
   * Patch dragger to trigger delete (insert) or revert (move).
   */
  private patchDragger(dragger: dragging.Dragger, moveType: MoveType) {
    if (moveType === MoveType.Insert) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dragger as any).wouldDeleteDraggable = () => true;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dragger as any).shouldReturnToStart = () => true;
    }
  }
}

/**
 * Information about a move in progress.
 */
export class MoveInfo {
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
   * Create a synthetic pointer event for dragging.
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
   * Update the saved delta to reflect current position.
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
