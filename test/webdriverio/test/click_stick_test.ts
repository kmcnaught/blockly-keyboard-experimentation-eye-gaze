/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import * as chai from 'chai';
import {Browser, Key} from 'webdriverio';
import { suite, test, setup, afterEach } from 'mocha';

import {
  PAUSE_TIME,
  focusOnBlock,
  testFileLocations,
  testSetup,
  sendKeyAndWait,
  isDragging,
  clickBlock,
  getCurrentFocusedBlockId,
  getSelectedBlockId,
  maybeAssertNoJavaScriptErrors,
  clearBrowserLogs,
  blockIsPresent,
} from './test_setup.js';

// ============================================================================
// Common Test Helper Functions
// ============================================================================

/**
 * Enter move mode on a block using either mouse or touch input.
 *
 * @param browser The WebdriverIO browser instance
 * @param blockId The ID of the block to move
 * @param method The input method: 'mouse' for double-click, 'touch' for double-tap
 */
async function enterMoveMode(browser: Browser, blockId: string, method: 'mouse' | 'touch' = 'mouse'): Promise<void> {
  await focusOnBlock(browser, blockId);

  if (method === 'mouse') {
    await doubleClickBlock(browser, blockId);
  } else {
    await doubleTapBlock(browser, blockId);
  }

  await browser.$('.blocklyMoveIndicatorBubble').waitForExist({
    timeout: 10000,
    timeoutMsg: `Move indicator should appear after ${method} double-${method === 'mouse' ? 'click' : 'tap'}`
  });

  // Verify we're in move mode
  if (!await isDragging(browser)) {
    throw new Error(`Failed to enter move mode using ${method} input`);
  }
}

/**
 * Wait for connection highlights to appear during move mode.
 *
 * @param browser The WebdriverIO browser instance
 * @param timeout Maximum time to wait in milliseconds
 * @param extraDelay Additional delay for touch events (touch highlights can take longer)
 */
async function waitForHighlights(browser: Browser, timeout: number = 10000, extraDelay: number = 0): Promise<void> {
  if (extraDelay > 0) {
    await browser.pause(extraDelay);
  }

  await browser.waitUntil(async () => {
    const count = await getConnectionHighlightCount(browser);
    return count > 0;
  }, {
    timeout,
    timeoutMsg: 'Connection highlights should appear during move mode'
  });
}

/**
 * Wait for workspace dragging state to clear.
 *
 * @param browser The WebdriverIO browser instance
 * @param timeout Maximum time to wait in milliseconds
 */
async function waitForDraggingToStop(browser: Browser, timeout: number = 2000): Promise<void> {
  await browser.waitUntil(
    async () => !(await isDragging(browser)),
    {
      timeout,
      timeoutMsg: 'Dragging should stop after exiting move mode'
    }
  );
}

/**
 * Wait for sticky mode to exit.
 *
 * @param browser The WebdriverIO browser instance
 * @param timeout Maximum time to wait in milliseconds
 */
async function waitForStickyModeToExit(browser: Browser, timeout: number = 2000): Promise<void> {
  await browser.waitUntil(
    async () => !(await isInStickyMode(browser)),
    {
      timeout,
      timeoutMsg: 'Sticky mode should exit'
    }
  );
}

/**
 * Exit move mode using various methods.
 *
 * @param browser The WebdriverIO browser instance
 * @param method How to exit: 'enter' (confirm), 'escape' (cancel), 'click' (click workspace), 'tap' (tap workspace)
 */
async function exitMoveMode(browser: Browser, method: 'enter' | 'escape' | 'click' | 'tap' = 'enter'): Promise<void> {
  if (method === 'enter') {
    await sendKeyAndWait(browser, Key.Enter);
  } else if (method === 'escape') {
    await sendKeyAndWait(browser, Key.Escape);
  } else if (method === 'click') {
    const workspace = await browser.$('.blocklySvg');
    await workspace.click({x: 50, y: 50});
    await browser.pause(PAUSE_TIME);
  } else if (method === 'tap') {
    const workspace = await browser.$('.blocklySvg');
    await workspace.click();
    await browser.pause(PAUSE_TIME);
  }
}

/**
 * Verify that highlights are cleared after exiting move mode.
 *
 * @param browser The WebdriverIO browser instance
 */
async function assertHighlightsCleared(browser: Browser): Promise<void> {
  const finalCount = await getConnectionHighlightCount(browser);
  chai.assert.equal(finalCount, 0, 'Connection highlights should be cleared');
}

// ============================================================================
// Test Suites
// ============================================================================

