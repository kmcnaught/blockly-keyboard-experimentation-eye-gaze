/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockSvg,
  RenderedConnection,
  WorkspaceSvg,
  utils,
  ConnectionType,
} from 'blockly';

/** Maximum number of connections to highlight for performance. */
const MAX_HIGHLIGHTED_CONNECTIONS = 50;

/** Delay in milliseconds before retrying DOM insertion for highlights. */
const HIGHLIGHT_RETRY_DELAY_MS = 10;

/**
 * Represents a valid connection pair between a moving block and a target.
 */
export interface ValidConnection {
  /** A connection on the dragging block that can connect. */
  local: RenderedConnection;
  /** A connection on the workspace that can accept the local connection. */
  neighbour: RenderedConnection;
  /** The distance between the connections (for sorting/filtering). */
  distance: number;
}

/**
 * Manages visual highlighting of valid connection points during block moves.
 * Provides visual feedback showing all possible destinations for a moving block.
 */
export class ConnectionHighlighter {
  /** Set of DOM elements that have highlighting applied. */
  private highlightedElements: Set<Element> = new Set();

  /** Map from highlight elements to their corresponding connections. */
  private elementToConnection: WeakMap<Element, RenderedConnection> =
    new WeakMap();

  /** Map from highlight elements to their original connection coordinates for updating. */
  private elementToOriginalCoords: WeakMap<
    Element,
    {connection: RenderedConnection; type: string}
  > = new WeakMap();

  /** The workspace this highlighter is operating on. */
  private workspace: WorkspaceSvg;

  /** Callback for handling connection clicks. */
  private onConnectionClick?: (connection: RenderedConnection) => void;

  /** Scroll event listener for updating highlight positions. */
  private scrollListener?: () => void;

  /** Whether to use fatter connection highlights for larger click targets. */
  private useFatterConnections: boolean = true;

  constructor(
    workspace: WorkspaceSvg,
    onConnectionClick?: (connection: RenderedConnection) => void,
  ) {
    this.workspace = workspace;
    this.onConnectionClick = onConnectionClick;

    this.scrollListener = () => {
      this.updateHighlights();
    };
  }

  /**
   * Enable or disable fatter connection highlights.
   *
   * @param enabled Whether to use fatter connections with larger click targets.
   */
  setFatterConnections(enabled: boolean): void {
    this.useFatterConnections = enabled;
  }

  /**
   * Highlights all valid connection points for the given moving block.
   *
   * @param movingBlock The block being moved.
   * @param allConnections All available connections on the workspace.
   * @param localConnections Connections available on the moving block.
   */
  highlightValidConnections(
    movingBlock: BlockSvg,
    allConnections: RenderedConnection[],
    localConnections: RenderedConnection[],
  ): ValidConnection[] {
    this.clearHighlights();

    const validConnections = this.findAllValidConnections(
      movingBlock,
      allConnections,
      localConnections,
    );

    // Apply visual highlighting to each valid connection
    const highlightedBlocks = new Set<string>();
    for (const validConnection of validConnections) {
      this.highlightConnection(validConnection.neighbour);
    }

    // Update highlight positions when workspace scrolls
    if (this.scrollListener) {
      const svgGroup = this.workspace.getSvgGroup();
      if (svgGroup) {
        this.workspace.addChangeListener(this.scrollListener);
      }
    }

    return validConnections;
  }

  /**
   * Finds all valid connections between the moving block and workspace connections.
   *
   * @param movingBlock The block being moved.
   * @param allConnections All available connections on the workspace.
   * @param localConnections Connections available on the moving block.
   * @returns Array of valid connection pairs.
   */
  private findAllValidConnections(
    movingBlock: BlockSvg,
    allConnections: RenderedConnection[],
    localConnections: RenderedConnection[],
  ): ValidConnection[] {
    const validConnections: ValidConnection[] = [];
    const connectionChecker = movingBlock.workspace.connectionChecker;

    for (const localConn of localConnections) {
      for (const potentialNeighbour of allConnections) {
        const filterReason = this.getFilterReason(potentialNeighbour, movingBlock);
        if (filterReason) {
          continue;
        }

        // Check compatibility without requiring disconnect (show all potential targets)
        if (
          connectionChecker.canConnect(
            localConn,
            potentialNeighbour,
            false,
            Infinity,
          )
        ) {
          const distance = this.calculateDistance(
            localConn,
            potentialNeighbour,
          );
          validConnections.push({
            local: localConn,
            neighbour: potentialNeighbour,
            distance: distance,
          });
        }
      }
    }

    // Sort by distance and limit for performance
    validConnections.sort((a, b) => a.distance - b.distance);
    return validConnections.slice(0, MAX_HIGHLIGHTED_CONNECTIONS);
  }

