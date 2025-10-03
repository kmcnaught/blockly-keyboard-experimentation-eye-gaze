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

    // Set position of the dragging block, so that it doesn't pop
    // to the top left of the workspace.
    // @ts-expect-error block and startLoc are private.
    this.block.moveDuringDrag(this.startLoc);
    // @ts-expect-error connectionCandidate is private.
    this.connectionCandidate = this.createInitialCandidate();
    // Store the initial connection neighbour for later comparison
    // @ts-expect-error connectionCandidate is private.
    this.initialConnectionNeighbour = this.connectionCandidate?.neighbour ?? null;
    this.forceShowPreview();
    this.block.addIcon(new MoveIcon(this.block));

    // Note: Connection highlighting is deferred to setClickAndStickMode()
    // This ensures highlights only appear in sticky mode, not normal move mode
  }

  override drag(newLoc: utils.Coordinate, e?: PointerEvent): void {
    if (!e) return;

    // Track the previous candidate before super.drag() changes it
    // @ts-expect-error connectionCandidate is private.
    const prevCandidate = this.connectionCandidate;

    this.currentDragDirection = getDirectionFromXY({x: e.tiltX, y: e.tiltY});
    super.drag(newLoc);  // This calls updateConnectionPreview() which changes connectionCandidate

    // Check if the preview changed and refresh highlights if needed
    // @ts-expect-error connectionCandidate is private.
    const newCandidate = this.connectionCandidate;

    if (this.shouldRefreshHighlights(prevCandidate, newCandidate)) {
      // Preview changed (created, destroyed, or different connection)!
      // Refresh connection highlights since the stack may have been rebuilt
      this.refreshHighlightsForPreview(newCandidate);
    }

    // Handle the case when an unconstrained drag found a connection candidate.
    // @ts-expect-error connectionCandidate is private.
    if (this.connectionCandidate) {
      // @ts-expect-error connectionCandidate is private.
      const neighbour = (this.connectionCandidate as ConnectionCandidate)
        .neighbour;
      // The next constrained move will resume the search from the current
      // candidate location.
      this.searchNode = neighbour;
      if (this.isConstrainedMovement()) {
        // Position the moving block down and slightly to the right of the
        // target connection.
        this.block.moveDuringDrag(
          new utils.Coordinate(neighbour.x + 10, neighbour.y + 10),
        );
      }
    } else {
      // Handle the case when unconstrained drag was far from any candidate.
      this.searchNode = null;

      if (this.isConstrainedMovement()) {
        // @ts-expect-error private field
        const workspace = this.workspace;
        showUnconstrainedMoveHint(workspace, true);
      }
    }
  }

  override endDrag(e?: PointerEvent) {
    console.log('KeyboardDragStrategy endDrag called, isClickAndStick:', this.isClickAndStick);
    super.endDrag(e);
    this.allConnections = [];
    this.block.removeIcon(MoveIcon.type);

    // Always clear highlights when drag truly ends (when NOT in click and stick mode)
    // If we're in click and stick mode, highlights stay until explicitly cleared
    if (this.highlightingEnabled && !this.isClickAndStick) {
      console.log('Clearing connection highlights (drag ended)');
      this.connectionHighlighter.clearHighlights();
    } else if (this.isClickAndStick) {
      console.log('Preserving connection highlights during click and stick');
    }
  }

  /**
   * Force clear all highlights regardless of click-and-stick mode.
   * This is used during cleanup to ensure highlights are removed.
   */
  forceClearHighlights(): void {
    console.log('Force clearing connection highlights');
    if (this.highlightingEnabled) {
      this.connectionHighlighter.clearHighlights();
    }
  }

  /**
   * Set whether this drag strategy is being used for click and stick operations.
   * When true, highlights will be preserved across temporary drag end/start cycles.
   */
  setClickAndStickMode(enabled: boolean): void {
    this.isClickAndStick = enabled;
    console.log('Click and stick mode set to:', enabled);

    if (enabled && this.highlightingEnabled) {
      // Entering sticky mode - show connection highlights
      console.log('Entering sticky mode - showing connection highlights');
      // @ts-expect-error getLocalConnections is private.
      const localConnections = this.getLocalConnections(this.block);
      console.log('Local connections on moving block:', localConnections.length);
      console.log('All connections found:', this.allConnections.length);

      const validConnections =
        this.connectionHighlighter.highlightValidConnections(
          this.block,
          this.allConnections,
          localConnections,
        );
      console.log('Valid connections to highlight:', validConnections.length);
    } else if (!enabled && this.highlightingEnabled) {
      // Exiting sticky mode - clear connection highlights
      console.log('Exiting sticky mode - clearing connection highlights');
      this.connectionHighlighter.clearHighlights();
    }
  }

  /**
   * Check if this drag strategy is currently in click and stick mode.
   */
  isClickAndStickMode(): boolean {
    return this.isClickAndStick;
  }

  /**
   * Returns the next compatible connection in keyboard navigation order,
   * based on the input direction.
   * Always resumes the search at the last valid connection that was tried.
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
    // Fall back on a coordinate-based search if there was no good starting
    // point for the search.
    if (!candidateConnection && !this.searchNode) {
      candidateConnection = this.findNearestCandidate(localConns);
    }
    return candidateConnection;
  }

  /**
   * Get the nearest valid candidate connection, regardless of direction.
   * TODO(github.com/google/blockly/issues/8869): Replace with an
   * override of `getSearchRadius` when implemented in core.
   *
   * @param localConns The list of connections on the dragging block(s) that are
   *     available to connect to.
   * @returns A candidate connection and radius, or null if none was found.
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
   * @param localConns The list of connections on the dragging block(s) that are
   *     available to connect to.
   * @returns A candidate connection and radius, or null if none was found.
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
      return false; // New connection is always better during a constrained drag.
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
   * Get whether the most recent drag event represents a constrained
   * keyboard drag.
   *
   * @returns true if the current movement is constrained, otherwise false.
   */
  private isConstrainedMovement(): boolean {
    return !!this.currentDragDirection;
  }

  /**
   * Force the preview (replacement or insertion marker) to be shown
   * immediately. Keyboard drags should always show a preview, even when
   * the drag has just started; this forces it.
   */
  private forceShowPreview() {
    // @ts-expect-error connectionPreviewer is private
    const previewer = this.connectionPreviewer;
    // @ts-expect-error connectionCandidate is private
    const candidate = this.connectionCandidate as ConnectionCandidate;
    if (!candidate || !previewer) return;
    const block = this.block;

    // This is essentially a copy of the second half of updateConnectionPreview
    // in BlockDragStrategy. It adds a `moveDuringDrag` call at the end.
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
    // The moving block will be positioned slightly down and to the
    // right of the connection it found.
    block.moveDuringDrag(
      new utils.Coordinate(neighbour.x + 10, neighbour.y + 10),
    );
  }

  /**
   * Create a candidate representing where the block was previously connected.
   * Used to render the block position after picking up the block but before
   * moving during a drag.
   *
   * @returns A connection candidate representing where the block was at the
   *     start of the drag.
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
   * Checks if we should refresh connection highlights.
   * Only refreshes if the connection has actually changed AND enough time has passed.
   *
   * @param prev The previous connection candidate.
   * @param curr The current connection candidate.
   * @returns True if we should refresh highlights.
   */
  private shouldRefreshHighlights(
    prev: ConnectionCandidate | null,
    curr: ConnectionCandidate | null,
  ): boolean {
    // Check if the connection has actually changed
    const hasChanged = this.hasConnectionChanged(prev, curr);
    if (!hasChanged) return false;

    // Throttle: only refresh if enough time has passed since last refresh
    const now = Date.now();
    if (now - this.lastRefreshTime < this.REFRESH_THROTTLE) {
      return false;
    }

    return true;
  }

  /**
   * Checks if the connection candidate has meaningfully changed.
   *
   * @param prev The previous connection candidate.
   * @param curr The current connection candidate.
   * @returns True if the connection changed.
   */
  private hasConnectionChanged(
    prev: ConnectionCandidate | null,
    curr: ConnectionCandidate | null,
  ): boolean {
    // Both null - no change
    if (!prev && !curr) return false;

    // One is null - changed
    if (!prev || !curr) return true;

    // Different connections - changed
    return prev.neighbour !== curr.neighbour || prev.local !== curr.local;
  }

  /**
   * Refreshes connection highlights after a preview change.
   * This ensures highlights reflect current connection positions after
   * the stack has been rebuilt by the insertion marker.
   *
   * @param currentCandidate The current connection candidate to track.
   */
  private refreshHighlightsForPreview(
    currentCandidate: ConnectionCandidate | null,
  ): void {
    // Only refresh highlights if we're in sticky mode
    if (!this.highlightingEnabled || !this.isClickAndStick) return;

    console.log('Preview changed, refreshing connection highlights');

    // Update tracking
    this.lastRefreshedCandidate = currentCandidate;
    this.lastRefreshTime = Date.now();

    // Rebuild the connections list to reflect current workspace state
    // (highlightValidConnections will clear old highlights automatically)
    // The original this.allConnections is stale - it was captured at drag start
    // and doesn't reflect split stacks or insertion markers
    const currentConnections: RenderedConnection[] = [];
    const topBlocks = this.block.workspace.getTopBlocks(true);
    console.log(`Rebuilding connections from ${topBlocks.length} top blocks`);

    for (const topBlock of topBlocks) {
      const descendants = topBlock.getDescendants(true);
      const nonShadowDescendants = descendants.filter((block: BlockSvg) => !block.isShadow());
      console.log(`  Top block ${topBlock.type}: ${descendants.length} descendants, ${nonShadowDescendants.length} non-shadow`);

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

    console.log(`Total connections rebuilt: ${currentConnections.length}`);

    // Recreate highlights with current connection positions
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
   *
   * @param targetConnection The connection that was clicked.
   */
  private handleConnectionClick(targetConnection: RenderedConnection) {
    console.log(
      'handleConnectionClick called with:',
      targetConnection.type,
      targetConnection.x,
      targetConnection.y,
    );

    // Find the local connection that can connect to this target
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
      console.log(
        'Found compatible local connection, moving block to clicked position',
      );

      // Create a connection candidate and set it
      const candidate = {
        local: localConnection,
        neighbour: targetConnection,
        distance: 0,
      };

      // @ts-expect-error connectionCandidate is private
      this.connectionCandidate = candidate;

      // Position the block at the connection point
      const targetX = targetConnection.x;
      const targetY = targetConnection.y;

      // Move block to the connection location with slight offset for visibility
      this.block.moveDuringDrag(
        new utils.Coordinate(targetX + 10, targetY + 10),
      );

      // Force the preview to update
      this.forceShowPreview();

      console.log('Block moved to clicked connection position');

      // Clear click and stick mode BEFORE completing the move
      // This ensures endDrag will clear highlights properly
      this.setClickAndStickMode(false);
      console.log('Cleared click and stick mode before completing move');

      // Complete the move immediately - the rendering updates in mover.ts
      // will ensure everything displays correctly
      if (this.onMoveComplete) {
        console.log('Calling move completion callback');
        this.onMoveComplete();
        console.log('Move completion callback finished');
      } else {
        console.warn('No move completion callback available');
      }

      // Exit sticky mode after move is complete
      if (this.onMoveFinished) {
        console.log('Calling move finished callback to exit sticky mode');
        this.onMoveFinished();
        console.log('Move finished callback completed');
      }
    } else {
      console.warn('No compatible local connection found for clicked target');
    }
  }

  /**
   * Gets the initial connection neighbour where the block started.
   * Used to compare whether the preview has changed from the original position.
   */
  getInitialConnectionNeighbour(): RenderedConnection | null {
    return this.initialConnectionNeighbour;
  }
}