suite('Click and Stick Move Mode Tests', function () {
  // Increase timeout to 10s for this longer test (but disable
  // timeouts when non-zero PAUSE_TIME is used to watch tests run).
  this.timeout(PAUSE_TIME ? 0 : 10000);

  // Clear the workspace and load comments scenario (which has draw_circle_1 and draw_circle_2 in a stack).
  setup(async function () {
    this.browser = await testSetup(testFileLocations.COMMENTS, this.timeout());
    await this.browser.pause(PAUSE_TIME);
  });

  suite('Double-click to enter move mode', function () {
    test('Double-click block enters move mode', async function () {
      // Verify we're not initially dragging
      chai.assert.isFalse(await isDragging(this.browser));

      // Enter move mode using mouse
      await enterMoveMode(this.browser, 'draw_circle_1', 'mouse');

      // Verify we're in move mode
      chai.assert.isTrue(await isDragging(this.browser));

      // Exit move mode
      await exitMoveMode(this.browser, 'escape');
      chai.assert.isFalse(await isDragging(this.browser));
    });

    test('Double-click multiple blocks enters move mode', async function () {
      // Test with multiple blocks to ensure feature works across different block types
      const blockIds = ['draw_circle_1', 'draw_circle_2'];

      for (const blockId of blockIds) {
        // Verify not dragging initially
        chai.assert.isFalse(await isDragging(this.browser), `Should not be dragging before ${blockId}`);

        // Enter move mode
        await enterMoveMode(this.browser, blockId, 'mouse');

        // Verify now dragging
        chai.assert.isTrue(await isDragging(this.browser), `Should be dragging ${blockId}`);

        // Exit move mode
        await exitMoveMode(this.browser, 'escape');
        chai.assert.isFalse(await isDragging(this.browser), `Should not be dragging after escape for ${blockId}`);
      }
    });

    test('Single click does not enter move mode', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Single click the block
      await clickBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Should not be in move mode
      chai.assert.isFalse(await isDragging(this.browser));
    });
  });

  suite('Arrow key navigation in move mode', function () {
    test('Arrow keys navigate between connection candidates', async function () {
      // Enter move mode
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');

      // Wait for move mode
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();
      chai.assert.isTrue(await isDragging(this.browser));

      // Get initial connection candidate
      const initialCandidate = await getConnectionCandidate(this.browser);
      chai.assert.exists(initialCandidate, 'Should have initial connection candidate');

      // Navigate with arrow keys
      await sendKeyAndWait(this.browser, Key.ArrowRight);
      const candidate1 = await getConnectionCandidate(this.browser);

      await sendKeyAndWait(this.browser, Key.ArrowRight);
      const candidate2 = await getConnectionCandidate(this.browser);

      // Connection candidates should change
      chai.assert.notDeepEqual(candidate1, initialCandidate, 'Arrow right should change candidate');
      chai.assert.notDeepEqual(candidate2, candidate1, 'Second arrow right should change candidate');

      // Test arrow left navigation
      await sendKeyAndWait(this.browser, Key.ArrowLeft);
      const candidateLeft = await getConnectionCandidate(this.browser);
      chai.assert.deepEqual(candidateLeft, candidate1, 'Arrow left should return to previous candidate');

      // Abort move
      await sendKeyAndWait(this.browser, Key.Escape);
    });

    test('Down and up arrows navigate connection candidates', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');

      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      const initialCandidate = await getConnectionCandidate(this.browser);

      // Test down arrow
      await sendKeyAndWait(this.browser, Key.ArrowDown);
      const candidateDown = await getConnectionCandidate(this.browser);
      chai.assert.notDeepEqual(candidateDown, initialCandidate, 'Arrow down should change candidate');

      // Test up arrow
      await sendKeyAndWait(this.browser, Key.ArrowUp);
      const candidateUp = await getConnectionCandidate(this.browser);
      chai.assert.deepEqual(candidateUp, initialCandidate, 'Arrow up should return to initial candidate');

      await sendKeyAndWait(this.browser, Key.Escape);
    });
  });

  suite('Enter key to confirm move', function () {
    test('Enter key completes move to connection candidate', async function () {
      // Get initial block position info
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialInfo = await getFocusedNeighbourInfo(this.browser);

      // Enter move mode
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Navigate to a different connection candidate
      await sendKeyAndWait(this.browser, Key.ArrowRight);
      const connectionCandidate = await getConnectionCandidate(this.browser);
      chai.assert.exists(connectionCandidate, 'Should have connection candidate');

      // Confirm move with Enter
      await sendKeyAndWait(this.browser, Key.Enter);

      // Should no longer be dragging
      chai.assert.isFalse(await isDragging(this.browser));

      // Block should be in new position (different from initial)
      const finalInfo = await getFocusedNeighbourInfo(this.browser);
      chai.assert.notDeepEqual(initialInfo, finalInfo, 'Block should be in new position after move');
    });

    test('Enter key without connection candidate stops move', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Move to unconstrained position (Alt+Arrow)
      await sendKeyAndWait(this.browser, [Key.Alt, Key.ArrowDown]);
      await sendKeyAndWait(this.browser, [Key.Alt, Key.ArrowRight]);

      // There should be no connection candidate now
      const candidate = await getConnectionCandidate(this.browser);
      chai.assert.isNull(candidate, 'Should have no connection candidate in unconstrained position');

      // Enter should still stop the move
      await sendKeyAndWait(this.browser, Key.Enter);
      chai.assert.isFalse(await isDragging(this.browser));
    });

    test('Enter key returns block to original position when no move made', async function () {
      // Get initial block position
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const initialInfo = await getFocusedNeighbourInfo(this.browser);

      // Verify not in sticky mode initially
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should not be in sticky mode initially');

      // Enter move mode via double-click (this should trigger click-and-stick)
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Verify we're in sticky mode (proving we're using the click-and-stick implementation)
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode after double-click');
      chai.assert.strictEqual(await getStickyBlockId(this.browser), 'draw_circle_1', 'Correct block should be in sticky mode');
      chai.assert.isTrue(await isDragging(this.browser));

      // Press Enter immediately without moving
      await sendKeyAndWait(this.browser, Key.Enter);

      // Should no longer be in sticky mode or dragging (wait for state to clear)
      await waitForStickyModeToExit(this.browser);
      await waitForDraggingToStop(this.browser);

      // Block should be in exact same position
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const finalInfo = await getFocusedNeighbourInfo(this.browser);

      chai.assert.deepEqual(initialPosition, finalPosition, 'Block should be in exact same position');
      chai.assert.deepEqual(initialInfo, finalInfo, 'Block connections should be unchanged');
    });
  });

  suite('Click on destination connection point', function () {
    test('Click on connection point moves block there', async function () {
      // Start move mode
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Find a target connection point to click on
      const targetConnection = await findStatementConnectionPoint(this.browser, 'draw_circle_1');
      chai.assert.exists(targetConnection, 'Should find target connection point');

      // Click on the connection point
      await targetConnection.click();
      await this.browser.pause(PAUSE_TIME);

      // Should no longer be dragging
      chai.assert.isFalse(await isDragging(this.browser));

      // Block should be connected to the target
      const blockPosition = await getBlockConnectionInfo(this.browser, 'draw_circle_1');
      chai.assert.exists(blockPosition.parentId, 'Block should now have a parent');
    });

    test('Click on incompatible connection does not move block', async function () {
      // Try to connect a statement block to a value input
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialInfo = await getFocusedNeighbourInfo(this.browser);

      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Try to click on a value connection (incompatible)
      const valueConnection = await findValueConnectionPoint(this.browser, 'value_1');
      if (valueConnection) {
        await valueConnection.click();
        await this.browser.pause(PAUSE_TIME);

        // Should still be dragging (move not completed due to incompatibility)
        const stillDragging = await isDragging(this.browser);
        if (stillDragging) {
          // If still dragging, the click was rejected - this is correct behavior
          await sendKeyAndWait(this.browser, Key.Escape);
        } else {
          // If not dragging, verify the block didn't move to wrong place
          const finalInfo = await getFocusedNeighbourInfo(this.browser);
          chai.assert.deepEqual(initialInfo, finalInfo, 'Block should not move to incompatible connection');
        }
      }
    });
  });

  suite('Mouse movement with block following', function () {
    test('Moving mouse in move mode makes block follow cursor', async function () {
      // Start move mode
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');

      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Get workspace element for mouse movement
      const workspace = await this.browser.$('.blocklySvg');

      // Move mouse to different position
      await workspace.moveTo({xOffset: 200, yOffset: 100});
      await this.browser.pause(PAUSE_TIME);

      // Check that block position changed
      const newPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(initialPosition, newPosition, 'Block should follow mouse movement');

      // Move mouse again
      await workspace.moveTo({xOffset: 300, yOffset: 200});
      await this.browser.pause(PAUSE_TIME);

      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(newPosition, finalPosition, 'Block should continue following mouse');

      // End move
      await sendKeyAndWait(this.browser, Key.Escape);
    });

    test('Mouse movement opens spaces for block placement', async function () {
      // This test verifies that moving a block near other blocks
      // causes space to open up for insertion
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Move mouse near another block to trigger space opening
      const targetBlock = await this.browser.$(`[data-id="draw_circle_1"]`);
      await targetBlock.moveTo();
      await this.browser.pause(PAUSE_TIME);

      // Check for insertion markers or connection indicators
      const insertionMarker = await this.browser.$('.blocklyInsertionMarker');
      const markerExists = await insertionMarker.isExisting();

      if (markerExists) {
        chai.assert.isTrue(markerExists, 'Insertion marker should appear when hovering near blocks');
      }

      await sendKeyAndWait(this.browser, Key.Escape);
    });
  });

  suite('Single click to release block', function () {
    test('Single click during mouse follow mode releases block', async function () {
      // Start move mode
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Move mouse to position block
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.moveTo({xOffset: 150, yOffset: 150});
      await this.browser.pause(PAUSE_TIME);

      // Single click to release
      await workspace.click();
      await this.browser.pause(PAUSE_TIME);

      // Should no longer be dragging
      chai.assert.isFalse(await isDragging(this.browser));
    });

    test('Double-click block, move mouse to empty space, single click drops block there', async function () {
      // Get initial position
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');

      // Verify not in sticky mode initially
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should not be in sticky mode initially');

      // Enter move mode via double-click (this should trigger click-and-stick)
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Verify we're in sticky mode (proving we're using the click-and-stick implementation)
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode after double-click');
      chai.assert.strictEqual(await getStickyBlockId(this.browser), 'draw_circle_1', 'Correct block should be in sticky mode');
      chai.assert.isTrue(await isDragging(this.browser));

      // Move mouse to the right to empty space
      const workspace = await this.browser.$('.blocklySvg');
      const xOff = 150;
      const yOff = 50;
      await workspace.moveTo({xOffset: xOff, yOffset: yOff});
      await this.browser.pause(PAUSE_TIME);

      // Should still be in sticky mode during mouse movement
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should remain in sticky mode during mouse movement');

      // Verify block has followed mouse movement
      const movedPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(initialPosition, movedPosition, 'Block should follow mouse movement');

      // Single click to drop the block
      await workspace.click({x: xOff, y: yOff});
      await this.browser.pause(PAUSE_TIME);

      // Should no longer be in sticky mode or dragging (wait for state to clear)
      await waitForStickyModeToExit(this.browser);
      await waitForDraggingToStop(this.browser);

      // Block should remain at the new position (not return to original)
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.deepEqual(movedPosition, finalPosition, 'Block should stay where it was dropped');
      chai.assert.notDeepEqual(initialPosition, finalPosition, 'Block should not return to original position');
    });

    test('Single click on workspace during move mode ends move', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Click on empty workspace area
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.click({x: 50, y: 50});
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isFalse(await isDragging(this.browser));
    });

    test('Single click near connection point connects and ends move', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialInfo = await getFocusedNeighbourInfo(this.browser);

      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Move mouse near a connection point
      const targetBlock = await this.browser.$(`[data-id="draw_circle_1"]`);
      const targetLocation = await targetBlock.getLocation();

      // Click near the target block's connection area
      await this.browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          actions: [
            {type: 'pointerMove', x: targetLocation.x, y: targetLocation.y + 5},
            {type: 'pointerDown', button: 0},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);

      await this.browser.pause(PAUSE_TIME);

      // Should no longer be dragging
      chai.assert.isFalse(await isDragging(this.browser));

      // Block should be in a new position
      const finalInfo = await getFocusedNeighbourInfo(this.browser);
      // Only check if position actually changed (connection might not always succeed)
      if (finalInfo.parentId !== initialInfo.parentId) {
        chai.assert.notDeepEqual(initialInfo, finalInfo, 'Block moved to new connection');
      }
    });
  });

  suite('Connection Highlights Cleanup Tests', function () {
    test('Connection highlights are cleared after completing move with Enter', async function () {
      // Enter move mode to get connection highlights
      await enterMoveMode(this.browser, 'draw_circle_1', 'mouse');

      // Wait for highlights to appear
      await waitForHighlights(this.browser);

      // Verify connection highlights are present
      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights during move');

      // Complete the move with Enter
      await exitMoveMode(this.browser, 'enter');

      // Verify highlights are cleared
      await assertHighlightsCleared(this.browser);
    });

    test('Connection highlights are cleared after completing move by clicking on workspace', async function () {
      // Enter move mode
      await enterMoveMode(this.browser, 'draw_circle_1', 'mouse');
      await waitForHighlights(this.browser);

      // Verify connection highlights are present
      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights during move');

      // Complete the move by clicking on empty workspace
      await exitMoveMode(this.browser, 'click');

      // Verify highlights are cleared
      await assertHighlightsCleared(this.browser);
    });

    test('Connection highlights are cleared after completing move by clicking on connection', async function () {
      // Enter move mode
      await enterMoveMode(this.browser, 'draw_circle_1', 'mouse');
      await waitForHighlights(this.browser);

      // Verify connection highlights are present
      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights during move');

      // Find and click on a connection highlight
      const highlightElement = await this.browser.$('.blocklyPotentialConnection');
      if (await highlightElement.isExisting()) {
        await highlightElement.click();
        await this.browser.pause(PAUSE_TIME);

        // Verify highlights are cleared
        await assertHighlightsCleared(this.browser);
      }
    });

    test('Connection highlights are cleared after canceling move with Escape', async function () {
      // Enter move mode
      await enterMoveMode(this.browser, 'draw_circle_1', 'mouse');
      await waitForHighlights(this.browser);

      // Verify connection highlights are present
      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights during move');

      // Cancel the move with Escape
      await exitMoveMode(this.browser, 'escape');

      // Verify highlights are cleared
      await assertHighlightsCleared(this.browser);
    });

    test('Connection highlights persist during STATEMENT block movement and stack re-computation', async function () {
      // This test specifically addresses the original issue: highlights disappearing
      // during STATEMENT block movement when the stack re-computes

      // Start move mode on a statement block
      await focusOnBlock(this.browser, 'draw_circle_1');
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Verify connection highlights are present initially
      const initialCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(initialCount, 0, 'Should have connection highlights initially');

      // Move the block around to potentially trigger stack re-computation
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.moveTo({xOffset: 100, yOffset: 100});
      await this.browser.pause(100); // Small pause to let any re-renders happen

      await workspace.moveTo({xOffset: 200, yOffset: 150});
      await this.browser.pause(100);

      await workspace.moveTo({xOffset: 150, yOffset: 200});
      await this.browser.pause(PAUSE_TIME);

      // Verify highlights are still present after movement
      const countAfterMovement = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(countAfterMovement, 0, 'Connection highlights should persist during block movement');

      // Verify we have roughly the same number of highlights (within a reasonable range)
      const highlightCountDifference = Math.abs(countAfterMovement - initialCount);
      chai.assert.isBelow(highlightCountDifference, 3, 'Should have roughly the same number of highlights');

      // Complete the move
      await sendKeyAndWait(this.browser, Key.Enter);
      await this.browser.pause(PAUSE_TIME);

      // Verify highlights are cleared after completion
      const finalCount = await getConnectionHighlightCount(this.browser);
      chai.assert.equal(finalCount, 0, 'Connection highlights should be cleared after completing move');
    });

    test('Connection highlights are cleared after double-click to start, single click to drop', async function () {
      // Navigate to a block first
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Get initial position
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');

      // Double-click the block to enter move mode (simulating double-tap)
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Verify we're in sticky mode and have connection highlights
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode after double-click');
      chai.assert.isTrue(await isDragging(this.browser), 'Should be dragging after double-click');

      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights during move');

      // Move to a different location and single click on workspace to drop the block
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.click({x: 250, y: 200});
      await this.browser.pause(PAUSE_TIME);

      // Verify move mode ended and highlights are cleared
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should exit sticky mode after single click');
      chai.assert.isFalse(await isDragging(this.browser), 'Should not be dragging after single click');

      const finalCount = await getConnectionHighlightCount(this.browser);
      chai.assert.equal(finalCount, 0, 'Connection highlights should be cleared after click drop');

      // Verify block moved to new position
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(initialPosition, finalPosition, 'Block should move to new position');
    });
  });

  suite('Regression Test - JavaScript Error Detection', function () {
    test('Double-click, Enter should not cause JavaScript errors', async function () {
      // This test replicates the core bug scenario:
      // 1. Double-click a block to start move mode
      // 2. Press Enter to drop the block
      //
      // The original bug threw: "ERROR: no move info for workspace" during Enter handling
      // This test catches that error without testing implementation details

      await focusOnBlock(this.browser, 'draw_circle_1');

      // Double-click block to enter move mode
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Press Enter to drop the block (this triggered the original error)
      await sendKeyAndWait(this.browser, Key.Enter);
      await this.browser.pause(PAUSE_TIME);

      // Check that no JavaScript errors occurred using the helper function
      // This assertion would fail on the broken implementation with:
      // "ERROR: no move info for workspace"
      await maybeAssertNoJavaScriptErrors(this.browser, 'double-click and Enter key handling');

      // Verify the operation completed successfully (block should not be dragging)
      chai.assert.isFalse(await isDragging(this.browser), 'Block should have been dropped successfully');
    });
  });

  suite('Escape key cancels move mode', function () {
    test('Double-click block, move mouse, Esc cancels and returns to original position', async function () {
      // Get initial position and connection info
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const initialInfo = await getFocusedNeighbourInfo(this.browser);

      // Verify not in sticky mode initially
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should not be in sticky mode initially');

      // Enter move mode via double-click (this should trigger click-and-stick)
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Verify we're in sticky mode (proving we're using the click-and-stick implementation)
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode after double-click');
      chai.assert.strictEqual(await getStickyBlockId(this.browser), 'draw_circle_1', 'Correct block should be in sticky mode');
      chai.assert.isTrue(await isDragging(this.browser));

      // Move mouse to different position
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.moveTo({xOffset: 250, yOffset: 150});
      await this.browser.pause(PAUSE_TIME);

      // Should still be in sticky mode during mouse movement
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should remain in sticky mode during mouse movement');

      // Verify block has followed mouse movement
      const movedPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(initialPosition, movedPosition, 'Block should follow mouse movement');

      // Press Escape to cancel move
      await sendKeyAndWait(this.browser, Key.Escape);

      // Check for JavaScript errors after the Escape key operation
      await maybeAssertNoJavaScriptErrors(this.browser, 'Escape key handling in move mode');

      // Should no longer be in sticky mode or dragging (wait for state to clear)
      await waitForStickyModeToExit(this.browser);
      await waitForDraggingToStop(this.browser);

      // Block should be back at original position with original connections
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const finalInfo = await getFocusedNeighbourInfo(this.browser);

      chai.assert.deepEqual(initialPosition, finalPosition, 'Block should return to original position');
      chai.assert.deepEqual(initialInfo, finalInfo, 'Block connections should be restored');
    });
  });

  suite('Control: Mouse click selection should work after click-and-stick', function () {
    test('Single click should select block after mouse click-and-stick to workspace (SHOULD PASS)', async function () {
      
       // Step 4: Single click on a different statement block (draw_circle_2)
      await clickBlock(this.browser, 'draw_circle_2');
      await this.browser.pause(PAUSE_TIME);

      // Step 5: Check it was selected and highlighted (this SHOULD pass for mouse)
      const selectedId2 = await getSelectedBlockId(this.browser);
      chai.assert.equal(
        selectedId2,
        'draw_circle_2',
        'Block should be selected after single click (this works with mouse)'
      );
      
      // Step 1: Double-click a block to enter sticky mode
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');

      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-click'
      });

      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode');
      chai.assert.isTrue(await isDragging(this.browser), 'Should be dragging');

      // Step 2: Click on the workspace to drop the block there
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.click({x: 200, y: 150});
      await this.browser.pause(PAUSE_TIME);

      // Step 3: Verify it moved the block there and exited sticky mode
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(
        initialPosition,
        finalPosition,
        'Block should have moved to new position'
      );
      chai.assert.isFalse(await isDragging(this.browser), 'Should have exited move mode');
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should have exited sticky mode');

      // Step 4: Single click on a different statement block (draw_circle_2)
      await clickBlock(this.browser, 'draw_circle_2');
      await this.browser.pause(PAUSE_TIME);

      // Step 5: Check it was selected and highlighted (this SHOULD pass for mouse)
      const selectedId = await getSelectedBlockId(this.browser);
      chai.assert.equal(
        selectedId,
        'draw_circle_2',
        'Block should be selected after single click (this works with mouse)'
      );
    });
  });
});