  /**
   * Applies visual highlighting to a single connection.
   *
   * @param connection The connection to highlight.
   */
  private highlightConnection(connection: RenderedConnection) {
    try {
      this.createConnectionVisualization(connection);
    } catch (error) {
      console.debug('Failed to highlight connection (non-critical):', error);
    }
  }

  /**
   * Creates connection-type-appropriate visual highlight.
   *
   * @param connection The connection to create a highlight for.
   */
  private createConnectionVisualization(connection: RenderedConnection) {
    const sourceBlock = connection.getSourceBlock();
    if (!(sourceBlock instanceof BlockSvg)) return;

    const workspace = sourceBlock.workspace;
    const svgGroup = workspace.getSvgGroup();
    if (!svgGroup) return;

    let highlight: SVGElement;

    switch (connection.type) {
      case ConnectionType.PREVIOUS_STATEMENT:
      case ConnectionType.NEXT_STATEMENT:
        highlight = this.createStatementNotch(connection, workspace);
        break;

      case ConnectionType.INPUT_VALUE:
      case ConnectionType.OUTPUT_VALUE:
        highlight = this.createValueOutline(connection, workspace);
        break;

      default:
        return;
    }

    if (highlight) {
      // Store metadata for click handling
      highlight.setAttribute('data-connection-x', connection.x.toString());
      highlight.setAttribute('data-connection-y', connection.y.toString());
      highlight.setAttribute(
        'data-connection-type',
        connection.type.toString(),
      );

      this.elementToConnection.set(highlight, connection);
      this.elementToOriginalCoords.set(highlight, {
        connection: connection,
        type: highlight.tagName.toLowerCase(),
      });

      // Enable connection selection via click
      if (this.onConnectionClick) {
        const clickHandler = (event: Event) => {
          event.stopPropagation();
          this.onConnectionClick!(connection);
        };
        highlight.addEventListener('click', clickHandler);
        highlight.addEventListener('pointerdown', clickHandler);
      }

      const attachedToBlock = highlight.getAttribute('data-attached-to-block') === 'true';

      if (attachedToBlock) {
        this.highlightedElements.add(highlight);
      } else {
        // Add rect-based highlights to workspace SVG with retry for timing issues
        const addHighlightToDOM = () => {
          try {
            const workspaceSvg = this.workspace.getParentSvg();
            if (workspaceSvg && workspaceSvg.parentNode) {
              workspaceSvg.appendChild(highlight);
              this.highlightedElements.add(highlight);
              return true;
            }
          } catch (error) {
            console.debug('Failed to add highlight to DOM:', error);
          }
          return false;
        };

        if (!addHighlightToDOM()) {
          setTimeout(() => {
            addHighlightToDOM();
          }, HIGHLIGHT_RETRY_DELAY_MS);
        }
      }
    }
  }

