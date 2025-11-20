/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Maze game with keyboard navigation support.
 * Simple maze game adapted from blockly-games.
 */

import * as Blockly from 'blockly/core';
import {javascriptGenerator} from 'blockly/javascript';
import {KeyboardNavigation} from '../../src/index';
import {registerFlyoutCursor} from '../../src/flyout_cursor';
import {registerNavigationDeferringToolbox} from '../../src/navigation_deferring_toolbox';
import {registerMazeBlocks} from './blocks';
import {MazeGame} from './maze';

// Register maze-specific blocks
registerMazeBlocks();

// CRITICAL: Register keyboard navigation components BEFORE Blockly injection
KeyboardNavigation.registerKeyboardNavigationStyles();
registerFlyoutCursor();
registerNavigationDeferringToolbox();

// Toolbox configuration
const toolbox = {
  kind: 'flyoutToolbox',
  contents: [
    {
      kind: 'block',
      type: 'maze_moveForward',
    },
    {
      kind: 'block',
      type: 'maze_turn',
    },
    {
      kind: 'block',
      type: 'maze_if',
    },
    {
      kind: 'block',
      type: 'maze_ifElse',
    },
    {
      kind: 'block',
      type: 'maze_forever',
    },
  ],
};

// Initialize Blockly workspace
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolbox,
  trashcan: true,
  zoom: {
    controls: true,
    wheel: true,
    startScale: 1.0,
    maxScale: 3,
    minScale: 0.3,
    scaleSpeed: 1.2,
  },
  move: {
    scrollbars: true,
    drag: true,
    wheel: true,
  },
});

// Initialize keyboard navigation plugin
const keyboardNavigation = new KeyboardNavigation(workspace, {
  highlightConnections: true,
});

// Initialize maze game
const mazeGame = new MazeGame('mazeCanvas', 1);

console.log('Maze game initialized with keyboard navigation support');

// Run button handler
document.getElementById('runButton')?.addEventListener('click', () => {
  const code = javascriptGenerator.workspaceToCode(workspace);
  mazeGame.execute(code);
});

// Reset button handler
document.getElementById('resetButton')?.addEventListener('click', () => {
  mazeGame.reset();
});

console.log('Maze game initialized with keyboard navigation support');