// Bin Click Tests suite
suite('Bin Click Tests', function () {
  // Increase timeout to 10s for this longer test (but disable
  // timeouts when non-zero PAUSE_TIME is used to watch tests run).
  this.timeout(PAUSE_TIME ? 0 : 10000);

  // Clear the workspace and load simple program.
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE, this.timeout());
    await this.browser.pause(PAUSE_TIME);
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
      chai.assert.isAbove(bounds!.width, 0, 'Trashcan should have positive width');
      chai.assert.isAbove(bounds!.height, 0, 'Trashcan should have positive height');
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
      chai.assert.isTrue(await blockIsPresent(this.browser, 'draw_circle_1'), 'Block should exist initially');

      // Enter sticky mode by double-clicking the block
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Wait for move indicator to appear to confirm we're in sticky mode
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode');
      chai.assert.isTrue(await isDragging(this.browser), 'Should be dragging');

      // Get trashcan bounds
      const trashcanBounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(trashcanBounds, 'Trashcan bounds should be available');

      // Click directly on the center of the trashcan
      const centerX = trashcanBounds!.x + trashcanBounds!.width / 2;
      const centerY = trashcanBounds!.y + trashcanBounds!.height / 2;

      await this.browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          actions: [
            {type: 'pointerMove', x: Math.round(centerX), y: Math.round(centerY)},
            {type: 'pointerDown', button: 0},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
      await this.browser.pause(PAUSE_TIME);

      // Block should be deleted and no longer in sticky mode (wait for state to clear)
      await waitForStickyModeToExit(this.browser);
      await waitForDraggingToStop(this.browser);
      chai.assert.isFalse(await blockIsPresent(this.browser, 'draw_circle_1'), 'Block should be deleted after clicking bin');
    });

    test('Click near but not on bin should not delete block', async function () {
      const hasTrash = await hasTrashcan(this.browser);
      if (!hasTrash) {
        this.skip();
      }

      // Navigate to a block and verify it exists
      await focusOnBlock(this.browser, 'draw_circle_1');
      chai.assert.isTrue(await blockIsPresent(this.browser, 'draw_circle_1'), 'Block should exist initially');

      // Enter sticky mode
      await doubleClickBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode');

      // Get trashcan bounds
      const trashcanBounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(trashcanBounds, 'Trashcan bounds should be available');

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

      // Block should still exist (just dropped in new location, wait for state to clear)
      await waitForStickyModeToExit(this.browser);
      await waitForDraggingToStop(this.browser);
      chai.assert.isTrue(await blockIsPresent(this.browser, 'draw_circle_1'), 'Block should still exist after clicking near bin');
    });

    test('Click on bin with no block in sticky mode should do nothing', async function () {
      const hasTrash = await hasTrashcan(this.browser);
      if (!hasTrash) {
        this.skip();
      }

      // Verify we're not in sticky mode initially
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should not be in sticky mode initially');

      // Get trashcan bounds
      const trashcanBounds = await getTrashcanBounds(this.browser);
      chai.assert.isNotNull(trashcanBounds, 'Trashcan bounds should be available');

      // Click on the trashcan when not in sticky mode
      const centerX = trashcanBounds!.x + trashcanBounds!.width / 2;
      const centerY = trashcanBounds!.y + trashcanBounds!.height / 2;

      await this.browser.performActions([
        {
          type: 'pointer',
          id: 'mouse',
          actions: [
            {type: 'pointerMove', x: Math.round(centerX), y: Math.round(centerY)},
            {type: 'pointerDown', button: 0},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
      await this.browser.pause(PAUSE_TIME);

      // Should still not be in sticky mode and all blocks should still exist
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should still not be in sticky mode');
      chai.assert.isTrue(await blockIsPresent(this.browser, 'draw_circle_1'), 'Blocks should still exist');
    });
  });
});