  /**
   * Creates a notch-style highlight for statement connections.
   * Attached to block's SVG to follow block movement during stack rearrangement.
   *
   * @param connection The statement connection to highlight.
   * @param workspace The workspace for coordinate transformation.
   * @returns The SVG element representing the notch.
   */
  private createStatementNotch(
    connection: RenderedConnection,
    workspace: WorkspaceSvg,
  ): SVGElement {
    const sourceBlock = connection.getSourceBlock();
    if (!(sourceBlock instanceof BlockSvg)) {
      throw new Error('Source block is not a BlockSvg');
    }

    const renderer = sourceBlock.workspace.getRenderer();
    const constants = renderer.getConstants();
    const connectionShape = constants.shapeFor(connection);

    if (!connectionShape || !(connectionShape as any).pathLeft) {
      throw new Error('No connection shape available');
    }

    const xLen = constants.NOTCH_OFFSET_LEFT - constants.CORNER_RADIUS;
    const pathLeft = (connectionShape as any).pathLeft;
    const notchWidth = (connectionShape as any).width;

    let highlightPath: string;

    if (this.useFatterConnections) {
      // Fatter connection: flat-top, notched-bottom shape for larger click target
      const topPadding = 4; // Extra padding above the notch
      const bottomPadding = 4; // Extra padding below the notch

      highlightPath = (
        `M ${-xLen} ${-topPadding} ` +           // Start top-left
        `v ${topPadding + bottomPadding} ` +     // Go down left side
        `h ${xLen} ` +                           // Go right to notch start (x=0)
        pathLeft +                               // Draw notch at bottom
        `h ${xLen} ` +                           // Go right from notch end
        `v ${-(topPadding + bottomPadding)} ` +  // Go up right side
        `h ${-(notchWidth + xLen * 2)} ` +       // Go left across top back to start
        `Z`                                      // Close path
      );
    } else {
      // Standard connection: simple notch outline
      highlightPath = (
        `M ${-xLen} 0 ` +
        `h ${xLen} ` +
        pathLeft +
        `h ${xLen}`
      );
    }

    const highlightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Use block-relative coordinates so highlight moves with block
    const offset = connection.getOffsetInBlock();
    const transformation = `translate(${offset.x}, ${offset.y})` + (sourceBlock.RTL ? ' scale(-1 1)' : '');

    highlightSvg.setAttribute('d', highlightPath);
    highlightSvg.setAttribute('transform', transformation);
    highlightSvg.setAttribute('fill', 'rgba(255, 242, 0, 0.3)');
    highlightSvg.setAttribute('stroke', '#fff200');
    highlightSvg.setAttribute('stroke-width', '2.5');
    highlightSvg.setAttribute('stroke-linejoin', 'round');
    highlightSvg.setAttribute('stroke-linecap', 'round');
    highlightSvg.setAttribute('class', 'blocklyPotentialConnection');
    highlightSvg.style.pointerEvents = 'auto';
    highlightSvg.style.cursor = 'pointer';

    const blockSvg = sourceBlock.getSvgRoot();
    if (blockSvg) {
      blockSvg.appendChild(highlightSvg);
      highlightSvg.setAttribute('data-attached-to-block', 'true');
    }

    return highlightSvg;
  }

  /**
   * Mirrors an SVG path vertically and reverses direction for drawing backwards.
   * Used to create the bottom notch edge from the top notch path.
   *
   * @param path The original SVG path string.
   * @param verticalOffset The vertical distance to mirror across.
   * @returns The mirrored and reversed path string.
   */
  private mirrorPathVertically(path: string, verticalOffset: number): string {
    // Parse SVG path commands
    const commands = path.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
    const mirrored: string[] = [];

    // Process commands in reverse order and flip vertical movements
    for (let i = commands.length - 1; i >= 0; i--) {
      const cmd = commands[i].trim();
      const type = cmd[0];
      const coords = cmd.slice(1).trim();

      switch (type.toLowerCase()) {
        case 'v': // Vertical line
          const vValue = parseFloat(coords);
          mirrored.push(` v ${-vValue} `);
          break;

        case 'h': // Horizontal line (reverse direction)
          const hValue = parseFloat(coords);
          mirrored.push(` h ${-hValue} `);
          break;

        case 'l': // Line to (reverse and flip y)
          const lCoords = coords.split(/[\s,]+/).map(parseFloat);
          if (lCoords.length >= 2) {
            mirrored.push(` l ${-lCoords[0]},${-lCoords[1]} `);
          }
          break;

        case 'c': // Cubic bezier (reverse and flip y coordinates)
          const cCoords = coords.split(/[\s,]+/).map(parseFloat);
          if (cCoords.length >= 6) {
            // For c x1,y1 x2,y2 x,y reversed: c -x2,-y2 -x1,-y1 -x,-y
            mirrored.push(
              ` c ${-cCoords[2]},${-cCoords[3]}  ${-cCoords[0]},${-cCoords[1]}  ${-cCoords[4]},${-cCoords[5]} `
            );
          }
          break;

        case 'a': // Arc (complex - reverse and flip)
          const aCoords = coords.split(/[\s,]+/);
          if (aCoords.length >= 7) {
            const rx = aCoords[0];
            const ry = aCoords[1];
            const rotation = aCoords[2];
            const largeArc = aCoords[3];
            const sweep = aCoords[4] === '1' ? '0' : '1'; // Flip sweep direction
            const x = parseFloat(aCoords[5]);
            const y = parseFloat(aCoords[6]);
            mirrored.push(`a ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${-x} ${-y}`);
          }
          break;

        default:
          // Pass through other commands unchanged
          mirrored.push(cmd);
      }
    }

    return mirrored.join('');
  }

