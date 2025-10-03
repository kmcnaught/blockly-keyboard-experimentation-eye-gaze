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

  /** Feature flag: use core-based rendering for value connection highlights. Set to false to revert to custom rounded rect. */
  private useCoreValueHighlights: boolean = true;


  constructor(
    workspace: WorkspaceSvg,
    onConnectionClick?: (connection: RenderedConnection) => void,
  ) {
    this.workspace = workspace;
    this.onConnectionClick = onConnectionClick;

    // Set up scroll listener to update highlight positions
    this.scrollListener = () => {
      this.updateHighlights();
    };

    // Set up global cleanup function as emergency backup
    if (!(window as any).clearAllConnectionHighlights) {
      (window as any).clearAllConnectionHighlights = () => {
        const allCircles = document.querySelectorAll(
          '.blocklyPotentialConnection',
        );
        allCircles.forEach((circle) => circle.remove());
      };
    }
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
    // Always clear existing highlights first to prevent accumulation
    console.log(`Clearing ${this.highlightedElements.size} existing highlights before creating new ones`);
    this.clearHighlights();

    const validConnections = this.findAllValidConnections(
      movingBlock,
      allConnections,
      localConnections,
    );

    console.log(`Highlighting ${validConnections.length} valid connections:`);

    // Apply visual highlighting to each valid connection
    const highlightedBlocks = new Set<string>();
    for (const validConnection of validConnections) {
      const block = validConnection.neighbour.getSourceBlock();
      if (block) {
        highlightedBlocks.add(`${block.type}(${validConnection.neighbour.type})`);
      }
      this.highlightConnection(validConnection.neighbour);
    }

    console.log('  Blocks being highlighted:', Array.from(highlightedBlocks).join(', '));
    console.log(`  Total highlight elements in tracker: ${this.highlightedElements.size}`);

    // Check if elements are actually in the DOM (capture size now, not later)
    const sizeWhenCreated = this.highlightedElements.size;
    const elementsCreated = Array.from(this.highlightedElements);
    setTimeout(() => {
      let inDom = 0;
      for (const elem of elementsCreated) {
        if (elem.isConnected) inDom++;
      }
      console.log(`  After 10ms: ${inDom}/${sizeWhenCreated} highlights still in DOM (tracker now has ${this.highlightedElements.size})`);
    }, 10);

    // Set up scroll listener to update highlights when workspace scrolls
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

    let filteredCount = 0;
    const filteredReasons = new Map<string, number>();

    for (const localConn of localConnections) {
      for (const potentialNeighbour of allConnections) {
        // Skip connections on the moving block itself
        const filterReason = this.getFilterReason(potentialNeighbour, movingBlock);
        if (filterReason) {
          filteredCount++;
          filteredReasons.set(filterReason, (filteredReasons.get(filterReason) || 0) + 1);
          continue;
        }

        // Check if the connections are compatible
        // Don't check if already connected - we want to show all potential targets
        // even if they're currently occupied (e.g., by insertion markers or real blocks)
        if (
          connectionChecker.canConnect(
            localConn,
            potentialNeighbour,
            false, // Don't check if already connected
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

    console.log(`Filtered ${filteredCount} connections (moving block/markers), found ${validConnections.length} valid`);
    console.log('Filter reasons:', Array.from(filteredReasons.entries()).map(([k, v]) => `${k}: ${v}`).join(', '));

    // Sort by distance and limit to reasonable number for performance
    validConnections.sort((a, b) => a.distance - b.distance);
    return validConnections.slice(0, 50); // Limit to top 50 connections
  }

  /**
   * Applies visual highlighting to a single connection by creating
   * a connection-type-appropriate highlight visualization.
   *
   * @param connection The connection to highlight.
   */
  private highlightConnection(connection: RenderedConnection) {
    try {
      // Create a visual highlight based on the connection type
      this.createConnectionVisualization(connection);
    } catch (error) {
      const block = connection.getSourceBlock();
      console.warn(`Failed to highlight connection on ${block?.type}:`, error);
    }
  }

  /**
   * Creates a connection-type-appropriate visual highlight.
   *
   * @param connection The connection to create a highlight for.
   */
  private createConnectionVisualization(connection: RenderedConnection) {
    const sourceBlock = connection.getSourceBlock();
    if (!(sourceBlock instanceof BlockSvg)) return;

    // Get the workspace SVG group to add the highlight to
    const workspace = sourceBlock.workspace;
    const svgGroup = workspace.getSvgGroup();
    if (!svgGroup) return;

    // Create different visualizations based on connection type
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
        // Unknown connection type - skip highlighting
        return;
    }

    if (highlight) {
      // Don't apply CSS class - it has !important rules that override our inline styles
      // We use inline styles for full control over colors

      // Store connection info for click handling
      highlight.setAttribute('data-connection-x', connection.x.toString());
      highlight.setAttribute('data-connection-y', connection.y.toString());
      highlight.setAttribute(
        'data-connection-type',
        connection.type.toString(),
      );

      // Store connection reference for click handling
      this.elementToConnection.set(highlight, connection);

      // Store connection and type for position updates
      this.elementToOriginalCoords.set(highlight, {
        connection: connection,
        type: highlight.tagName.toLowerCase(),
      });

      // Add click event listener if callback is provided
      if (this.onConnectionClick) {
        const clickHandler = (event: Event) => {
          event.stopPropagation();
          this.onConnectionClick!(connection);
        };
        highlight.addEventListener('click', clickHandler);
        highlight.addEventListener('pointerdown', clickHandler);
      }

      // Check if the highlight was already attached to its block's SVG
      const attachedToBlock = highlight.getAttribute('data-attached-to-block') === 'true';

      if (attachedToBlock) {
        // Already attached by createStatementNotch or createCoreBasedValueHighlight
        this.highlightedElements.add(highlight);
      } else {
        // Not attached yet (e.g., rect-based value highlights) - add to workspace SVG
        const addHighlightToDOM = () => {
          try {
            const workspaceSvg = this.workspace.getParentSvg();
            if (workspaceSvg && workspaceSvg.parentNode) {
              workspaceSvg.appendChild(highlight);
              this.highlightedElements.add(highlight);
              return true;
            }
          } catch (error) {
            // Silently fail - highlight won't be visible but won't break functionality
          }
          return false;
        };

        // Try immediate addition first
        if (!addHighlightToDOM()) {
          // If immediate addition fails, retry after DOM settles
          setTimeout(() => {
            addHighlightToDOM();
          }, 10);
        }
      }
    }
  }

  /**
   * Creates a notch-style highlight for statement connections as an independent SVG element.
   * This avoids using core's pathObject system which gets destroyed during block re-rendering.
   * The highlight is attached to the block's SVG so it moves with the block automatically.
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

    // Get the connection shape from the renderer
    const renderer = sourceBlock.workspace.getRenderer();
    const constants = renderer.getConstants();
    const connectionShape = constants.shapeFor(connection);

    if (!connectionShape || !(connectionShape as any).pathLeft) {
      throw new Error('No connection shape available');
    }

    // Create a highlight path using the connection shape
    const xLen = constants.NOTCH_OFFSET_LEFT - constants.CORNER_RADIUS;
    const highlightPath = (
      `M ${-xLen} 0 ` +
      `h ${xLen} ` +
      (connectionShape as any).pathLeft +
      `h ${xLen}`
    );

    // Create our own independent SVG path element
    const highlightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Position relative to block (not absolute workspace coordinates)
    // This way it moves with the block when the stack shifts
    const offset = connection.getOffsetInBlock();
    const transformation = `translate(${offset.x}, ${offset.y})` + (sourceBlock.RTL ? ' scale(-1 1)' : '');

    highlightSvg.setAttribute('d', highlightPath);
    highlightSvg.setAttribute('transform', transformation);
    highlightSvg.setAttribute('fill', 'rgba(255, 242, 0, 0.15)');
    highlightSvg.setAttribute('stroke', '#fff200');
    highlightSvg.setAttribute('stroke-width', '3');
    highlightSvg.setAttribute('class', 'blocklyPotentialConnection');
    highlightSvg.style.pointerEvents = 'auto';
    highlightSvg.style.cursor = 'pointer';

    // Attach to block's SVG so it moves with the block
    const blockSvg = sourceBlock.getSvgRoot();
    if (blockSvg) {
      blockSvg.appendChild(highlightSvg);
      // Mark that we already added it to DOM
      highlightSvg.setAttribute('data-attached-to-block', 'true');
    }

    return highlightSvg;
  }

  /**
   * Creates a notch highlight using Blockly's core highlighting infrastructure.
   * This uses the same system that highlights connections during drag operations.
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

      // Try approach 1: Use drawer with renderInfo (if available)
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
                // Use yellow to match active focus color, with subtle fill
                highlightSvg.setAttribute('fill', 'rgba(255, 242, 0, 0.15)');
                highlightSvg.setAttribute('stroke', '#fff200');
                highlightSvg.setAttribute('stroke-width', '3');
                highlightSvg.setAttribute('style', 'pointer-events: auto; cursor: pointer;');

                return highlightSvg;
              }
            }
          }
        }
      }

      // Approach 2: Use connection shape directly from renderer
      // This works even when renderInfo is not available
      const constants = renderer.getConstants();
      const connectionShape = constants.shapeFor(connection);

      if (connectionShape && (connectionShape as any).pathLeft) {
        // Create a highlight path using the connection shape
        const xLen = constants.NOTCH_OFFSET_LEFT - constants.CORNER_RADIUS;
        const highlightPath = (
          `M ${-xLen} 0 ` +
          `h ${xLen} ` +
          (connectionShape as any).pathLeft +
          `h ${xLen}`
        );

        // Use core's addConnectionHighlight method
        const highlightSvg = sourceBlock.pathObject.addConnectionHighlight?.(
          connection,
          highlightPath,
          connection.getOffsetInBlock(),
          sourceBlock.RTL
        );

        if (highlightSvg) {
          // Style it for visibility
          // IMPORTANT: Use !important to prevent core Blockly's updateConnectionHighlights from hiding it
          // Use yellow to match active focus color, with subtle fill
          highlightSvg.setAttribute('fill', 'rgba(255, 242, 0, 0.15)');
          highlightSvg.setAttribute('stroke', '#fff200');
          highlightSvg.setAttribute('stroke-width', '3');
          highlightSvg.setAttribute('style', 'display: block !important; pointer-events: auto !important; cursor: pointer !important;');

          // Add click event listener if callback is provided
          if (this.onConnectionClick) {
            const clickHandler = (event: Event) => {
              event.stopPropagation();
              this.onConnectionClick!(connection);
            };
            highlightSvg.addEventListener('click', clickHandler);
            highlightSvg.addEventListener('pointerdown', clickHandler);
          }

          // Mark this as a core-managed highlight so createConnectionVisualization
          // doesn't try to append it (it's already in the DOM via pathObject)
          highlightSvg.setAttribute('data-core-managed', 'true');

          // Track this element for cleanup
          this.highlightedElements.add(highlightSvg);
          this.elementToConnection.set(highlightSvg, connection);

          return highlightSvg;
        }
      }

    } catch (error) {
      // Silently fail
    }

    return null;
  }

  /**
   * Creates a value connection highlight using the renderer's puzzle tab shape.
   * This gets the shape from core but manages the SVG element ourselves to avoid
   * interference from core's rendering lifecycle.
   *
   * @param connection The value connection to highlight.
   * @param sourceBlock The block containing the connection.
   * @returns The SVG element we created, or null if unsuccessful.
   */
  private createCoreBasedValueHighlight(
    connection: RenderedConnection,
    sourceBlock: BlockSvg,
  ): SVGElement | null {
    try {
      const renderer = sourceBlock.workspace.getRenderer();
      const constants = renderer.getConstants();

      // Get the connection shape (puzzle tab) from the renderer
      const connectionShape = constants.shapeFor(connection);
      if (!connectionShape) {
        return null;
      }

      // Extract the pathDown from the shape
      let connPath = '';
      if ((connectionShape as any).isDynamic) {
        // Dynamic shape - need to find the actual height from the measurable
        let measurableHeight = constants.TAB_HEIGHT; // Default fallback

        // Try to get height from renderInfo measurable
        const renderInfo = (sourceBlock as any).renderInfo_;
        if (renderInfo) {
          const connectionMeasurable = this.findConnectionMeasurable(connection, renderInfo);
          if (connectionMeasurable && connectionMeasurable.height) {
            measurableHeight = connectionMeasurable.height;
          }
        }

        connPath = (connectionShape as any).pathDown(measurableHeight);
      } else if ((connectionShape as any).pathDown) {
        // Static puzzle tab shape
        connPath = (connectionShape as any).pathDown;
      } else {
        return null;
      }

      // Build the highlight path for static shapes (Geras/Thrasos)
      const yLen = constants.TAB_OFFSET_FROM_TOP;
      const highlightPath = (
        `M 0 ${-yLen} ` +
        `v ${yLen} ` +
        connPath +
        `v ${yLen}`
      );

      // Create our own SVG path element (NOT managed by pathObject)
      const highlightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      // Get the connection's position in the block
      const offset = connection.getOffsetInBlock();

      // Calculate transformation
      const transformation = `translate(${offset.x}, ${offset.y})` + (sourceBlock.RTL ? ' scale(-1 1)' : '');

      highlightSvg.setAttribute('d', highlightPath);
      highlightSvg.setAttribute('transform', transformation);
      highlightSvg.setAttribute('fill', 'rgba(53, 168, 255, 0.3)');
      highlightSvg.setAttribute('stroke', '#35a8ff');
      highlightSvg.setAttribute('stroke-width', '3');
      highlightSvg.setAttribute('class', 'blocklyPotentialConnection');
      highlightSvg.style.pointerEvents = 'auto';
      highlightSvg.style.cursor = 'pointer';

      // Add to the block's SVG group (not via pathObject)
      const blockSvg = sourceBlock.getSvgRoot();
      if (blockSvg) {
        blockSvg.appendChild(highlightSvg);

        // Mark that we already added it to block SVG
        highlightSvg.setAttribute('data-attached-to-block', 'true');

        // Track this element for cleanup
        this.highlightedElements.add(highlightSvg);
        this.elementToConnection.set(highlightSvg, connection);

        // Store connection and type for position updates
        this.elementToOriginalCoords.set(highlightSvg, {
          connection: connection,
          type: 'path',
        });

        // Add click event listener if callback is provided
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
      // Silently fail
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
   * Creates an outline highlight for value connections that adapts to current content.
   *
   * @param connection The value connection to highlight.
   * @param workspace The workspace for coordinate transformation.
   * @returns The SVG element representing the value outline.
   */
  private createValueOutline(
    connection: RenderedConnection,
    workspace: WorkspaceSvg,
  ): SVGElement {
    // Try renderer-based shape first if enabled
    if (this.useCoreValueHighlights) {
      const sourceBlock = connection.getSourceBlock();
      if (sourceBlock instanceof BlockSvg) {
        // Check the renderer - only use core shapes for non-Zelos renderers
        const renderer = sourceBlock.workspace.getRenderer();
        const rendererName = renderer.constructor.name;
        const isZelos = rendererName.toLowerCase().includes('zelos');

        // Only use core-based rendering for Geras/Thrasos (static puzzle tabs work well)
        // Zelos dynamic shapes require renderInfo which isn't available for target blocks
        if (!isZelos) {
          const shapeHighlight = this.createCoreBasedValueHighlight(connection, sourceBlock);
          if (shapeHighlight) {
            // Mark it so createConnectionVisualization knows it's already added to DOM
            shapeHighlight.setAttribute('data-already-in-dom', 'true');
            return shapeHighlight;
          }
        }
      }
    }

    // Fallback to custom rounded rect implementation (used for Zelos and fallback)
    const socketBounds = this.getActualSocketBounds(connection, workspace);

    // Create a rectangular socket outline that matches the current content
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    // Transform coordinates to SVG space
    const coords = this.transformCoordinates(
      socketBounds.x,
      socketBounds.y,
      workspace,
    );

    const scale = workspace.scale;
    const scaledWidth = socketBounds.width * scale;
    const scaledHeight = socketBounds.height * scale;

    // Much rounder corners to match value blocks
    const cornerRadius = Math.min(scaledHeight / 2, 25 * scale); // Very round, pill-like

    rect.setAttribute('x', coords.x.toString());
    rect.setAttribute('y', coords.y.toString());
    rect.setAttribute('width', scaledWidth.toString());
    rect.setAttribute('height', scaledHeight.toString());
    rect.setAttribute('rx', cornerRadius.toString()); // Very round corners
    rect.setAttribute('ry', cornerRadius.toString());
    rect.setAttribute('fill', 'rgba(53, 168, 255, 0.1)');
    rect.setAttribute('stroke', '#35a8ff');
    rect.setAttribute('stroke-width', '3');
    rect.setAttribute('stroke-dasharray', '3,3');
    rect.setAttribute(
      'style',
      'z-index: 9999; pointer-events: auto; cursor: pointer;',
    );

    return rect;
  }

  /**
   * Gets the actual bounds of what's currently in the socket or reasonable defaults.
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
      // Check if there's a block currently connected
      const targetBlock = connection.targetBlock();
      if (targetBlock && targetBlock instanceof BlockSvg) {
        // Get the actual bounds of the connected block
        const blockBounds = targetBlock.getBoundingRectangle();
        return {
          x: blockBounds.left,
          y: blockBounds.top,
          width: blockBounds.right - blockBounds.left,
          height: blockBounds.bottom - blockBounds.top,
        };
      }

      // Check if there's a shadow block (like color picker)
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

      // If no connected block, look at the input field to estimate size
      const sourceBlock = connection.getSourceBlock();
      if (sourceBlock && sourceBlock instanceof BlockSvg) {
        const input = this.findInputForConnection(sourceBlock, connection);
        if (input) {
          // Try to get field bounds or estimate based on field content
          const estimatedBounds = this.estimateInputBounds(input, connection);
          if (estimatedBounds) {
            return estimatedBounds;
          }
        }
      }

      // Fallback to default size
      return {
        x: connection.x,
        y: connection.y - 15, // Center vertically
        width: 80, // Default reasonable width
        height: 30, // Default height
      };
    } catch (error) {
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
   * Estimates bounds for an input based on its content and type.
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
      // Check if input has fields that we can measure
      if (input.fieldRow && input.fieldRow.length > 0) {
        let totalWidth = 0;
        const maxHeight = 30; // Default height

        for (const field of input.fieldRow) {
          if (field.getText) {
            const text = field.getText();
            // Rough estimate: 8 pixels per character + padding
            const fieldWidth = Math.max(text.length * 8 + 20, 40);
            totalWidth += fieldWidth;
          } else {
            totalWidth += 40; // Default field width
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
   * Gets the reason why a connection should be filtered, or null if it shouldn't be filtered.
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

    // Filter out connections on insertion markers (preview blocks)
    if (sourceBlock.isInsertionMarker()) return 'insertion-marker';

    // Check if it's the moving block itself
    if (sourceBlock === movingBlock) return 'moving-block';

    // Check if it's a descendant of the moving block
    const movingDescendants = movingBlock.getDescendants(false);
    if (movingDescendants.includes(sourceBlock as BlockSvg)) {
      return 'moving-block-descendant';
    }

    return null;
  }

  /**
   * Checks if a connection belongs to the moving block or its children,
   * or if it belongs to an insertion marker (preview block).
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
    const initialSize = this.highlightedElements.size;
    console.log(`clearHighlights called with ${initialSize} elements to remove`);

    // Remove scroll listener
    if (this.scrollListener) {
      this.workspace.removeChangeListener(this.scrollListener);
    }

    let removedCount = 0;
    let errorCount = 0;

    // All highlights are now independently managed SVG elements - just remove them
    for (const element of this.highlightedElements) {
      try {
        if (element instanceof SVGElement) {
          element.remove();
          removedCount++;
        } else if (element.parentNode) {
          element.parentNode.removeChild(element);
          removedCount++;
        }
      } catch (error) {
        errorCount++;
        console.warn('Error removing highlight element:', error);
      }
    }

    this.highlightedElements.clear();
    console.log(`clearHighlights complete: removed ${removedCount}/${initialSize} (${errorCount} errors)`);
  }

  /**
   * Updates highlights, typically called during drag operations.
   * Recalculates and updates the positions of all highlights based on
   * current workspace scroll and zoom state.
   */
  updateHighlights(): void {
    for (const element of this.highlightedElements) {
      const coordsInfo = this.elementToOriginalCoords.get(element);
      if (!coordsInfo) continue;

      const {connection, type} = coordsInfo;

      try {
        // Update position based on element type
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
        // Silently continue - don't let one element prevent updates of others
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
   * Since all paths are now attached to block SVG, they move automatically with blocks.
   * We only need to update the transform if the connection offset within the block changed.
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

    // All highlights are now block-relative, so just update the offset transform
    const offset = connection.getOffsetInBlock();
    const transformation = `translate(${offset.x}, ${offset.y})` + (sourceBlock.RTL ? ' scale(-1 1)' : '');
    path.setAttribute('transform', transformation);
  }

  /**
   * Updates the position of a rect highlight element (for value connections).
   *
   * @param rect The rect element to update.
   * @param connection The connection this rect represents.
   */
  private updateRectPosition(
    rect: SVGRectElement,
    connection: RenderedConnection,
  ): void {
    // Get the current socket bounds
    const socketBounds = this.getActualSocketBounds(connection, this.workspace);

    // Transform coordinates to SVG space
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