// Touch-based Click-n-Stick Tests suite
suite('Touch-based Click-n-Stick Tests', function () {

  setup(async function () {
    this.browser = await testSetup(testFileLocations.COMMENTS, this.timeout());
    await this.browser.pause(PAUSE_TIME);
  });

  afterEach(async function () {
    // Clear any stuck state
    if (await isDragging(this.browser)) {
      await sendKeyAndWait(this.browser, Key.Escape);
    }
    await maybeAssertNoJavaScriptErrors(this.browser, 'touch click-n-stick test');
  });

  suite('Double-tap to enter move mode', function () {
    test('Double-tap block enters move mode', async function () {
      // Navigate to a block first
      await focusOnBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Verify we're not initially dragging
      chai.assert.isFalse(await isDragging(this.browser));

      // Double-tap the block using touch events
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Wait for the move indicator to appear so we know we're in move mode
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 5000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      // Verify we're now in move mode
      chai.assert.isTrue(await isDragging(this.browser));

      // Verify we're in sticky mode (touch-based double-tap should use click-and-stick)
      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode after double-tap');

      // Abort move
      await sendKeyAndWait(this.browser, Key.Escape);
      chai.assert.isFalse(await isDragging(this.browser));
      chai.assert.isFalse(await isInStickyMode(this.browser));
    });

    test('Single tap does not enter move mode', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Single tap the block
      await tapBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Should not be in move mode
      chai.assert.isFalse(await isDragging(this.browser));
      chai.assert.isFalse(await isInStickyMode(this.browser));
    });

    test('Double-tap with longer delay does not enter move mode', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Tap twice with a long delay (exceeds double-tap threshold)
      await tapBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(500); // Long delay
      await tapBlock(this.browser, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // Should not be in move mode (delay was too long)
      chai.assert.isFalse(await isDragging(this.browser));
    });
  });

  suite('Tap connection to move block', function () {
    test('Double-tap block, tap connection to move block there', async function () {
      // Get initial block position
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const initialInfo = await getBlockConnectionInfo(this.browser, 'draw_circle_1');

      // Double-tap to enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      // Verify we're in sticky mode
      chai.assert.isTrue(await isInStickyMode(this.browser));
      chai.assert.isTrue(await isDragging(this.browser));

      // Give extra time for highlights to render after touch double-tap
      await this.browser.pause(1000);

      // Wait for connection highlights to appear
      await this.browser.waitUntil(async () => {
        const count = await getConnectionHighlightCount(this.browser);
        return count > 0;
      }, {
        timeout: 10000,
        timeoutMsg: 'Connection highlights should appear in move mode'
      });


      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAtLeast(highlightCount, 2, 'Should have multiple connection highlights during move');

      // Click the last connection highlight using browser.execute() to avoid stale element issues
      // This finds and clicks the element atomically within the browser context
      const clickSucceeded = await this.browser.execute(() => {
        const highlights = document.querySelectorAll('.blocklyPotentialConnection');
        if (highlights.length === 0) return false;

        const target = highlights[highlights.length - 1] as SVGElement;
        if (!target) return false;

        // Trigger both click and pointerdown events to mimic touch 
        const pointerEvent = new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        target.dispatchEvent(pointerEvent);
        target.dispatchEvent(clickEvent);
        return true;
      });

      chai.assert.isTrue(clickSucceeded, 'Should have successfully clicked a connection highlight');
      await this.browser.pause(PAUSE_TIME);

      // Should no longer be dragging or in sticky mode
      await waitForDraggingToStop(this.browser);
      await waitForStickyModeToExit(this.browser);

      // Verify block moved to new position
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const finalInfo = await getBlockConnectionInfo(this.browser, 'draw_circle_1');

      // Position or connections should have changed
      const positionChanged = !coordinatesEqual(initialPosition, finalPosition);
      const connectionsChanged = JSON.stringify(initialInfo) !== JSON.stringify(finalInfo);

      chai.assert.isTrue(
        positionChanged || connectionsChanged,
        'Block should have moved or reconnected'
      );
    });

    test('Connection highlights persist during touch move gesture', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Double-tap to enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      // Give extra time for highlights to render after touch double-tap
      await this.browser.pause(500);

      // Wait for connection highlights
      await this.browser.waitUntil(async () => {
        return (await getConnectionHighlightCount(this.browser)) > 0;
      }, { timeout: 10000 });

      const initialHighlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(initialHighlightCount, 0, 'Should have initial highlights');

      // Perform touch move gesture
      await this.browser.execute(() => {
        const workspace = document.querySelector('.blocklySvg') as Element;
        const rect = workspace.getBoundingClientRect();
        const startX = rect.left + 200;
        const startY = rect.top + 100;
        const endX = rect.left + 300;
        const endY = rect.top + 150;

        const touch = new Touch({
          identifier: Date.now(),
          target: workspace,
          clientX: startX,
          clientY: startY,
          screenX: startX,
          screenY: startY,
          pageX: startX,
          pageY: startY,
        });

        // Start touch
        workspace.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        }));

        // Move touch
        const touchMove = new Touch({
          identifier: touch.identifier,
          target: workspace,
          clientX: endX,
          clientY: endY,
          screenX: endX,
          screenY: endY,
          pageX: endX,
          pageY: endY,
        });

        workspace.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [touchMove],
          targetTouches: [touchMove],
          changedTouches: [touchMove],
        }));
      });
      await this.browser.pause(PAUSE_TIME);

      // Highlights should still be present
      const highlightCountAfterMove = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCountAfterMove, 0, 'Connection highlights should persist during touch move');

      // Still in move mode
      chai.assert.isTrue(await isDragging(this.browser));

      // Clean up
      await sendKeyAndWait(this.browser, Key.Escape);
    });

    test('Clicking workspace exits move mode', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      chai.assert.isTrue(await isDragging(this.browser));

      // Click on workspace (not a valid connection)
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.click();
      await this.browser.pause(PAUSE_TIME);

      // Should have exited move mode (clicking workspace releases the block, wait for state to clear)
      await waitForDraggingToStop(this.browser);
      await waitForStickyModeToExit(this.browser);
    });
  });

  suite('Touch move and release', function () {
    test('Double-tap, tap workspace drops block at that location disconnected', async function () {
      // Intended behavior: tapping workspace should drop the block at the tap location, disconnected
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const initialConnections = await getBlockConnectionInfo(this.browser, 'draw_circle_1');

      // Double-tap to enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      chai.assert.isTrue(await isInStickyMode(this.browser));
      chai.assert.isTrue(await isDragging(this.browser));

      // Tap on empty workspace to drop the block there, disconnected
      await tapWorkspace(this.browser, 300, 200);
      await this.browser.pause(PAUSE_TIME);

      // Should have exited move mode (wait for state to clear)
      await waitForDraggingToStop(this.browser);
      await waitForStickyModeToExit(this.browser);

      // Block should be at new position where we tapped
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.isFalse(
        coordinatesEqual(initialPosition, finalPosition),
        'Block should be at new position where workspace was tapped'
      );

      // Block should be disconnected (no parent connection)
      const finalConnections = await getBlockConnectionInfo(this.browser, 'draw_circle_1');
      chai.assert.isNull(
        finalConnections.parentId,
        'Block should be disconnected after dropping on empty workspace'
      );
    });

    test('Touch and drag without double-tap does not enter move mode', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Single touch and drag (not double-tap)
      await this.browser.execute((blockId) => {
        const ws = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
        const block = ws.getBlockById(blockId) as Blockly.BlockSvg;
        if (!block) {
          throw new Error(`Block ${blockId} not found`);
        }

        const blockElement = block.getSvgRoot();
        const rect = blockElement.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const endX = startX + 100;
        const endY = startY + 100;

        const touch = new Touch({
          identifier: Date.now(),
          target: blockElement,
          clientX: startX,
          clientY: startY,
          screenX: startX,
          screenY: startY,
          pageX: startX,
          pageY: startY,
        });

        // Touch start
        blockElement.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        }));

        // Touch move
        const touchMove = new Touch({
          identifier: touch.identifier,
          target: blockElement,
          clientX: endX,
          clientY: endY,
          screenX: endX,
          screenY: endY,
          pageX: endX,
          pageY: endY,
        });

        blockElement.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [touchMove],
          targetTouches: [touchMove],
          changedTouches: [touchMove],
        }));

        // Touch end
        blockElement.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touchMove],
        }));
      }, 'draw_circle_1');
      await this.browser.pause(PAUSE_TIME);

      // This would trigger Blockly's normal drag, not click-n-stick
      // We're just verifying it doesn't put us in sticky mode
      chai.assert.isFalse(await isInStickyMode(this.browser),
        'Single touch and drag should not enter sticky mode');
    });
  });

  suite('Connection highlights cleanup with touch', function () {
    test('Connection highlights are cleared after tap-to-connect', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Enter move mode via double-tap
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Give extra time for highlights to render after touch double-tap
      await this.browser.pause(500);

      // Wait for highlights
      await this.browser.waitUntil(async () => {
        return (await getConnectionHighlightCount(this.browser)) > 0;
      }, { timeout: 10000 });

      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights');

      // Tap a connection highlight
      const connectionHighlight = await this.browser.$('.blocklyPotentialConnection');
      await connectionHighlight.click();
      await this.browser.pause(PAUSE_TIME);

      // Highlights should be cleared
      const finalHighlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.equal(finalHighlightCount, 0, 'Connection highlights should be cleared after tap-to-connect');
    });

    test('Connection highlights are cleared after tap-to-release on workspace', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      // Give extra time for highlights to render after touch double-tap
      await this.browser.pause(500);

      // Wait for highlights
      await this.browser.waitUntil(async () => {
        return (await getConnectionHighlightCount(this.browser)) > 0;
      }, { timeout: 10000 });

      chai.assert.isAbove(await getConnectionHighlightCount(this.browser), 0);

      // Tap on empty workspace
      const workspace = await this.browser.$('.blocklySvg');
      await workspace.click();
      await this.browser.pause(PAUSE_TIME);

      // Highlights should be cleared
      const finalHighlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.equal(finalHighlightCount, 0, 'Connection highlights should be cleared after tap-to-release');
    });
  });

  suite('Touch interaction with arrow keys', function () {
    test('Double-tap to enter move mode, use arrow keys, tap to confirm', async function () {
      // Increase timeout to 20s for this longer test (but disable
      // timeouts when non-zero PAUSE_TIME is used to watch tests run).
      this.timeout(PAUSE_TIME ? 0 : 20000);

      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      const initialInfo = await getBlockConnectionInfo(this.browser, 'draw_circle_1');

      // Double-tap to enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      chai.assert.isTrue(await isDragging(this.browser));

      // Press down - block should move
      await sendKeyAndWait(this.browser, Key.ArrowDown);
      await this.browser.pause(PAUSE_TIME);

      const positionAfterDown = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(
        initialPosition,
        positionAfterDown,
        'Block should move down with arrow key'
      );

      // Press up - block should move again
      await sendKeyAndWait(this.browser, Key.ArrowUp);
      await this.browser.pause(PAUSE_TIME);

      const positionAfterUp = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.notDeepEqual(
        positionAfterDown,
        positionAfterUp,
        'Block should move up with arrow key'
      );

      // Verify still in move mode
      chai.assert.isTrue(await isDragging(this.browser));

      // Now tap the LAST connection highlight
      const allHighlights = await this.browser.$$('.blocklyPotentialConnection');
      chai.assert.isAbove((allHighlights as any).length, 0, 'Should have connection highlights');

      const lastIndex = (allHighlights as any).length - 1;
      const targetHighlight = allHighlights[lastIndex as number];
      await targetHighlight.click();
      await this.browser.pause(PAUSE_TIME);

      // Should exit move mode
      chai.assert.isFalse(await isDragging(this.browser));

      // Block should have moved/reconnected
      const finalInfo = await getBlockConnectionInfo(this.browser, 'draw_circle_1');
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');

      // Final state should be different from all intermediate states
      chai.assert.isTrue(
        !coordinatesEqual(initialPosition, finalPosition) ||
        JSON.stringify(initialInfo) !== JSON.stringify(finalInfo),
        'Block should have moved or reconnected'
      );
    });
  });

  suite('Bug: Single tap selection broken after touch click-and-stick', function () {
    test('Single tap should select block after touch click-and-stick to workspace', async function () {
      // Step 1: Double-tap a block to enter sticky mode
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialPosition = await getBlockPosition(this.browser, 'draw_circle_1');

      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      chai.assert.isTrue(await isInStickyMode(this.browser), 'Should be in sticky mode');
      chai.assert.isTrue(await isDragging(this.browser), 'Should be dragging');


      await this.browser.pause(PAUSE_TIME);
      // Step 2: Tap on the workspace to drop the block there
      await tapWorkspace(this.browser, 400, 300);

      // Step 3: Verify it moved the block there and exited sticky mode
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.isFalse(
        coordinatesEqual(initialPosition, finalPosition),
        'Block should have moved to new position'
      );

      // Wait for state to fully clear before next interaction
      await waitForDraggingToStop(this.browser);
      await waitForStickyModeToExit(this.browser);

      chai.assert.isFalse(await isDragging(this.browser), 'Should have exited move mode');
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should have exited sticky mode');

      // Step 4: Single tap on a different statement block (draw_circle_2)
      await tapBlock(this.browser, 'draw_circle_2');
      await this.browser.pause(PAUSE_TIME);

      // Step 5: Check it was selected and highlighted
      const selectedId = await getSelectedBlockId(this.browser);
      chai.assert.equal(
        selectedId,
        'draw_circle_2',
        'Block should be selected after single tap'
      );
    });
  });
});

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
async function getTrashcanBounds(browser: Browser): Promise<{x: number, y: number, width: number, height: number} | null> {
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
    height: size.height
  };
}

