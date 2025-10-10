/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

/**
 * Minimum width threshold for showing full-width grip (in pixels).
 * Blocks narrower than this will get a compact grip.
 */
const MIN_BLOCK_WIDTH_FOR_FULL_GRIP = 30;

/**
 * Width of the grip element in pixels.
 */
const GRIP_WIDTH = 20;

/**
 * CSS class name for the grip element.
 */
const GRIP_CLASS = 'blockly-move-grip';

/**
 * A visual grip handle that appears on focused blocks, allowing users to
 * click the grip to enter sticky move mode.
 */
export class MoveGrip {
  private gripElement: SVGGElement | null = null;
  private clickHandler: ((event: MouseEvent) => void) | null = null;

  /**
   * Constructs a MoveGrip for a block.
   *
   * @param block The block to attach the grip to.
   * @param onGripClick Callback invoked when the grip is clicked.
   */
  constructor(
    private block: Blockly.BlockSvg,
    onGripClick: (block: Blockly.BlockSvg, event: MouseEvent) => void,
  ) {
    this.clickHandler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onGripClick(this.block, event);
    };
  }

  /**
   * Shows the grip on the block.
   */
  show(): void {
    if (this.gripElement) {
      // Already showing
      return;
    }

    const blockSvgRoot = this.block.getSvgRoot();
    if (!blockSvgRoot) return;

    // Create grip element
    this.gripElement = this.createGripElement();

    // Position the grip
    this.positionGrip();

    // Add to block's SVG root
    blockSvgRoot.appendChild(this.gripElement);

    // Add click handler
    if (this.clickHandler) {
      this.gripElement.addEventListener('click', this.clickHandler);
    }
  }

  /**
   * Hides and removes the grip from the block.
   */
  hide(): void {
    if (!this.gripElement) return;

    // Remove click handler
    if (this.clickHandler) {
      this.gripElement.removeEventListener('click', this.clickHandler);
    }

    // Remove from DOM
    this.gripElement.remove();
    this.gripElement = null;
  }

  /**
   * Updates the grip position based on the current block size.
   * Should be called when the block is resized.
   */
  updatePosition(): void {
    if (!this.gripElement) return;
    this.positionGrip();
  }

  /**
   * Creates the SVG grip element.
   *
   * @returns The created SVG group element.
   */
  private createGripElement(): SVGGElement {
    const gripGroup = Blockly.utils.dom.createSvgElement('g', {
      class: GRIP_CLASS,
    }) as SVGGElement;

    // Use the block's direct height/width properties to get just this block's size,
    // not including blocks below it in the stack
    const blockWidth = this.block.width;
    const blockHeight = this.block.height;

    // Determine if block is too narrow for full grip
    const isNarrow = blockWidth < MIN_BLOCK_WIDTH_FOR_FULL_GRIP;
    const gripWidth = isNarrow ? Math.min(GRIP_WIDTH, blockWidth * 0.5) : GRIP_WIDTH;

    // Background rectangle for the grip area
    const gripRect = Blockly.utils.dom.createSvgElement('rect', {
      x: '0',
      y: '0',
      width: gripWidth.toString(),
      height: blockHeight.toString(),
      fill: 'rgba(0, 0, 0, 0.1)',
      'stroke': 'rgba(0, 0, 0, 0.3)',
      'stroke-width': '1',
      rx: '3',
      ry: '3',
      class: 'blockly-move-grip-background',
    });
    gripGroup.appendChild(gripRect);

    // Create grip dots (⋮⋮ icon - two vertical columns of dots)
    const dotRadius = isNarrow ? 1.5 : 2;
    const dotSpacing = isNarrow ? 6 : 8;
    const numDots = Math.min(3, Math.floor(blockHeight / dotSpacing));
    const startY = (blockHeight - (numDots - 1) * dotSpacing) / 2;

    // Two columns of dots
    const column1X = gripWidth * 0.35;
    const column2X = gripWidth * 0.65;

    for (let i = 0; i < numDots; i++) {
      const y = startY + i * dotSpacing;

      // First column
      const dot1 = Blockly.utils.dom.createSvgElement('circle', {
        cx: column1X.toString(),
        cy: y.toString(),
        r: dotRadius.toString(),
        fill: 'rgba(0, 0, 0, 0.6)',
        class: 'blockly-move-grip-dot',
      });
      gripGroup.appendChild(dot1);

      // Second column
      const dot2 = Blockly.utils.dom.createSvgElement('circle', {
        cx: column2X.toString(),
        cy: y.toString(),
        r: dotRadius.toString(),
        fill: 'rgba(0, 0, 0, 0.6)',
        class: 'blockly-move-grip-dot',
      });
      gripGroup.appendChild(dot2);
    }

    return gripGroup;
  }

  /**
   * Positions the grip on the left edge of the block.
   */
  private positionGrip(): void {
    if (!this.gripElement) return;

    // Position at the top-left corner of the block
    // The grip should be at (0, 0) relative to the block's SVG root
    this.gripElement.setAttribute('transform', 'translate(0, 0)');
  }

  /**
   * Checks if the given event target is the grip element or a child of it.
   *
   * @param target The event target to check.
   * @returns True if the target is the grip or within the grip.
   */
  isGripTarget(target: EventTarget | null): boolean {
    if (!this.gripElement || !target) return false;

    const element = target as Element;
    return this.gripElement.contains(element) || element === this.gripElement;
  }
}
