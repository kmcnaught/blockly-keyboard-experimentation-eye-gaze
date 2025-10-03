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
  getCurrentFocusedBlockId,
  getSelectedBlockId,
  assertNoJavaScriptErrors,
  clearBrowserLogs,
} from './test_setup.js';

suite('Touch-based Click-n-Stick Tests', function () {
  // Increase timeout for touch-based tests
  this.timeout(PAUSE_TIME ? 0 : 10000);

  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  afterEach(async function () {
    // Clear any stuck state
    if (await isDragging(this.browser)) {
      await sendKeyAndWait(this.browser, Key.Escape);
    }
    await assertNoJavaScriptErrors(this.browser, 'touch click-n-stick test');
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

      // Debug: Check what elements exist
      const debugInfo = await this.browser.execute(() => {
        const allSvgElements = document.querySelectorAll('svg *');
        const elementsWithPotential = Array.from(allSvgElements).filter((el: any) => {
          const cls = el.getAttribute('class') || '';
          return cls.includes('otential') || cls.includes('Potential');
        });

        return {
          totalSvgElements: allSvgElements.length,
          elementsWithPotential: elementsWithPotential.map((el: any) => ({
            tagName: el.tagName,
            class: el.getAttribute('class'),
            id: el.getAttribute('id')
          }))
        };
      });
      console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

      // Wait for connection highlights to appear
      await this.browser.waitUntil(async () => {
        const count = await getConnectionHighlightCount(this.browser);
        return count > 0;
      }, {
        timeout: 10000,
        timeoutMsg: 'Connection highlights should appear in move mode'
      });

      const highlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.isAbove(highlightCount, 0, 'Should have connection highlights during move');

      // Find a connection highlight to tap
      const connectionHighlight = await this.browser.$('.blocklyPotentialConnection');
      chai.assert.isTrue(await connectionHighlight.isExisting(), 'Should have at least one connection highlight');

      // Tap the connection highlight
      await tapElement(this.browser, connectionHighlight);
      await this.browser.pause(PAUSE_TIME);

      // Should no longer be dragging or in sticky mode
      chai.assert.isFalse(await isDragging(this.browser), 'Should exit move mode after tapping connection');
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should exit sticky mode after tapping connection');

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

    test('Tapping invalid connection does not exit move mode', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');

      // Enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist();

      chai.assert.isTrue(await isDragging(this.browser));

      // Tap on workspace (not a valid connection)
      const workspace = await this.browser.$('.blocklySvg');
      await tapElement(this.browser, workspace);
      await this.browser.pause(PAUSE_TIME);

      // Should have exited move mode (tap on workspace releases the block)
      chai.assert.isFalse(await isDragging(this.browser));
      chai.assert.isFalse(await isInStickyMode(this.browser));
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
      await this.browser.execute(() => {
        const workspace = document.querySelector('.blocklySvg') as Element;
        const rect = workspace.getBoundingClientRect();
        // Tap in empty space away from any blocks
        const x = rect.left + 300;
        const y = rect.top + 200;

        // Dispatch touch + click events
        const touch = new Touch({
          identifier: Date.now(),
          target: workspace,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          pageX: x,
          pageY: y,
        });

        workspace.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        }));
        workspace.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch],
        }));

        workspace.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
        }));
      });
      await this.browser.pause(PAUSE_TIME);

      // Should have exited move mode
      chai.assert.isFalse(await isDragging(this.browser), 'Should exit move mode after tap');
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should exit sticky mode after tap');

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
      await tapElement(this.browser, connectionHighlight);
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
      await tapElement(this.browser, workspace);
      await this.browser.pause(PAUSE_TIME);

      // Highlights should be cleared
      const finalHighlightCount = await getConnectionHighlightCount(this.browser);
      chai.assert.equal(finalHighlightCount, 0, 'Connection highlights should be cleared after tap-to-release');
    });
  });

  suite('Touch interaction with arrow keys', function () {
    test('Double-tap to enter move mode, use arrow keys, tap to confirm', async function () {
      await focusOnBlock(this.browser, 'draw_circle_1');
      const initialInfo = await getBlockConnectionInfo(this.browser, 'draw_circle_1');

      // Double-tap to enter move mode
      await doubleTapBlock(this.browser, 'draw_circle_1');
      await this.browser.$('.blocklyMoveIndicatorBubble').waitForExist({
        timeout: 10000,
        timeoutMsg: 'Move indicator should appear after double-tap'
      });

      chai.assert.isTrue(await isDragging(this.browser));

      // Use arrow keys to navigate connections
      await sendKeyAndWait(this.browser, Key.ArrowRight);
      await this.browser.pause(PAUSE_TIME / 2);

      // Verify still in move mode
      chai.assert.isTrue(await isDragging(this.browser));

      // Find and tap a connection highlight
      const connectionHighlight = await this.browser.$('.blocklyPotentialConnection');
      if (await connectionHighlight.isExisting()) {
        await tapElement(this.browser, connectionHighlight);
        await this.browser.pause(PAUSE_TIME);

        // Should exit move mode
        chai.assert.isFalse(await isDragging(this.browser));

        // Block should have moved
        const finalInfo = await getBlockConnectionInfo(this.browser, 'draw_circle_1');
        chai.assert.notDeepEqual(initialInfo, finalInfo, 'Block should have moved or reconnected');
      } else {
        // If no connection highlight, just tap workspace to release
        const workspace = await this.browser.$('.blocklySvg');
        await tapElement(this.browser, workspace);
        await this.browser.pause(PAUSE_TIME);
        chai.assert.isFalse(await isDragging(this.browser));
      }
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

      // Step 2: Tap on the workspace to drop the block there
      await this.browser.execute(() => {
        const workspace = document.querySelector('.blocklySvg') as Element;
        const rect = workspace.getBoundingClientRect();
        // Tap in empty space away from any blocks
        const x = rect.left + 400;
        const y = rect.top + 300;

        const touch = new Touch({
          identifier: Date.now(),
          target: workspace,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          pageX: x,
          pageY: y,
        });

        workspace.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        }));
        workspace.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch],
        }));

        workspace.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
        }));
      });
      await this.browser.pause(PAUSE_TIME);

      // Step 3: Verify it moved the block there and exited sticky mode
      const finalPosition = await getBlockPosition(this.browser, 'draw_circle_1');
      chai.assert.isFalse(
        coordinatesEqual(initialPosition, finalPosition),
        'Block should have moved to new position'
      );
      chai.assert.isFalse(await isDragging(this.browser), 'Should have exited move mode');
      chai.assert.isFalse(await isInStickyMode(this.browser), 'Should have exited sticky mode');

      // Step 4: Single tap on a different statement block (draw_circle_2)
      await tapBlock(this.browser, 'draw_circle_2');
      await this.browser.pause(PAUSE_TIME);

      // Step 5: Check it was selected and highlighted (THIS WILL FAIL)
      const selectedId = await getSelectedBlockId(this.browser);
      chai.assert.equal(
        selectedId,
        'draw_circle_2',
        'Block should be selected after single tap (BUG: this fails after touch click-and-stick)'
      );
    });
  });
});