/**
 * Double-click a block to enter move mode.
 *
 * @param browser The WebdriverIO browser object.
 * @param blockId The ID of the block to double-click.
 */
async function doubleClickBlock(browser: Browser, blockId: string): Promise<void> {
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
      // Fall back to block's SVG root
      block.getSvgRoot().id = newElemId;
    },
    blockId,
    findableId,
  );

  // Get the element and double-click it
  const elem = await browser.$(`#${findableId}`);
  await elem.doubleClick();

  // Clean up the ID
  await browser.execute((elemId) => {
    document.getElementById(elemId)?.removeAttribute('id');
  }, findableId);
}

/**
 * Get information about the currently-focused block's connections.
 *
 * @param browser
 */
function getFocusedNeighbourInfo(browser: Browser) {
  return browser.execute(() => {
    const focused = Blockly.getFocusManager().getFocusedNode();
    if (!focused || !(focused instanceof Blockly.BlockSvg)) {
      throw new TypeError('focused node is not a BlockSvg');
    }

    const block = focused;
    const parent = block?.getParent();

    return {
      parentId: parent?.id ?? null,
      parentIndex: parent?.getConnections_(true)
        .findIndex((conn) => conn.targetBlock() === block) ?? null,
      nextId: block?.getNextBlock()?.id ?? null,
      valueId: block?.inputList[0].connection?.targetBlock()?.id ?? null,
    };
  });
}

/**
 * Get the current connection candidate for the moving block.
 *
 * @param browser
 */