  /**
   * Creates a notch highlight using Blockly's core highlighting (unused in current implementation).
   * Kept for reference - falls back to createStatementNotch for reliability.
   *
   * @param connection The statement connection to highlight.
   * @param sourceBlock The block containing the connection.
   * @returns The SVG element created by core Blockly, or null if unsuccessful.
   */
  private createCoreBasedNotchHighlight(
    connection: RenderedConnection,
    sourceBlock: BlockSvg,
  ): SVGElement | null {
    try {
      const renderer = sourceBlock.workspace.getRenderer();
      const renderInfo = (sourceBlock as any).renderInfo_;

      if (renderInfo) {
        const DrawerClass = (renderer as any).constructor.Drawer ||
                           (renderer as any).drawer?.constructor;

        if (DrawerClass) {
          const drawer = new DrawerClass(sourceBlock, renderInfo);
          const connectionMeasurable = this.findConnectionMeasurable(connection, renderInfo);

          if (connectionMeasurable && drawer.getStatementConnectionHighlightPath) {
            const highlightPath = drawer.getStatementConnectionHighlightPath(connectionMeasurable);

            if (highlightPath) {
              const highlightSvg = sourceBlock.pathObject.addConnectionHighlight?.(
                connection,
                highlightPath,
                connection.getOffsetInBlock(),
                sourceBlock.RTL
              );

              if (highlightSvg) {
                highlightSvg.setAttribute('fill', 'rgba(255, 242, 0, 0.3)');
                highlightSvg.setAttribute('stroke', '#fff200');
                highlightSvg.setAttribute('stroke-width', '3');
                highlightSvg.setAttribute('style', 'pointer-events: auto; cursor: pointer;');

                return highlightSvg;
              }
            }
          }
        }
      }

      const constants = renderer.getConstants();
      const connectionShape = constants.shapeFor(connection);

      if (connectionShape && (connectionShape as any).pathLeft) {
        const xLen = constants.NOTCH_OFFSET_LEFT - constants.CORNER_RADIUS;
        const highlightPath = (
          `M ${-xLen} 0 ` +
          `h ${xLen} ` +
          (connectionShape as any).pathLeft +
          `h ${xLen}`
        );

        const highlightSvg = sourceBlock.pathObject.addConnectionHighlight?.(
          connection,
          highlightPath,
          connection.getOffsetInBlock(),
          sourceBlock.RTL
        );

        if (highlightSvg) {
          // Use !important to prevent core from hiding highlights
          highlightSvg.setAttribute('fill', 'rgba(255, 242, 0, 0.3)');
          highlightSvg.setAttribute('stroke', '#fff200');
          highlightSvg.setAttribute('stroke-width', '3');
          highlightSvg.setAttribute('style', 'display: block !important; pointer-events: auto !important; cursor: pointer !important;');

          if (this.onConnectionClick) {
            const clickHandler = (event: Event) => {
              event.stopPropagation();
              this.onConnectionClick!(connection);
            };
            highlightSvg.addEventListener('click', clickHandler);
            highlightSvg.addEventListener('pointerdown', clickHandler);
          }

          highlightSvg.setAttribute('data-core-managed', 'true');
          this.highlightedElements.add(highlightSvg);
          this.elementToConnection.set(highlightSvg, connection);

          return highlightSvg;
        }
      }

    } catch (error) {
      console.debug('Failed to create core-based notch highlight, using fallback:', error);
    }

    return null;
  }

