/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockSvg,
  ConnectionType,
  RenderedConnection,
  dragging,
  utils,
} from 'blockly';
import {Direction, getDirectionFromXY} from './drag_direction';
import {showUnconstrainedMoveHint} from './hints';
import {MoveIcon} from './move_icon';
import {MoveType} from './actions/mover';
import {ConnectionHighlighter} from './connection_highlighter';

/** X offset for positioning block preview near connections. */
const BLOCK_PREVIEW_OFFSET_X = 10;

/** Y offset for positioning block preview near connections. */
const BLOCK_PREVIEW_OFFSET_Y = 10;

// Copied in from core because it is not exported.
interface ConnectionCandidate {
  /** A connection on the dragging stack that is compatible with neighbour. */
  local: RenderedConnection;

  /** A nearby connection that is compatible with local. */
  neighbour: RenderedConnection;

  /** The distance between the local connection and the neighbour connection. */
  distance: number;
}

// @ts-expect-error overrides a private function.
export class KeyboardDragStrategy extends dragging.BlockDragStrategy {
  /** Which direction the current constrained drag is in, if any. */
  private currentDragDirection: Direction | null = null;

  /** Where a constrained movement should start when traversing the tree. */
  private searchNode: RenderedConnection | null = null;

  /** List of all connections available on the workspace. */
  private allConnections: RenderedConnection[] = [];

  /** Connection highlighter for visual feedback. */
  public connectionHighlighter: ConnectionHighlighter;

  /** Whether connection highlighting is enabled. */
  private highlightingEnabled: boolean;

  /** Callback to complete the move from outside this strategy. */
  private onMoveComplete?: () => void;

  /** Callback to exit sticky mode after move is finished. */
  private onMoveFinished?: () => void;

  /** Whether this drag is part of a click and stick operation. */
  private isClickAndStick = false;

  /** The last connection candidate we refreshed highlights for. */
  private lastRefreshedCandidate: ConnectionCandidate | null = null;

  /** Timestamp of last highlight refresh to throttle updates. */
  private lastRefreshTime = 0;

  /** Minimum time between highlight refreshes in ms. */
  private readonly REFRESH_THROTTLE = 100;

  /** The initial connection where the block started (for comparison with current preview). */
  private initialConnectionNeighbour: RenderedConnection | null = null;

  constructor(
    private block: BlockSvg,
    public moveType: MoveType,
    private startPoint: RenderedConnection | null,
    highlightingEnabled = true,
    onMoveComplete?: () => void,
    onMoveFinished?: () => void,
  ) {
    super(block);
    this.highlightingEnabled = highlightingEnabled;
    this.onMoveComplete = onMoveComplete;
    this.onMoveFinished = onMoveFinished;

    // Create connection highlighter with click handler
    const onConnectionClick = (connection: RenderedConnection) => {
      this.handleConnectionClick(connection);
    };
    this.connectionHighlighter = new ConnectionHighlighter(
      block.workspace,
      onConnectionClick,
    );
  }

  override startDrag(e?: PointerEvent) {
    super.startDrag(e);

    for (const topBlock of this.block.workspace.getTopBlocks(true)) {
      this.allConnections.push(
        ...topBlock
          .getDescendants(true)
          .filter((block: BlockSvg) => !block.isShadow())
          .flatMap((block: BlockSvg) => block.getConnections_(false))
          .sort((a: RenderedConnection, b: RenderedConnection) => {
            let delta = a.y - b.y;
            if (delta === 0) {
              delta = a.x - b.x;
            }
            return delta;
          }),
      );
    }

    // @ts-expect-error block and startLoc are private.
    this.block.moveDuringDrag(this.startLoc);
    // @ts-expect-error connectionCandidate is private.
    this.connectionCandidate = this.createInitialCandidate();
    // @ts-expect-error connectionCandidate is private.
    this.initialConnectionNeighbour = this.connectionCandidate?.neighbour ?? null;
    this.forceShowPreview();
    this.block.addIcon(new MoveIcon(this.block));

    // Connection highlighting deferred to setClickAndStickMode() for sticky mode only
  }