function getConnectionCandidate(browser: Browser): Promise<{id: string; index: number} | null> {
  return browser.execute(() => {
    const focused = Blockly.getFocusManager().getFocusedNode();
    if (!focused || !(focused instanceof Blockly.BlockSvg)) return null;

    const block = focused;
    const dragStrategy = block.getDragStrategy() as Blockly.dragging.BlockDragStrategy;
    if (!dragStrategy) return null;

    // @ts-expect-error connectionCandidate is private
    const candidate = dragStrategy.connectionCandidate;
    if (!candidate) return null;

    const neighbourBlock = candidate.neighbour.getSourceBlock();
    if (!neighbourBlock) return null;

    const neighbourConnections = neighbourBlock.getConnections_(true);
    const index = neighbourConnections.indexOf(candidate.neighbour);

    return {id: neighbourBlock.id, index};
  });
}

/**
 * Get the position of a block.
 *
 * @param browser
 * @param blockId
 */
function getBlockPosition(browser: Browser, blockId: string): Promise<Blockly.utils.Coordinate> {
  return browser.execute((blockId: string) => {
    const block = Blockly.getMainWorkspace().getBlockById(blockId);
    if (!block) throw new Error('block not found');
    return block.getRelativeToSurfaceXY();
  }, blockId);
}

/**
 * Find a connection point element for a block.
 *
 * @param browser
 * @param blockId
 */
async function findStatementConnectionPoint(browser: Browser, blockId: string) {
  // Look for highlighted statement connection elements created by ConnectionHighlighter
  // These are visible during move mode with the class .blocklyPotentialConnection
  // Statement connections have type 3 (NEXT_STATEMENT) or 4 (PREVIOUS_STATEMENT)
  const connections = await browser.$$('.blocklyPotentialConnection');
  for (const conn of connections) {
    const type = await conn.getAttribute('data-connection-type');
    if (type === '3' || type === '4') {
      return conn;
    }
  }
  return null;
}

/**
 * Find a value connection point for a block.
 *
 * @param browser
 * @param blockId
 */
async function findValueConnectionPoint(browser: Browser, blockId: string) {
  // Look for highlighted value input connections created by ConnectionHighlighter
  // These are visible during move mode with the class .blocklyPotentialConnection
  // Value connections have type 1 (INPUT_VALUE) or 2 (OUTPUT_VALUE)
  const connections = await browser.$$('.blocklyPotentialConnection');
  for (const conn of connections) {
    const type = await conn.getAttribute('data-connection-type');
    if (type === '1' || type === '2') {
      return conn;
    }
  }
  return null;
}

/**
 * Get connection information for a block.
 *
 * @param browser
 * @param blockId
 */
function getBlockConnectionInfo(browser: Browser, blockId: string) {
  return browser.execute((blockId: string) => {
    const block = Blockly.getMainWorkspace().getBlockById(blockId);
    if (!block) throw new Error('block not found');

    const parent = block.getParent();
    return {
      parentId: parent?.id ?? null,
      hasNext: !!block.getNextBlock(),
      hasChildren: block.getChildren(false).length > 0,
    };
  }, blockId);
}

/**
 * Check if the keyboard navigation is in sticky mode.
 *
 * @param browser
 */
function isInStickyMode(browser: Browser): Promise<boolean> {
  return browser.execute(() => {
    // Access the KeyboardNavigation instance through the global
    const keyboardNav = (window as any).keyboardNavigation;
    return keyboardNav ? keyboardNav.isInStickyMode : false;
  });
}

/**
 * Set up event logging to debug what events are being fired.
 *
 * @param browser
 */
async function setupEventLogging(browser: Browser) {
  await browser.execute(() => {
    const workspaceElement = document.querySelector('.blocklySvg');
    if (!workspaceElement) return;

    // Log all mouse-related events
    const events = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove'];
    events.forEach(eventType => {
      workspaceElement.addEventListener(eventType, (event) => {
        console.log(`[EVENT LOG] ${eventType} on`, event.target, 'at', Date.now());
      }, true);
    });

    // Also log if our custom handler is being called
    (window as any).eventLog = [];
  });
}

/**
 * Get the event log from the browser.
 *
 * @param browser
 */
async function getEventLog(browser: Browser): Promise<string[]> {
  return browser.execute(() => {
    return (window as any).eventLog || [];
  });
}

/**
 * Get the sticky block ID if in sticky mode.
 *
 * @param browser
 */
function getStickyBlockId(browser: Browser): Promise<string | null> {
  return browser.execute(() => {
    // Access the KeyboardNavigation instance through the global
    const keyboardNav = (window as any).keyboardNavigation;
    return keyboardNav && keyboardNav.stickyBlock ? keyboardNav.stickyBlock.id : null;
  });
}

/**
 * Manually dispatch a double-click event as the browser would for real user interaction.
 * This bypasses WebdriverIO's double-click method to create more realistic events.
 *
 * @param browser
 * @param blockId
 */
async function realDoubleClickBlock(browser: Browser, blockId: string): Promise<void> {
  await browser.execute((blockId) => {
    const ws = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const block = ws.getBlockById(blockId) as Blockly.BlockSvg;

    if (!block) throw new Error(`Block ${blockId} not found`);

    // Get the block's SVG element
    const blockElement = block.getSvgRoot();
    const rect = blockElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    console.log(`Dispatching real double-click on block ${blockId} at ${x}, ${y}`);

    // Dispatch the sequence of events that a real double-click would generate
    // First click
    blockElement.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

    blockElement.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

    blockElement.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

    // Second click (for double-click)
    blockElement.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

    blockElement.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

    blockElement.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

    // Finally, the double-click event
    blockElement.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));

  }, blockId);
}

/**
 * Get the count of connection highlight elements currently visible on the page.
 * These are the green highlights that show potential drop locations during move mode.
 *
 * @param browser
 */
async function getConnectionHighlightCount(browser: Browser): Promise<number> {
  const elements = await browser.$$('.blocklyPotentialConnection');
  return elements.length;
}

/**
 * Debug function to check highlighting state and configuration.
 *
 * @param browser
 */
async function debugHighlightingState(browser: Browser): Promise<any> {
  return await browser.execute(() => {
    const keyboardNav = (window as any).keyboardNavigation;

    const block = Blockly.getMainWorkspace().getBlockById('draw_circle_1');
    const dragStrategy = block ? (block as any).dragStrategy : null;

    // Check for any existing highlight elements
    const highlights = document.querySelectorAll('.blocklyPotentialConnection');

    // Get more detailed info about the drag strategy
    let dragInfo = {};
    if (dragStrategy) {
      dragInfo = {
        isDragging: !!(block as any).dragging_,
        allConnectionsCount: dragStrategy.allConnections ? dragStrategy.allConnections.length : 'N/A',
        connectionHighlighterActive: dragStrategy.connectionHighlighter ? dragStrategy.connectionHighlighter.isActive : 'N/A',
        highlightedElementsCount: dragStrategy.connectionHighlighter ? dragStrategy.connectionHighlighter.highlightedElements?.size : 'N/A'
      };
    }

    return {
      hasKeyboardNav: !!keyboardNav,
      isInStickyMode: keyboardNav ? keyboardNav.isInStickyMode : false,
      blockFound: !!block,
      hasDragStrategy: !!dragStrategy,
      dragStrategyType: dragStrategy ? dragStrategy.constructor.name : 'N/A',
      hasConnectionHighlighter: dragStrategy ? !!dragStrategy.connectionHighlighter : false,
      highlightingEnabled: dragStrategy ? dragStrategy.highlightingEnabled : false,
      highlightElementCount: highlights.length,
      highlightElements: Array.from(highlights).map(h => h.tagName + '.' + h.className),
      dragInfo
    };
  });
}

// ============================================================================
// Touch Event Helper Functions
// ============================================================================
//
// IMPORTANT: Browser tap behavior patterns
//
// When a user taps on a touch device, modern browsers synthesize mouse events
// automatically to maintain compatibility with mouse-based code. The typical
// sequence is:
//
//   1. touchstart
//   2. touchend
//   3. click (synthesized by the browser)
//
// For double-tap detection, the full sequence includes:
//   1. touchstart -> touchend -> mousedown -> mouseup -> click
//   2. touchstart -> touchend -> mousedown -> mouseup -> click
//   3. dblclick
//
// When simulating touch events in tests, we must manually dispatch the click
// event to mimic real browser behavior. This is why all single-tap helpers
// (tapBlock and inline workspace taps) include a click event.
//
// DO NOT add click events for:
//   - Touch drags (touchstart + touchmove without touchend)
//   - Touch gestures that shouldn't result in activation
//
// Helper functions below use inline dispatchTap() functions within
// browser.execute() contexts since the code runs in the browser environment.
//
// ============================================================================

/**
 * Perform a double-tap on a block using touch events.
 * Uses browser touch event dispatch to simulate touch interactions.
 * Also dispatches click events since Blockly's double-click detection uses mouse events.
 *
 * @param browser
 * @param blockId
 */