  /**
   * Creates a value connection highlight using the renderer's puzzle tab shape.
   * Manages SVG independently to avoid core rendering lifecycle interference.
   *
   * @param connection The value connection to highlight.
   * @param sourceBlock The block containing the connection.
   * @returns The SVG element created, or null if unsuccessful.
   */
  private createCoreBasedValueHighlight(
    connection: RenderedConnection,
    sourceBlock: BlockSvg,
  ): SVGElement | null {
    try {
      const renderer = sourceBlock.workspace.getRenderer();
      const constants = renderer.getConstants();

      const connectionShape = constants.shapeFor(connection);
      if (!connectionShape) {
        return null;
      }

      let connPath = '';
      if ((connectionShape as any).isDynamic) {
        let measurableHeight = constants.TAB_HEIGHT;

        const renderInfo = (sourceBlock as any).renderInfo_;
        if (renderInfo) {
          const connectionMeasurable = this.findConnectionMeasurable(connection, renderInfo);
          if (connectionMeasurable && connectionMeasurable.height) {
            measurableHeight = connectionMeasurable.height;
          }
        }

        connPath = (connectionShape as any).pathDown(measurableHeight);
      } else if ((connectionShape as any).pathDown) {
        connPath = (connectionShape as any).pathDown;
      } else {
        return null;
      }

      const yLen = constants.TAB_OFFSET_FROM_TOP;
      const highlightPath = (
        `M 0 ${-yLen} ` +
        `v ${yLen} ` +
        connPath +
        `v ${yLen}`
      );

      const highlightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const offset = connection.getOffsetInBlock();
      const transformation = `translate(${offset.x}, ${offset.y})` + (sourceBlock.RTL ? ' scale(-1 1)' : '');

      highlightSvg.setAttribute('d', highlightPath);
      highlightSvg.setAttribute('transform', transformation);
      highlightSvg.setAttribute('fill', 'rgba(53, 168, 255, 0.4)');
      highlightSvg.setAttribute('stroke', '#35a8ff');
      highlightSvg.setAttribute('stroke-width', '8');
      highlightSvg.setAttribute('class', 'blocklyPotentialConnection');
      highlightSvg.style.pointerEvents = 'auto';
      highlightSvg.style.cursor = 'pointer';

      const blockSvg = sourceBlock.getSvgRoot();
      if (blockSvg) {
        blockSvg.appendChild(highlightSvg);
        highlightSvg.setAttribute('data-attached-to-block', 'true');

        this.highlightedElements.add(highlightSvg);
        this.elementToConnection.set(highlightSvg, connection);
        this.elementToOriginalCoords.set(highlightSvg, {
          connection: connection,
          type: 'path',
        });

        if (this.onConnectionClick) {
          const clickHandler = (event: Event) => {
            event.stopPropagation();
            this.onConnectionClick!(connection);
          };
          highlightSvg.addEventListener('click', clickHandler);
          highlightSvg.addEventListener('pointerdown', clickHandler);
        }

        return highlightSvg;
      }

    } catch (error) {
      console.debug('Failed to create core-based value highlight, using fallback:', error);
    }

    return null;
  }

  /**
   * Finds the connection measurable object from render info that corresponds to the given connection.
   *
   * @param connection The rendered connection to find.
   * @param renderInfo The block's render info.
   * @returns The connection measurable, or null if not found.
   */
  private findConnectionMeasurable(connection: RenderedConnection, renderInfo: any): any {
    if (!renderInfo || !renderInfo.rows) {
      return null;
    }

    // Search through all rows and elements to find the matching connection
    for (const row of renderInfo.rows) {
      if (row.elements) {
        for (const element of row.elements) {
          if (element.connectionModel === connection) {
            return element;
          }
        }
      }
    }

    return null;
  }