  override drag(newLoc: utils.Coordinate, e?: PointerEvent): void {
    if (!e) return;

    // @ts-expect-error connectionCandidate is private.
    const prevCandidate = this.connectionCandidate;

    this.currentDragDirection = getDirectionFromXY({x: e.tiltX, y: e.tiltY});
    super.drag(newLoc);

    // @ts-expect-error connectionCandidate is private.
    const newCandidate = this.connectionCandidate;

    if (this.shouldRefreshHighlights(prevCandidate, newCandidate)) {
      this.refreshHighlightsForPreview(newCandidate);
    }

    // @ts-expect-error connectionCandidate is private.
    if (this.connectionCandidate) {
      // @ts-expect-error connectionCandidate is private.
      const neighbour = (this.connectionCandidate as ConnectionCandidate)
        .neighbour;
      this.searchNode = neighbour;
      if (this.isConstrainedMovement()) {
        this.block.moveDuringDrag(
          new utils.Coordinate(neighbour.x + BLOCK_PREVIEW_OFFSET_X, neighbour.y + BLOCK_PREVIEW_OFFSET_Y),
        );
      }
    } else {
      this.searchNode = null;

      if (this.isConstrainedMovement()) {
        // @ts-expect-error private field
        const workspace = this.workspace;
        showUnconstrainedMoveHint(workspace, true);
      }
    }
  }

  override endDrag(e?: PointerEvent) {
    super.endDrag(e);
    this.allConnections = [];
    this.block.removeIcon(MoveIcon.type);

    // Clear highlights when drag ends (unless in click-and-stick mode)
    if (this.highlightingEnabled && !this.isClickAndStick) {
      this.connectionHighlighter.clearHighlights();
    }
  }

  /**
   * Force clear all highlights regardless of click-and-stick mode.
   */
  forceClearHighlights(): void {
    if (this.highlightingEnabled) {
      this.connectionHighlighter.clearHighlights();
    }
  }

  /**
   * Set whether this drag strategy is being used for click and stick operations.
   */
  setClickAndStickMode(enabled: boolean): void {
    this.isClickAndStick = enabled;

    if (enabled && this.highlightingEnabled) {
      // @ts-expect-error getLocalConnections is private.
      const localConnections = this.getLocalConnections(this.block);

      this.connectionHighlighter.highlightValidConnections(
        this.block,
        this.allConnections,
        localConnections,
      );
    } else if (!enabled && this.highlightingEnabled) {
      this.connectionHighlighter.clearHighlights();
    }
  }

  /**
   * Check if currently in click and stick mode.
   */
  isClickAndStickMode(): boolean {
    return this.isClickAndStick;
  }

  /**
   * Returns the next compatible connection in keyboard navigation order.
   *
   * @param draggingBlock The block where the drag started.
   * @returns A valid connection candidate, or null if none was found.
   */
  private getConstrainedConnectionCandidate(
    draggingBlock: BlockSvg,
  ): ConnectionCandidate | null {
    // @ts-expect-error getLocalConnections is private.
    const localConns = this.getLocalConnections(draggingBlock);
    if (localConns.length == 0) {
      return null;
    }

    let candidateConnection = this.findTraversalCandidate(
      draggingBlock,
      localConns,
    );
    if (!candidateConnection && !this.searchNode) {
      candidateConnection = this.findNearestCandidate(localConns);
    }
    return candidateConnection;
  }

  /**
   * Get the nearest valid candidate connection, regardless of direction.
   *
   * @param localConns The list of connections on the dragging block(s).
   * @returns A candidate connection, or null if none was found.
   */
  findNearestCandidate(
    localConns: RenderedConnection[],
  ): ConnectionCandidate | null {
    let radius = Infinity;
    let candidate = null;
    const dxy = new utils.Coordinate(0, 0);

    for (const conn of localConns) {
      const {connection: neighbour, radius: rad} = conn.closest(radius, dxy);
      if (neighbour) {
        candidate = {
          local: conn,
          neighbour: neighbour,
          distance: rad,
        };
        radius = rad;
      }
    }
    return candidate;
  }