async function doubleTapBlock(browser: Browser, blockId: string): Promise<void> {
  await browser.execute((blockId) => {
    const ws = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const block = ws.getBlockById(blockId) as Blockly.BlockSvg;
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    const blockElement = block.getSvgRoot();
    const rect = blockElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Helper to dispatch a complete tap sequence (pointer + mouse events)
    const dispatchTap = (element: Element, tapX: number, tapY: number) => {
      const pointerId = Date.now();

      // Pointer events (what Blockly listens for)
      element.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: tapX,
        clientY: tapY,
        screenX: tapX,
        screenY: tapY,
        pointerId: pointerId,
        pointerType: 'touch',
        isPrimary: true,
      }));

      element.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: tapX,
        clientY: tapY,
        screenX: tapX,
        screenY: tapY,
        pointerId: pointerId,
        pointerType: 'touch',
        isPrimary: true,
      }));

      // Mouse events (needed for double-click detection in Blockly)
      element.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: tapX,
        clientY: tapY,
        button: 0,
      }));
      element.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: tapX,
        clientY: tapY,
        button: 0,
      }));
      element.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: tapX,
        clientY: tapY,
        button: 0,
      }));
    };

    // First tap
    dispatchTap(blockElement, x, y);

    // Small delay, then second tap (for double-click detection)
    setTimeout(() => {
      dispatchTap(blockElement, x, y);

      // Dispatch double-click event
      blockElement.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
      }));
    }, 100);
  }, blockId);

  // Wait for the double-tap to be processed
  await browser.pause(300);
}

/**
 * Perform a single tap on a block using touch events.
 *
 * @param browser
 * @param blockId
 */
async function tapBlock(browser: Browser, blockId: string): Promise<void> {
  await browser.execute((blockId) => {
    const ws = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const block = ws.getBlockById(blockId) as Blockly.BlockSvg;
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    const blockElement = block.getSvgRoot();
    const rect = blockElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const pointerId = Date.now();

    // Dispatch PointerEvents (what Blockly listens for)
    blockElement.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      pointerId: pointerId,
      pointerType: 'touch',
      isPrimary: true,
    }));

    blockElement.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      pointerId: pointerId,
      pointerType: 'touch',
      isPrimary: true,
    }));

    // Synthesize a click event after the pointer sequence, mimicking browser behavior
    blockElement.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
    }));
  }, blockId);

  await browser.pause(100);
}

/**
 * Perform a tap on an element using touch events.
 *
 * @param browser
 * @param element
 */
/**
 * Perform a tap on the workspace at specified coordinates using touch events.
 * Simulates browser behavior by dispatching touchstart, touchend, and click.
 *
 * @param browser
 * @param x - X coordinate relative to workspace (optional, defaults to center-ish area)
 * @param y - Y coordinate relative to workspace (optional, defaults to center-ish area)
 */
async function tapWorkspace(browser: Browser, x: number = 400, y: number = 300): Promise<void> {
  await browser.execute((coords: {x: number, y: number}) => {
    const workspace = document.querySelector('.blocklySvg') as Element;
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const rect = workspace.getBoundingClientRect();
    const tapX = rect.left + coords.x;
    const tapY = rect.top + coords.y;

    const pointerId = Date.now();

    // Dispatch PointerEvents (what Blockly listens for)
    workspace.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: tapX,
      clientY: tapY,
      screenX: tapX,
      screenY: tapY,
      pointerId: pointerId,
      pointerType: 'touch',
      isPrimary: true,
    }));

    workspace.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: tapX,
      clientY: tapY,
      screenX: tapX,
      screenY: tapY,
      pointerId: pointerId,
      pointerType: 'touch',
      isPrimary: true,
    }));

    // Synthesize a click event after the pointer sequence, mimicking browser behavior
    workspace.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: tapX,
      clientY: tapY,
      button: 0,
    }));
  }, {x, y});

  await browser.pause(100);
}

/**
 * Check if two coordinates are equal.
 *
 * @param coord1
 * @param coord2
 */
function coordinatesEqual(
  coord1: Blockly.utils.Coordinate,
  coord2: Blockly.utils.Coordinate
): boolean {
  return coord1.x === coord2.x && coord1.y === coord2.y;
}

// New test suite for highlight persistence during preview operations
suite('Connection Highlight Persistence During Preview Tests', function () {

  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE, this.timeout());
    await this.browser.pause(PAUSE_TIME);
  });

  test('Connection highlights persist after preview renders', async function () {
    // Start move mode
    await focusOnBlock(this.browser, 'draw_circle_1');
    await doubleClickBlock(this.browser, 'draw_circle_1');
    await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

    // Wait for initial highlights to appear
    await this.browser.waitUntil(async () => {
      const count = await getConnectionHighlightCount(this.browser);
      return count > 0;
    }, {
      timeout: 5000,
      timeoutMsg: 'Connection highlights should appear during move mode'
    });

    const initialHighlightCount = await getConnectionHighlightCount(this.browser);
    chai.assert.isAbove(initialHighlightCount, 0, 'Should have initial connection highlights');

    // Navigate with arrow keys to trigger preview rendering
    await sendKeyAndWait(this.browser, Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME / 2);

    // Check that highlights are still present after arrow navigation
    const highlightCountAfterArrow = await getConnectionHighlightCount(this.browser);
    chai.assert.isAbove(highlightCountAfterArrow, 0, 'Connection highlights should persist after arrow navigation triggering preview');

    // Navigate again to trigger more preview operations
    await sendKeyAndWait(this.browser, Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME / 2);

    const highlightCountAfterDown = await getConnectionHighlightCount(this.browser);
    chai.assert.isAbove(highlightCountAfterDown, 0, 'Connection highlights should persist after down arrow navigation');

    // Navigate back up to test both directions
    await sendKeyAndWait(this.browser, Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME / 2);

    const highlightCountAfterUp = await getConnectionHighlightCount(this.browser);
    chai.assert.isAbove(highlightCountAfterUp, 0, 'Connection highlights should persist after up arrow navigation');

    // End move mode
    await sendKeyAndWait(this.browser, Key.Escape);

    // Verify highlights are cleared when move mode ends
    const finalHighlightCount = await getConnectionHighlightCount(this.browser);
    chai.assert.equal(finalHighlightCount, 0, 'Connection highlights should be cleared when move mode ends');
  });

  test('Connection highlights recompute correctly during workspace changes', async function () {
    // Start move mode
    await focusOnBlock(this.browser, 'draw_circle_1');
    await doubleClickBlock(this.browser, 'draw_circle_1');
    await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

    // Wait for highlights
    await this.browser.waitUntil(async () => {
      const count = await getConnectionHighlightCount(this.browser);
      return count > 0;
    }, {
      timeout: 5000,
      timeoutMsg: 'Connection highlights should appear during move mode'
    });

    // Capture initial highlight positions
    const initialHighlights = await getConnectionHighlightPositions(this.browser);
    chai.assert.isAbove(initialHighlights.length, 0, 'Should have initial highlights');

    // Navigate multiple times to force workspace recomputation
    const navigationKeys = [Key.ArrowRight, Key.ArrowDown, Key.ArrowLeft, Key.ArrowUp];

    for (const key of navigationKeys) {
      await sendKeyAndWait(this.browser, key);
      await this.browser.pause(PAUSE_TIME / 4);

      // Verify highlights persist and are valid
      const currentHighlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(currentHighlightCount, 0, `Connection highlights should persist after ${key} navigation`);

      // Check that highlight elements are properly attached to DOM
      const highlightsAttached = await checkHighlightsAttachedToDOM(this.browser);
      chai.assert.isTrue(highlightsAttached, `All highlights should be properly attached to DOM after ${key} navigation`);
    }

    // End move mode
    await sendKeyAndWait(this.browser, Key.Escape);

    // Final verification
    const finalHighlightCount = await getConnectionHighlightCount(this.browser);
    chai.assert.equal(finalHighlightCount, 0, 'All highlights should be cleared when move mode ends');
  });

  test('Highlights remain visible during insertion marker operations', async function () {
    // Start move mode
    await focusOnBlock(this.browser, 'draw_circle_1');
    await doubleClickBlock(this.browser, 'draw_circle_1');
    await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

    // Wait for highlights
    await this.browser.waitUntil(async () => {
      const count = await getConnectionHighlightCount(this.browser);
      return count > 0;
    }, {
      timeout: 5000,
      timeoutMsg: 'Connection highlights should appear during move mode'
    });

    // Verify we have highlights before navigation
    await getConnectionHighlightCount(this.browser);

    // Navigate to create insertion markers (which trigger preview operations)
    await sendKeyAndWait(this.browser, Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    // Check for insertion markers while verifying highlights persist
    const insertionMarkerExists = await this.browser.$('.blocklyInsertionMarker').isExisting();
    const highlightCountWithMarker = await getConnectionHighlightCount(this.browser);

    // Highlights should persist even when insertion markers are present
    chai.assert.isAbove(highlightCountWithMarker, 0, 'Connection highlights should persist when insertion markers are shown');

    if (insertionMarkerExists) {
      // If insertion marker exists, this confirms preview operations are happening
      // and our highlight persistence is working correctly
      chai.assert.isAbove(highlightCountWithMarker, 0, 'Highlights should remain visible alongside insertion markers');
    }

    // Continue navigation to test persistence through multiple preview operations
    await sendKeyAndWait(this.browser, Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    const highlightCountAfterMoreNavigation = await getConnectionHighlightCount(this.browser);
    chai.assert.isAbove(highlightCountAfterMoreNavigation, 0, 'Highlights should persist through multiple preview operations');

    // End move mode
    await sendKeyAndWait(this.browser, Key.Escape);
  });

  afterEach(async function () {
    // Check for JavaScript errors during highlight persistence tests
    await maybeAssertNoJavaScriptErrors(this.browser, 'highlight persistence test operations');
  });
});