  /**
   * Creates an outline highlight for value connections.
   * Uses renderer-based shapes for Geras/Thrasos, falls back to rounded rect for Zelos.
   *
   * @param connection The value connection to highlight.
   * @param workspace The workspace for coordinate transformation.
   * @returns The SVG element representing the value outline.
   */
  private createValueOutline(
    connection: RenderedConnection,
    workspace: WorkspaceSvg,
  ): SVGElement {
    const sourceBlock = connection.getSourceBlock();
    if (sourceBlock instanceof BlockSvg) {
      const renderer = sourceBlock.workspace.getRenderer();
      const rendererName = renderer.constructor.name;
      const isZelos = rendererName.toLowerCase().includes('zelos');

      // Use core shapes for Geras/Thrasos (Zelos requires unavailable renderInfo)
      if (!isZelos) {
        const shapeHighlight = this.createCoreBasedValueHighlight(connection, sourceBlock);
        if (shapeHighlight) {
          shapeHighlight.setAttribute('data-already-in-dom', 'true');
          return shapeHighlight;
        }
      }
    }

    // Fallback rounded rect for Zelos or if core shapes unavailable
    const socketBounds = this.getActualSocketBounds(connection, workspace);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    const coords = this.transformCoordinates(
      socketBounds.x,
      socketBounds.y,
      workspace,
    );

    const scale = workspace.scale;
    const scaledWidth = socketBounds.width * scale;
    const scaledHeight = socketBounds.height * scale;
    const cornerRadius = Math.min(scaledHeight / 2, 25 * scale);

    rect.setAttribute('x', coords.x.toString());
    rect.setAttribute('y', coords.y.toString());
    rect.setAttribute('width', scaledWidth.toString());
    rect.setAttribute('height', scaledHeight.toString());
    rect.setAttribute('rx', cornerRadius.toString());
    rect.setAttribute('ry', cornerRadius.toString());
    rect.setAttribute('fill', 'rgba(53, 168, 255, 0.3)');
    rect.setAttribute('stroke', '#35a8ff');
    rect.setAttribute('stroke-width', '6');
    rect.setAttribute('stroke-dasharray', '3,3');
    rect.setAttribute(
      'style',
      'z-index: 9999; pointer-events: auto; cursor: pointer;',
    );

    return rect;
  }

  /**
   * Gets bounds for socket contents or reasonable defaults.
   *
   * @param connection The value connection to analyze.
   * @param workspace The workspace for coordinate reference.
   * @returns Bounds object with x, y, width, height.
   */
  private getActualSocketBounds(
    connection: RenderedConnection,
    workspace: WorkspaceSvg,
  ): {x: number; y: number; width: number; height: number} {
    try {
      const targetBlock = connection.targetBlock();
      if (targetBlock && targetBlock instanceof BlockSvg) {
        const blockBounds = targetBlock.getBoundingRectangle();
        return {
          x: blockBounds.left,
          y: blockBounds.top,
          width: blockBounds.right - blockBounds.left,
          height: blockBounds.bottom - blockBounds.top,
        };
      }

      const shadowBlock = connection.getShadowDom();
      if (shadowBlock && connection.targetConnection) {
        const shadowTargetBlock = connection.targetConnection.getSourceBlock();
        if (shadowTargetBlock && shadowTargetBlock instanceof BlockSvg) {
          const shadowBounds = shadowTargetBlock.getBoundingRectangle();
          return {
            x: shadowBounds.left,
            y: shadowBounds.top,
            width: shadowBounds.right - shadowBounds.left,
            height: shadowBounds.bottom - shadowBounds.top,
          };
        }
      }

      const sourceBlock = connection.getSourceBlock();
      if (sourceBlock && sourceBlock instanceof BlockSvg) {
        const input = this.findInputForConnection(sourceBlock, connection);
        if (input) {
          const estimatedBounds = this.estimateInputBounds(input, connection);
          if (estimatedBounds) {
            return estimatedBounds;
          }
        }
      }

      return {
        x: connection.x,
        y: connection.y - 15,
        width: 80,
        height: 30,
      };
    } catch (error) {
      console.debug('Failed to get socket bounds, using defaults:', error);
      return {
        x: connection.x,
        y: connection.y - 15,
        width: 80,
        height: 30,
      };
    }
  }

