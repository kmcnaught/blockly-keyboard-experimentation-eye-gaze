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
import {loadMessages, getBrowserLocale, type SupportedLocale} from './messages';

// Initialize locale (browser detection or saved preference)
let currentLocale: SupportedLocale =
  (localStorage.getItem('mazeGameLocale') as SupportedLocale) || getBrowserLocale();

// Load internationalized messages
loadMessages(currentLocale);

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

// Initialize maze game (load saved skin or default to 0)
const savedSkin = parseInt(localStorage.getItem('mazeGameSkin') || '0', 10);
const mazeGame = new MazeGame('mazeCanvas', 1, savedSkin);

// Level titles for each level
const levelTitles = [
  'Straight Path',
  'Single Turn',
  'Multiple Turns',
  'S-Curve',
  'T-Junction',
  'Zigzag Path',
  'Decision Points',
  'Complex Maze',
];

// Update level display
function updateLevelDisplay() {
  const currentLevel = mazeGame.getLevel();
  const maxLevel = MazeGame.getMaxLevel();

  const levelTitle = document.getElementById('levelTitle');
  const levelDisplay = document.getElementById('levelDisplay');
  const prevButton = document.getElementById('prevLevel') as HTMLButtonElement;
  const nextButton = document.getElementById('nextLevel') as HTMLButtonElement;

  if (levelTitle) {
    levelTitle.textContent = `Level ${currentLevel}: ${levelTitles[currentLevel - 1]}`;
  }

  if (levelDisplay) {
    levelDisplay.textContent = `Level ${currentLevel} of ${maxLevel}`;
  }

  if (prevButton) {
    prevButton.disabled = currentLevel <= 1;
  }

  if (nextButton) {
    nextButton.disabled = currentLevel >= maxLevel;
  }
}

// Previous level button handler
document.getElementById('prevLevel')?.addEventListener('click', () => {
  const currentLevel = mazeGame.getLevel();
  if (currentLevel > 1) {
    mazeGame.setLevel(currentLevel - 1);
    updateLevelDisplay();
  }
});

// Next level button handler
document.getElementById('nextLevel')?.addEventListener('click', () => {
  const currentLevel = mazeGame.getLevel();
  const maxLevel = MazeGame.getMaxLevel();
  if (currentLevel < maxLevel) {
    mazeGame.setLevel(currentLevel + 1);
    updateLevelDisplay();
  }
});

// Character selector handler
const characterSelect = document.getElementById('characterSelect') as HTMLSelectElement;
if (characterSelect) {
  // Set the current character in the dropdown
  characterSelect.value = savedSkin.toString();

  characterSelect.addEventListener('change', () => {
    const skinId = parseInt(characterSelect.value, 10);
    mazeGame.setSkin(skinId);
    // Save preference
    localStorage.setItem('mazeGameSkin', skinId.toString());
  });
}

// Run button handler
document.getElementById('runButton')?.addEventListener('click', () => {
  const code = javascriptGenerator.workspaceToCode(workspace);
  mazeGame.execute(code);
});

// Reset button handler
document.getElementById('resetButton')?.addEventListener('click', () => {
  mazeGame.reset();
});

// Initial level display update
updateLevelDisplay();

// Language selector handler
const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
if (languageSelect) {
  // Set the current language in the dropdown
  languageSelect.value = currentLocale;

  languageSelect.addEventListener('change', () => {
    const newLocale = languageSelect.value as SupportedLocale;

    // Save preference
    localStorage.setItem('mazeGameLocale', newLocale);

    // Reload the page to apply new language
    // (This is the simplest approach - Blockly blocks need to be re-registered with new messages)
    window.location.reload();
  });
}

console.log(`Maze game initialized with keyboard navigation support (locale: ${currentLocale})`);