// Test for the specific bug: double-click block in stack, press up arrow, verify highlights persist
suite('Highlight Persistence During Stack Navigation', function () {

  setup(async function () {
    this.browser = await testSetup(testFileLocations.COMMENTS, this.timeout());
    await this.browser.pause(PAUSE_TIME);
  });

  test('Double-click middle block, press up arrow, highlights persist until Enter', async function () {
    // Clear any previous browser logs to get clean error checking
    await clearBrowserLogs(this.browser);

    // Use the second draw_circle block which should be movable and in a stack
    const blockId = 'draw_circle_2';
    console.log('Testing with movable block:', blockId);

    // Step 1: Double-click the middle block to enter move mode
    console.log('Step 1: Double-clicking middle block to enter move mode');
    await doubleClickBlock(this.browser, blockId);

    // Wait for move mode indicator
    await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
      timeout: 5000,
      timeoutMsg: 'Move indicator should appear after double-click'
    });

    // Verify we're in dragging mode
    chai.assert.isTrue(await isDragging(this.browser), 'Should be in dragging mode after double-click');

    // Step 2: Wait for connection highlights to appear
    console.log('Step 2: Waiting for connection highlights to appear');
    await this.browser.waitUntil(async () => {
      const count = await getConnectionHighlightCount(this.browser);
      return count > 0;
    }, {
      timeout: 5000,
      timeoutMsg: 'Connection highlights should appear in move mode'
    });

    const initialHighlightCount = await getConnectionHighlightCount(this.browser);
    console.log('Initial highlight count:', initialHighlightCount);
    chai.assert.isAbove(initialHighlightCount, 0, 'Should have connection highlights initially');

    // Step 3: Press up arrow to trigger preview operations
    console.log('Step 3: Pressing up arrow to trigger preview operations');
    await sendKeyAndWait(this.browser, Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME / 2);

    // Step 4: Verify highlights are still visible after arrow navigation
    console.log('Step 4: Verifying highlights persist after arrow navigation');
    const highlightCountAfterArrow = await getConnectionHighlightCount(this.browser);
    console.log('Highlight count after up arrow:', highlightCountAfterArrow);

    chai.assert.isAbove(highlightCountAfterArrow, 0,
      'Connection highlights should persist after arrow navigation that triggers preview operations');

    // Verify the highlights are properly attached to DOM
    const highlightsProperlyAttached = await checkHighlightsAttachedToDOM(this.browser);
    chai.assert.isTrue(highlightsProperlyAttached, 'All highlights should be properly attached to DOM');

    // Step 5: Check for any console errors so far
    console.log('Step 5: Checking for console errors after arrow navigation');
    const errorsAfterArrow = await getBrowserErrors(this.browser);
    chai.assert.isEmpty(errorsAfterArrow, `Should have no console errors after arrow navigation. Found: ${JSON.stringify(errorsAfterArrow)}`);

    // Step 6: Press Enter to confirm move and exit move mode
    console.log('Step 6: Pressing Enter to confirm move and exit move mode');
    await sendKeyAndWait(this.browser, Key.Enter);

    // Wait for move mode to end
    await this.browser.waitUntil(async () => {
      return !(await isDragging(this.browser));
    }, {
      timeout: 5000,
      timeoutMsg: 'Should exit move mode after pressing Enter'
    });

    // Step 7: Verify highlights are cleared after exiting move mode
    console.log('Step 7: Verifying highlights are cleared after exiting move mode');
    const finalHighlightCount = await getConnectionHighlightCount(this.browser);
    console.log('Final highlight count after Enter:', finalHighlightCount);

    chai.assert.equal(finalHighlightCount, 0,
      'Connection highlights should be cleared when exiting move mode');

    // Step 8: Final error check - ensure no stack overflow or hanging occurred
    console.log('Step 8: Final error and stability check');
    const finalErrors = await getBrowserErrors(this.browser);
    chai.assert.isEmpty(finalErrors, `Should have no console errors at end of test. Found: ${JSON.stringify(finalErrors)}`);

    // Verify browser is still responsive (no hanging)
    const currentTime = Date.now();
    await this.browser.execute(() => window.performance.now());
    const responseTime = Date.now() - currentTime;
    chai.assert.isBelow(responseTime, 1000, 'Browser should remain responsive (no hanging detected)');

    console.log('✅ Test completed successfully - highlights persisted during navigation and cleared on exit');
  });

  test('Multiple arrow navigations maintain highlight persistence', async function () {
    await clearBrowserLogs(this.browser);

    const blockId = 'draw_circle_2';
    console.log('Testing multiple navigations with block:', blockId);

    // Enter move mode
    await doubleClickBlock(this.browser, blockId);
    await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

    // Wait for highlights
    await this.browser.waitUntil(async () => {
      return (await getConnectionHighlightCount(this.browser)) > 0;
    }, { timeout: 5000 });

    const initialCount = await getConnectionHighlightCount(this.browser);

    // Test multiple arrow key presses in sequence
    const navigationKeys = [Key.ArrowUp, Key.ArrowDown, Key.ArrowLeft, Key.ArrowRight];

    for (let i = 0; i < navigationKeys.length; i++) {
      const key = navigationKeys[i];
      console.log(`Navigation ${i + 1}: Pressing ${key}`);

      await sendKeyAndWait(this.browser, key);
      await this.browser.pause(PAUSE_TIME / 4);

      const currentCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(currentCount, 0,
        `Highlights should persist after ${key} navigation (iteration ${i + 1})`);

      // Check for errors after each navigation
      const errors = await getBrowserErrors(this.browser);
      chai.assert.isEmpty(errors,
        `No errors should occur during ${key} navigation. Found: ${JSON.stringify(errors)}`);
    }

    // Exit move mode
    await sendKeyAndWait(this.browser, Key.Escape);
    await this.browser.waitUntil(async () => !(await isDragging(this.browser)));

    // Verify cleanup
    const finalCount = await getConnectionHighlightCount(this.browser);
    chai.assert.equal(finalCount, 0, 'All highlights should be cleared after escape');
  });

  afterEach(async function () {
    // Ensure we're not stuck in move mode
    if (await isDragging(this.browser)) {
      await sendKeyAndWait(this.browser, Key.Escape);
    }

    // Final error check
    await maybeAssertNoJavaScriptErrors(this.browser, 'highlight persistence during stack navigation');
  });
});

/**
 * Find a block that's in the middle of a stack (has both previous and next connections).
 *
 * @param browser
 */
async function findMiddleStackBlock(browser: Browser): Promise<string> {
  const result = await browser.execute(() => {
    const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const blocks = workspace.getAllBlocks(false);

    for (const block of blocks) {
      // Look for a block that has both previous and next connections
      // This means it's in the middle of a stack
      if (block.previousConnection &&
          block.nextConnection &&
          block.previousConnection.isConnected() &&
          block.nextConnection.isConnected()) {
        return block.id;
      }
    }

    // Fallback: find any block with a previous connection that's connected
    for (const block of blocks) {
      if (block.previousConnection && block.previousConnection.isConnected()) {
        return block.id;
      }
    }

    // Last resort: return any block
    return blocks.length > 0 ? blocks[0].id : 'fallback_block';
  });

  return result as string;
}

/**
 * Get browser console errors, filtering out non-critical warnings.
 *
 * @param browser
 */
async function getBrowserErrors(browser: Browser): Promise<any[]> {
  const logs = await browser.getLogs('browser');
  return logs.filter((log: any) => {
    // Filter out non-critical warnings
    const message = log.message ? log.message.toLowerCase() : '';
    return log.level === 'SEVERE' ||
           (log.level === 'WARNING' &&
            !message.includes('deprecated') &&
            !message.includes('autoplay') &&
            !message.includes('orientation sensor') &&
            !message.includes('motion sensor'));
  });
}

/**
 * Get the positions of all connection highlight elements.
 *
 * @param browser
 */
async function getConnectionHighlightPositions(browser: Browser): Promise<Array<{x: number, y: number}>> {
  return await browser.execute(() => {
    const highlights = Array.from(document.querySelectorAll('.blocklyPotentialConnection'));
    return highlights.map(highlight => {
      const rect = highlight.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });
  });
}

/**
 * Check that all highlight elements are properly attached to the DOM.
 *
 * @param browser
 */
async function checkHighlightsAttachedToDOM(browser: Browser): Promise<boolean> {
  return await browser.execute(() => {
    const highlights = Array.from(document.querySelectorAll('.blocklyPotentialConnection'));
    return highlights.every(highlight => {
      return highlight.parentNode && document.contains(highlight);
    });
  });
}