  /**
   * Finds the input that contains the given connection.
   *
   * @param block The block to search.
   * @param connection The connection to find.
   * @returns The input containing the connection, or null.
   */
  private findInputForConnection(
    block: BlockSvg,
    connection: RenderedConnection,
  ): any {
    const inputs = block.inputList;
    for (const input of inputs) {
      if (input.connection === connection) {
        return input;
      }
    }
    return null;
  }

  /**
   * Estimates bounds for an input based on field content.
   *
   * @param input The input to estimate bounds for.
   * @param connection The connection for positioning reference.
   * @returns Estimated bounds or null if cannot determine.
   */
  private estimateInputBounds(
    input: any,
    connection: RenderedConnection,
  ): {x: number; y: number; width: number; height: number} | null {
    try {
      if (input.fieldRow && input.fieldRow.length > 0) {
        let totalWidth = 0;
        const maxHeight = 30;

        for (const field of input.fieldRow) {
          if (field.getText) {
            const text = field.getText();
            const fieldWidth = Math.max(text.length * 8 + 20, 40);
            totalWidth += fieldWidth;
          } else {
            totalWidth += 40;
          }
        }

        return {
          x: connection.x,
          y: connection.y - maxHeight / 2,
          width: totalWidth,
          height: maxHeight,
        };
      }

      return null;
    } catch (error) {
      console.debug('Failed to estimate input bounds:', error);
      return null;
    }
  }

  /**
   * Transforms workspace coordinates to SVG coordinates.
   *
   * @param x Workspace x coordinate.
   * @param y Workspace y coordinate.
   * @param workspace The workspace for transformation parameters.
   * @returns Transformed coordinates.
   */
  private transformCoordinates(
    x: number,
    y: number,
    workspace: WorkspaceSvg,
  ): {x: number; y: number} {
    const scale = workspace.scale;
    const translation = workspace.getOriginOffsetInPixels();

    return {
      x: x * scale + translation.x,
      y: y * scale + translation.y,
    };
  }

  /**
   * Returns why a connection should be filtered, or null if valid.
   *
   * @param connection The connection to check.
   * @param movingBlock The block being moved.
   * @returns The filter reason string, or null if not filtered.
   */
  private getFilterReason(
    connection: RenderedConnection,
    movingBlock: BlockSvg,
  ): string | null {
    const sourceBlock = connection.getSourceBlock();
    if (!sourceBlock) return 'no-source-block';

    if (sourceBlock.isInsertionMarker()) return 'insertion-marker';

    if (sourceBlock === movingBlock) return 'moving-block';

    const movingDescendants = movingBlock.getDescendants(false);
    if (movingDescendants.includes(sourceBlock as BlockSvg)) {
      return 'moving-block-descendant';
    }

    return null;
  }

  /**
   * Checks if connection should be filtered (on moving block or preview).
   *
   * @param connection The connection to check.
   * @param movingBlock The block being moved.
   * @returns True if the connection should be filtered out.
   */
  private isConnectionOnMovingBlock(
    connection: RenderedConnection,
    movingBlock: BlockSvg,
  ): boolean {
    return this.getFilterReason(connection, movingBlock) !== null;
  }

  /**
   * Calculates the distance between two connections.
   *
   * @param conn1 First connection.
   * @param conn2 Second connection.
   * @returns The distance between the connections.
   */
  private calculateDistance(
    conn1: RenderedConnection,
    conn2: RenderedConnection,
  ): number {
    const dx = conn1.x - conn2.x;
    const dy = conn1.y - conn2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }


