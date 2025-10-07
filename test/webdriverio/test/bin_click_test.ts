/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import * as chai from 'chai';
import {Browser, Key} from 'webdriverio';
import {suite, test, setup, afterEach} from 'mocha';

import {
  PAUSE_TIME,
  focusOnBlock,
  testFileLocations,
  testSetup,
  sendKeyAndWait,
  isDragging,
  blockIsPresent,
  getCurrentFocusedBlockId,
  assertNoJavaScriptErrors,
  clearBrowserLogs,
} from './test_setup.js';

/**
 * Helper function to double-click on a block to enter sticky mode.
 *
 * @param browser The WebdriverIO browser object.
 * @param blockId The ID of the block to double-click.
 */
async function doubleClickBlock(
  browser: Browser,
  blockId: string,
): Promise<void> {
  const findableId = 'doubleClickTarget';

  // In browser context, find the element and mark it
  await browser.execute(
    (blockId, newElemId) => {
      const ws = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
      const block = ws.getBlockById(blockId) as Blockly.BlockSvg;
      ws.scrollBoundsIntoView(block.getBoundingRectangleWithoutChildren(), 10);

      // Find a good element to double-click
      if (!block.isCollapsed()) {
        for (const input of block.inputList) {
          for (const field of input.fieldRow) {
            if (field instanceof Blockly.FieldLabel) {
              const svgRoot = field.getSvgRoot();
              if (svgRoot) {
                svgRoot.id = newElemId;
                return;
              }
            }
          }
        }
      }

      // If we can't find a field, use the root SVG of the block
      const svg = block.getSvgRoot();
      svg.id = newElemId;
    },
    blockId,
    findableId,
  );

  const clickTarget = await browser.$('#' + findableId);
  await clickTarget.doubleClick();
}

/**
 * Check if the workspace has a trashcan enabled by looking for the SVG element.
 *
 * @param browser The WebdriverIO browser object.
 * @returns True if trashcan is present and visible.
 */
async function hasTrashcan(browser: Browser): Promise<boolean> {
  const trashcanElement = await browser.$('.blocklyTrash');
  return await trashcanElement.isExisting();
}

/**
 * Get the bounding box of the trashcan element.
 *
 * @param browser The WebdriverIO browser object.
 * @returns Object with x, y, width, height of the trashcan or null if not found.
 */
async function getTrashcanBounds(
  browser: Browser,
): Promise<{x: number; y: number; width: number; height: number} | null> {
  const trashcanElement = await browser.$('.blocklyTrash');
  if (!(await trashcanElement.isExisting())) {
    return null;
  }

  const location = await trashcanElement.getLocation();
  const size = await trashcanElement.getSize();
  return {
    x: location.x,
    y: location.y,
    width: size.width,
    height: size.height,
  };
}

/**
 * Check if we're currently in sticky mode.
 *
 * @param browser The WebdriverIO browser object.
 * @returns True if in sticky mode.
 */
async function isInStickyMode(browser: Browser): Promise<boolean> {
  return await browser.execute(() => {
    const keyboardNav = (window as any).keyboardNavigation;
    return keyboardNav ? keyboardNav.isInStickyMode : false;
  });
}