  /**
   * Get the nearest valid candidate connection in traversal order.
   *
   * @param draggingBlock The root block being dragged.
   * @param localConns The list of connections on the dragging block(s).
   * @returns A candidate connection, or null if none was found.
   */
  findTraversalCandidate(
    draggingBlock: BlockSvg,
    localConns: RenderedConnection[],
  ): ConnectionCandidate | null {
    const connectionChecker = draggingBlock.workspace.connectionChecker;
    let candidateConnection: ConnectionCandidate | null = null;
    let potential: RenderedConnection | null = this.searchNode;

    const dir = this.currentDragDirection;
    while (potential && !candidateConnection) {
      const potentialIndex = this.allConnections.indexOf(potential);
      if (dir === Direction.Up || dir === Direction.Left) {
        potential =
          this.allConnections[potentialIndex - 1] ??
          this.allConnections[this.allConnections.length - 1];
      } else if (dir === Direction.Down || dir === Direction.Right) {
        potential =
          this.allConnections[potentialIndex + 1] ?? this.allConnections[0];
      }

      localConns.forEach((conn: RenderedConnection) => {
        if (
          potential &&
          connectionChecker.canConnect(conn, potential, true, Infinity)
        ) {
          candidateConnection = {
            local: conn,
            neighbour: potential,
            distance: 0,
          };
        }
      });
      if (potential == this.searchNode) break;
    }
    return candidateConnection;
  }

  override currCandidateIsBetter(
    currCandidate: ConnectionCandidate,
    delta: utils.Coordinate,
    newCandidate: ConnectionCandidate,
  ): boolean {
    if (this.isConstrainedMovement()) {
      return false;
    }
    // @ts-expect-error currCandidateIsBetter is private.
    return super.currCandidateIsBetter(currCandidate, delta, newCandidate);
  }

  override getConnectionCandidate(
    draggingBlock: BlockSvg,
    delta: utils.Coordinate,
  ): ConnectionCandidate | null {
    if (this.isConstrainedMovement()) {
      return this.getConstrainedConnectionCandidate(draggingBlock);
    }
    // @ts-expect-error getConnctionCandidate is private.
    return super.getConnectionCandidate(draggingBlock, delta);
  }

  /**
   * Check if the current movement is constrained to connection targets.
   */
  private isConstrainedMovement(): boolean {
    return !!this.currentDragDirection;
  }

  /**
   * Force the preview to be shown immediately for keyboard drags.
   */
  private forceShowPreview() {
    // @ts-expect-error connectionPreviewer is private
    const previewer = this.connectionPreviewer;
    // @ts-expect-error connectionCandidate is private
    const candidate = this.connectionCandidate as ConnectionCandidate;
    if (!candidate || !previewer) return;
    const block = this.block;

    const {local, neighbour} = candidate;
    const localIsOutputOrPrevious =
      local.type === ConnectionType.OUTPUT_VALUE ||
      local.type === ConnectionType.PREVIOUS_STATEMENT;

    const target = neighbour.targetBlock();
    const neighbourIsConnectedToRealBlock =
      target && !target.isInsertionMarker();

    const orphanCanConnectAtEnd =
      target &&
      // @ts-expect-error orphanCanConnectAtEnd is private
      this.orphanCanConnectAtEnd(block, target, local.type);
    if (
      localIsOutputOrPrevious &&
      neighbourIsConnectedToRealBlock &&
      !orphanCanConnectAtEnd
    ) {
      previewer.previewReplacement(local, neighbour, target);
    } else {
      previewer.previewConnection(local, neighbour);
    }
    block.moveDuringDrag(
      new utils.Coordinate(neighbour.x + BLOCK_PREVIEW_OFFSET_X, neighbour.y + BLOCK_PREVIEW_OFFSET_Y),
    );
  }

  /**
   * Create a candidate representing where the block was previously connected.
   */
  private createInitialCandidate(): ConnectionCandidate | null {
    // @ts-expect-error startParentConn is private.
    const neighbour = this.startPoint ?? this.startParentConn;
    if (neighbour) {
      this.searchNode = neighbour;
      switch (neighbour.type) {
        case ConnectionType.INPUT_VALUE: {
          if (this.block.outputConnection) {
            return {
              neighbour: neighbour,
              local: this.block.outputConnection,
              distance: 0,
            };
          }
          break;
        }
        case ConnectionType.NEXT_STATEMENT: {
          if (this.block.previousConnection) {
            return {
              neighbour: neighbour,
              local: this.block.previousConnection,
              distance: 0,
            };
          }
          break;
        }
      }
    }
    return null;
  }