  /**
   * Removes all connection highlighting.
   */
  clearHighlights(): void {
    if (this.scrollListener) {
      this.workspace.removeChangeListener(this.scrollListener);
    }

    for (const element of this.highlightedElements) {
      try {
        if (element instanceof SVGElement) {
          element.remove();
        } else if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (error) {
        // Silently fail - element may have already been removed
      }
    }

    this.highlightedElements.clear();
  }

  /**
   * Updates highlight positions based on workspace scroll and zoom.
   */
  updateHighlights(): void {
    for (const element of this.highlightedElements) {
      const coordsInfo = this.elementToOriginalCoords.get(element);
      if (!coordsInfo) continue;

      const {connection, type} = coordsInfo;

      try {
        switch (type) {
          case 'circle':
            this.updateCirclePosition(element as SVGCircleElement, connection);
            break;
          case 'path':
            this.updatePathPosition(element as SVGPathElement, connection);
            break;
          case 'rect':
            this.updateRectPosition(element as SVGRectElement, connection);
            break;
        }
      } catch (error) {
        console.debug('Failed to update highlight position:', error);
      }
    }
  }

  /**
   * Updates the position of a circle highlight element.
   *
   * @param circle The circle element to update.
   * @param connection The connection this circle represents.
   */
  private updateCirclePosition(
    circle: SVGCircleElement,
    connection: RenderedConnection,
  ): void {
    const coords = this.transformCoordinates(
      connection.x,
      connection.y,
      this.workspace,
    );
    circle.setAttribute('cx', coords.x.toString());
    circle.setAttribute('cy', coords.y.toString());
  }

  /**
   * Updates the position of a path highlight element.
   * Paths are attached to block SVG and move automatically, only transform needs updating.
   *
   * @param path The path element to update.
   * @param connection The connection this path represents.
   */
  private updatePathPosition(
    path: SVGPathElement,
    connection: RenderedConnection,
  ): void {
    const sourceBlock = connection.getSourceBlock();
    if (!(sourceBlock instanceof BlockSvg)) return;

    const offset = connection.getOffsetInBlock();
    const transformation = `translate(${offset.x}, ${offset.y})` + (sourceBlock.RTL ? ' scale(-1 1)' : '');
    path.setAttribute('transform', transformation);
  }

  /**
   * Updates the position of a rect highlight (value connections).
   *
   * @param rect The rect element to update.
   * @param connection The connection this rect represents.
   */
  private updateRectPosition(
    rect: SVGRectElement,
    connection: RenderedConnection,
  ): void {
    const socketBounds = this.getActualSocketBounds(connection, this.workspace);
    const coords = this.transformCoordinates(
      socketBounds.x,
      socketBounds.y,
      this.workspace,
    );

    const scale = this.workspace.scale;
    const scaledWidth = socketBounds.width * scale;
    const scaledHeight = socketBounds.height * scale;

    rect.setAttribute('x', coords.x.toString());
    rect.setAttribute('y', coords.y.toString());
    rect.setAttribute('width', scaledWidth.toString());
    rect.setAttribute('height', scaledHeight.toString());
  }

  /**
   * Checks if a point (in screen coordinates) intersects with any highlighted connection.
   *
   * @param screenX Screen X coordinate.
   * @param screenY Screen Y coordinate.
   * @returns The connection at the point, or null if no connection found.
   */
  findConnectionAtPoint(screenX: number, screenY: number): RenderedConnection | null {
    for (const element of this.highlightedElements) {
      const bounds = element.getBoundingClientRect();
      if (screenX >= bounds.left && screenX <= bounds.right &&
          screenY >= bounds.top && screenY <= bounds.bottom) {
        const connection = this.elementToConnection.get(element);
        if (connection) {
          return connection;
        }
      }
    }
    return null;
  }

  /**
   * Gets bounding boxes for all currently highlighted connections.
   *
   * @returns Array of connection bounds information.
   */
  getHighlightedConnectionBounds(): Array<{
    connection: RenderedConnection;
    bounds: DOMRect;
    element: Element;
  }> {
    const results: Array<{connection: RenderedConnection; bounds: DOMRect; element: Element}> = [];

    for (const element of this.highlightedElements) {
      const connection = this.elementToConnection.get(element);
      if (connection) {
        const bounds = element.getBoundingClientRect();
        results.push({
          connection,
          bounds,
          element
        });
      }
    }

    return results;
  }

  /**
   * Disposes of the highlighter and cleans up all resources.
   */
  dispose(): void {
    this.clearHighlights();
  }
}