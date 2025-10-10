/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';

import p5 from 'p5';
import {javascriptGenerator} from 'blockly/javascript';
import {ShortcutRegistry} from 'blockly';
import {utils as BlocklyUtils} from 'blockly';

/**
 *  Run generated p5.js code in the keyboard navigation test page.
 */
export function runCode() {
  const code = javascriptGenerator.workspaceToCode(Blockly.getMainWorkspace());
  const p5outputDiv = document.getElementById('p5output');
  if (p5outputDiv) {
    // Check if the code contains a setup function - if not, it's incomplete
    if (!code.includes('sketch.setup')) {
      console.debug('P5 code incomplete - no setup block found, skipping render');
      return;
    }

    // Preserve the overlay element before clearing
    const overlay = document.getElementById('canvasOverlay');
    const overlayParent = overlay?.parentElement;

    // Clear the old canvas
    p5outputDiv.innerHTML = '';

    // Restore the overlay if it existed
    if (overlay && overlayParent === p5outputDiv) {
      p5outputDiv.appendChild(overlay);
    }

    // Run P5 in instance mode. The name 'sketch' matches the name used
    // in the generator for all of the p5 blocks.
    // eslint-disable-next-line new-cap
    new p5((sketch) => {
      try {
        eval(code);
      } catch (error) {
        // Silently catch errors during code evaluation (e.g., incomplete code during drag)
        console.debug('P5 code evaluation error (likely incomplete code):', error);
      }
    }, p5outputDiv);
  }
}

/**
 * Register a shortcut under Shift+R to run code in the test page.
 *
 * @param runCallback - Optional callback to run instead of the default runCode function.
 */
export function registerRunCodeShortcut(runCallback?: () => void) {
  const callback = runCallback || runCode;
  const runCodeShortcut = {
    name: 'Run code',
    preconditionFn: (workspace: Blockly.WorkspaceSvg) => {
      return true;
    },
    callback: (workspace: Blockly.WorkspaceSvg) => {
      callback();
      return true;
    },
  };

  ShortcutRegistry.registry.register(runCodeShortcut);
  const shiftR = ShortcutRegistry.registry.createSerializedKey(
    BlocklyUtils.KeyCodes.R,
    [BlocklyUtils.KeyCodes.SHIFT],
  );
  ShortcutRegistry.registry.addKeyMapping(shiftR, runCodeShortcut.name);
}