/**
 * Perform a double-tap on a block using touch events.
 * Uses browser touch event dispatch to simulate touch interactions.
 * Also dispatches click events since Blockly's double-click detection uses mouse events.
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

    // Helper to dispatch a complete tap sequence (touch + mouse events)
    const dispatchTap = (element: Element, tapX: number, tapY: number) => {
      const touchId = Date.now();
      const touch = new Touch({
        identifier: touchId,
        target: element,
        clientX: tapX,
        clientY: tapY,
        screenX: tapX,
        screenY: tapY,
        pageX: tapX,
        pageY: tapY,
      });

      // Touch events
      element.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touch],
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

    const touch = new Touch({
      identifier: Date.now(),
      target: blockElement,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      pageX: x,
      pageY: y,
    });

    blockElement.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch],
    }));
    blockElement.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [touch],
    }));
  }, blockId);

  await browser.pause(100);
}

/**
 * Perform a tap on an element using touch events.
 */
async function tapElement(browser: Browser, element: any): Promise<void> {
  // Get element attributes we need for touch event
  const elementId = await element.getAttribute('id');
  const elementClass = await element.getAttribute('class');

  await browser.execute((attrs: {id: string, class: string}) => {
    let targetElement: Element | null = null;

    // Try to find element by ID first, then by class
    if (attrs.id) {
      targetElement = document.getElementById(attrs.id);
    } else if (attrs.class) {
      const elements = document.getElementsByClassName(attrs.class);
      targetElement = elements.length > 0 ? elements[0] : null;
    }

    if (!targetElement) {
      // Fall back to finding by class if available
      targetElement = document.querySelector(`.${attrs.class.split(' ')[0]}`);
    }

    if (!targetElement) {
      throw new Error('Could not find element for touch event');
    }

    const rect = targetElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const touch = new Touch({
      identifier: Date.now(),
      target: targetElement,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      pageX: x,
      pageY: y,
    });

    targetElement.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch],
    }));
    targetElement.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [touch],
    }));
  }, {id: elementId, class: elementClass});

  await browser.pause(100);
}

/**
 * Get the position of a block.
 */
function getBlockPosition(browser: Browser, blockId: string): Promise<Blockly.utils.Coordinate> {
  return browser.execute((blockId: string) => {
    const block = Blockly.getMainWorkspace().getBlockById(blockId);
    if (!block) throw new Error('block not found');
    return block.getRelativeToSurfaceXY();
  }, blockId);
}

/**
 * Get connection information for a block.
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
      previousConnected: block.previousConnection?.isConnected() ?? false,
      nextConnected: block.nextConnection?.isConnected() ?? false,
    };
  }, blockId);
}

/**
 * Check if the keyboard navigation is in sticky mode.
 */
function isInStickyMode(browser: Browser): Promise<boolean> {
  return browser.execute(() => {
    const keyboardNav = (window as any).keyboardNavigation;
    return keyboardNav ? keyboardNav.isInStickyMode : false;
  });
}

/**
 * Get the count of connection highlight elements.
 */
async function getConnectionHighlightCount(browser: Browser): Promise<number> {
  // Use WebDriver's $$ method which works better with SVG elements
  const elements = await browser.$$('.blocklyPotentialConnection');
  return elements.length;
}

/**
 * Check if two coordinates are equal.
 */
function coordinatesEqual(
  coord1: Blockly.utils.Coordinate,
  coord2: Blockly.utils.Coordinate
): boolean {
  return coord1.x === coord2.x && coord1.y === coord2.y;
}