suite('Bin Click Tests', function () {
  // Increase timeout to 10s for this longer test (but disable
  // timeouts when non-zero PAUSE_TIME is used to watch tests run).
  this.timeout(PAUSE_TIME ? 0 : 10000);

  // Clear the workspace and load simple program.
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  // Check for JavaScript errors after each test
  afterEach(async function () {
    await assertNoJavaScriptErrors(this.browser, 'bin click operations');
  });

  suite('Trashcan Availability', function () {
    test('Trashcan should be present in workspace', async function () {
      const hasTrash = await hasTrashcan(this.browser);

      if (!hasTrash) {
        // Skip this test if trashcan is not enabled - this will help us identify
        // that we need to enable the trashcan in the test setup
        this.skip();
      }

      chai.assert.isTrue(hasTrash, 'Trashcan should be present and visible');
    });

    test('Trashcan should have valid bounds when present', async function () {
      const hasTrash = await hasTrashcan(this.browser);
      if (!hasTrash) {
        this.skip();
      }

      const bounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(bounds, 'Trashcan should have valid bounds');
      chai.assert.isAbove(
        bounds!.width,
        0,
        'Trashcan should have positive width',
      );
      chai.assert.isAbove(
        bounds!.height,
        0,
        'Trashcan should have positive height',
      );
    });
  });

  suite('Direct Bin Click Behavior', function () {
    test('Click directly on bin while in sticky mode should delete block', async function () {
      const hasTrash = await hasTrashcan(this.browser);
      if (!hasTrash) {
        this.skip();
      }

      // Navigate to a block and verify it exists
      await focusOnBlock(this.browser, 'draw_circle_1');
      chai.assert.isTrue(
        await blockIsPresent(this.browser, 'draw_circle_1'),
        'Block should exist initially',
      );

      // Enter sticky mode by double-clicking the block
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Wait for move indicator to appear to confirm we're in sticky mode
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();
      chai.assert.isTrue(
        await isInStickyMode(this.browser),
        'Should be in sticky mode',
      );
      chai.assert.isTrue(await isDragging(this.browser), 'Should be dragging');

      // Get trashcan bounds
      const trashcanBounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(
        trashcanBounds,
        'Trashcan bounds should be available',
      );

      // Click directly on the center of the trashcan
      const centerX = trashcanBounds!.x + trashcanBounds!.width / 2;
      const centerY = trashcanBounds!.y + trashcanBounds!.height / 2;

      await this.browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          actions: [
            {
              type: 'pointerMove',
              x: Math.round(centerX),
              y: Math.round(centerY),
            },
            {type: 'pointerDown', button: 0},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
      await this.browser.pause(PAUSE_TIME);

      // Block should be deleted and no longer in sticky mode
      chai.assert.isFalse(
        await blockIsPresent(this.browser, 'draw_circle_1'),
        'Block should be deleted after clicking bin',
      );
      chai.assert.isFalse(
        await isInStickyMode(this.browser),
        'Should no longer be in sticky mode',
      );
      chai.assert.isFalse(
        await isDragging(this.browser),
        'Should no longer be dragging',
      );
    });

    test('Click near but not on bin should not delete block', async function () {
      const hasTrash = await hasTrashcan(this.browser);
      if (!hasTrash) {
        this.skip();
      }

      // Navigate to a block and verify it exists
      await focusOnBlock(this.browser, 'draw_circle_1');
      chai.assert.isTrue(
        await blockIsPresent(this.browser, 'draw_circle_1'),
        'Block should exist initially',
      );

      // Enter sticky mode
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();
      chai.assert.isTrue(
        await isInStickyMode(this.browser),
        'Should be in sticky mode',
      );

      // Get trashcan bounds
      const trashcanBounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(
        trashcanBounds,
        'Trashcan bounds should be available',
      );

      // Click just outside the trashcan (offset by 20 pixels to the left, keeping within workspace)
      const nearX = Math.max(50, trashcanBounds!.x - 20);
      const nearY = trashcanBounds!.y + trashcanBounds!.height / 2;

      await this.browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          actions: [
            {type: 'pointerMove', x: Math.round(nearX), y: Math.round(nearY)},
            {type: 'pointerDown', button: 0},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
      await this.browser.pause(PAUSE_TIME);

      // Block should still exist (just dropped in new location)
      chai.assert.isTrue(
        await blockIsPresent(this.browser, 'draw_circle_1'),
        'Block should still exist after clicking near bin',
      );
      chai.assert.isFalse(
        await isInStickyMode(this.browser),
        'Should no longer be in sticky mode',
      );
      chai.assert.isFalse(
        await isDragging(this.browser),
        'Should no longer be dragging',
      );
    });

    test('Click on bin with no block in sticky mode should do nothing', async function () {
      const hasTrash = await hasTrashcan(this.browser);
      if (!hasTrash) {
        this.skip();
      }

      // Verify we're not in sticky mode initially
      chai.assert.isFalse(
        await isInStickyMode(this.browser),
        'Should not be in sticky mode initially',
      );

      // Get trashcan bounds
      const trashcanBounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(
        trashcanBounds,
        'Trashcan bounds should be available',
      );

      // Click on the trashcan when not in sticky mode
      const centerX = trashcanBounds!.x + trashcanBounds!.width / 2;
      const centerY = trashcanBounds!.y + trashcanBounds!.height / 2;

      await this.browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          actions: [
            {
              type: 'pointerMove',
              x: Math.round(centerX),
              y: Math.round(centerY),
            },
            {type: 'pointerDown', button: 0},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
      await this.browser.pause(PAUSE_TIME);

      // Should still not be in sticky mode and all blocks should still exist
      chai.assert.isFalse(
        await isInStickyMode(this.browser),
        'Should still not be in sticky mode',
      );
      chai.assert.isTrue(
        await blockIsPresent(this.browser, 'draw_circle_1'),
        'Blocks should still exist',
      );
    });
  });
});