  override shouldHealStack(e: PointerEvent | undefined): boolean {
    return Boolean(this.block.previousConnection);
  }

  /**
   * Checks if we should refresh connection highlights (throttled).
   */
  private shouldRefreshHighlights(
    prev: ConnectionCandidate | null,
    curr: ConnectionCandidate | null,
  ): boolean {
    const hasChanged = this.hasConnectionChanged(prev, curr);
    if (!hasChanged) return false;

    const now = Date.now();
    if (now - this.lastRefreshTime < this.REFRESH_THROTTLE) {
      return false;
    }

    return true;
  }

  /**
   * Checks if the connection candidate has changed.
   */
  private hasConnectionChanged(
    prev: ConnectionCandidate | null,
    curr: ConnectionCandidate | null,
  ): boolean {
    if (!prev && !curr) return false;
    if (!prev || !curr) return true;
    return prev.neighbour !== curr.neighbour || prev.local !== curr.local;
  }

  /**
   * Refreshes connection highlights after a preview change.
   * Ensures highlights reflect current positions after stack rearrangement.
   */
  private refreshHighlightsForPreview(
    currentCandidate: ConnectionCandidate | null,
  ): void {
    if (!this.highlightingEnabled || !this.isClickAndStick) return;

    this.lastRefreshedCandidate = currentCandidate;
    this.lastRefreshTime = Date.now();

    // Rebuild connections list to reflect current workspace state
    const currentConnections: RenderedConnection[] = [];
    const topBlocks = this.block.workspace.getTopBlocks(true);

    for (const topBlock of topBlocks) {
      const descendants = topBlock.getDescendants(true);
      const nonShadowDescendants = descendants.filter((block: BlockSvg) => !block.isShadow());

      currentConnections.push(
        ...nonShadowDescendants
          .flatMap((block: BlockSvg) => block.getConnections_(false))
          .sort((a: RenderedConnection, b: RenderedConnection) => {
            let delta = a.y - b.y;
            if (delta === 0) {
              delta = a.x - b.x;
            }
            return delta;
          }),
      );
    }

    // @ts-expect-error getLocalConnections is private.
    const localConnections = this.getLocalConnections(this.block);

    this.connectionHighlighter.highlightValidConnections(
      this.block,
      currentConnections,
      localConnections,
    );
  }

  /**
   * Handles when a user clicks on a connection highlight to complete a move.
   */
  private handleConnectionClick(targetConnection: RenderedConnection) {
    // @ts-expect-error getLocalConnections is private.
    const localConnections = this.getLocalConnections(this.block);
    const connectionChecker = this.block.workspace.connectionChecker;

    let localConnection: RenderedConnection | null = null;
    for (const local of localConnections) {
      if (
        connectionChecker.canConnect(local, targetConnection, true, Infinity)
      ) {
        localConnection = local;
        break;
      }
    }

    if (localConnection) {
      const candidate = {
        local: localConnection,
        neighbour: targetConnection,
        distance: 0,
      };

      // @ts-expect-error connectionCandidate is private
      this.connectionCandidate = candidate;

      const targetX = targetConnection.x;
      const targetY = targetConnection.y;

      this.block.moveDuringDrag(
        new utils.Coordinate(targetX + BLOCK_PREVIEW_OFFSET_X, targetY + BLOCK_PREVIEW_OFFSET_Y),
      );

      this.forceShowPreview();
      this.setClickAndStickMode(false);

      if (this.onMoveComplete) {
        this.onMoveComplete();
      }

      if (this.onMoveFinished) {
        this.onMoveFinished();
      }
    }
  }

  /**
   * Gets the initial connection where the block started.
   */
  getInitialConnectionNeighbour(): RenderedConnection | null {
    return this.initialConnectionNeighbour;
  }
}
