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
import {loadMessages, getBrowserLocale, msg, type SupportedLocale} from './messages';

// Initialize locale (browser detection or saved preference)
let currentLocale: SupportedLocale =
  (localStorage.getItem('mazeGameLocale') as SupportedLocale) || getBrowserLocale();

// Load internationalized messages
loadMessages(currentLocale);

// Register maze-specific blocks
registerMazeBlocks();

/**
 * Update all UI text elements with internationalized messages
 */
function updateUIText() {
  // Update page title and subtitle
  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    pageTitle.textContent = `🎮 ${msg('MAZE_TITLE')}`;
  }

  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    subtitle.textContent = msg('MAZE_SUBTITLE');
  }

  // Update character label
  const charLabel = document.querySelector('label[for="pegmanButton"]');
  if (charLabel) {
    charLabel.textContent = `🎨 ${msg('MAZE_CHARACTER_LABEL')}`;
  }

  // Update language label
  const langLabel = document.querySelector('label[for="languageSelect"]');
  if (langLabel) {
    langLabel.textContent = `🌐 ${msg('MAZE_LANGUAGE_LABEL')}`;
  }

  // Update button text
  const runButton = document.getElementById('runButton');
  if (runButton) {
    runButton.textContent = `▶️ ${msg('MAZE_RUN_PROGRAM')}`;
  }

  const resetButton = document.getElementById('resetButton');
  if (resetButton) {
    resetButton.textContent = `🔄 ${msg('MAZE_RESET_PROGRAM')}`;
  }

  // Update instructions
  const instructions = document.querySelector('.instructions');
  if (instructions) {
    instructions.innerHTML = `
      <strong>${msg('MAZE_GOAL_LABEL')}</strong> ${msg('MAZE_GOAL_DESCRIPTION')}
      <br /><br />
      <strong>${msg('MAZE_AVAILABLE_BLOCKS_LABEL')}</strong>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>${msg('MAZE_MOVE_FORWARD')}</li>
        <li>${msg('MAZE_TURN_LEFT')} / ${msg('MAZE_TURN_RIGHT')}</li>
        <li>${msg('MAZE_PATH_AHEAD')}/${msg('MAZE_PATH_LEFT').replace('if path to the ', '')}/${msg('MAZE_PATH_RIGHT').replace('if path to the ', '')}</li>
        <li>${msg('MAZE_REPEAT_UNTIL')}</li>
      </ul>
    `;
  }

  // Update keyboard help
  const keyboardHelp = document.querySelector('.keyboard-help');
  if (keyboardHelp) {
    keyboardHelp.innerHTML = `
      <strong>⌨️ ${msg('MAZE_KEYBOARD_NAV_LABEL')}</strong>
      ${msg('MAZE_KEYBOARD_HELP_1')}<br />
      ${msg('MAZE_KEYBOARD_HELP_2')}<br />
      ${msg('MAZE_KEYBOARD_HELP_3')}<br />
      ${msg('MAZE_KEYBOARD_HELP_4')}
    `;
  }
}

// Update UI text on load
updateUIText();

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

/**
 * Get level title from message keys
 */
function getLevelTitle(level: number): string {
  return msg(`MAZE_LEVEL_${level}_TITLE`);
}

// Update level display
function updateLevelDisplay() {
  const currentLevel = mazeGame.getLevel();
  const maxLevel = MazeGame.getMaxLevel();

  const levelTitle = document.getElementById('levelTitle');
  const levelDisplay = document.getElementById('levelDisplay');
  const prevButton = document.getElementById('prevLevel') as HTMLButtonElement;
  const nextButton = document.getElementById('nextLevel') as HTMLButtonElement;

  if (levelTitle) {
    levelTitle.textContent = msg('MAZE_LEVEL_WITH_TITLE', currentLevel, getLevelTitle(currentLevel));
  }

  if (levelDisplay) {
    levelDisplay.textContent = msg('MAZE_LEVEL_COUNTER', currentLevel, maxLevel);
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

// Setup the Pegman button and menu
const pegmanButton = document.getElementById('pegmanButton');
const pegmanImg = pegmanButton?.querySelector('img');
const pegmanMenu = document.getElementById('pegmanMenu');
const skins = MazeGame.getSkins();

// Set initial character sprite in button
if (pegmanImg) {
  pegmanImg.src = skins[savedSkin].sprite;
}

// Build the character menu
if (pegmanMenu) {
  skins.forEach((skin, i) => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    img.src = skin.sprite;
    div.appendChild(img);
    pegmanMenu.appendChild(div);

    div.addEventListener('click', () => {
      changePegman(i);
    });
  });
}

// Function to change the character
function changePegman(skinId: number) {
  mazeGame.setSkin(skinId);
  localStorage.setItem('mazeGameSkin', skinId.toString());

  // Update button image
  if (pegmanImg) {
    pegmanImg.src = skins[skinId].sprite;
  }

  hidePegmanMenu();
}

// Show pegman menu on button click
if (pegmanButton) {
  pegmanButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pegmanMenu) {
      if (pegmanMenu.style.display === 'block') {
        hidePegmanMenu();
      } else {
        showPegmanMenu();
      }
    }
  });
}

// Show menu function
function showPegmanMenu() {
  if (!pegmanButton || !pegmanMenu) return;

  pegmanButton.classList.add('buttonHover');
  const rect = pegmanButton.getBoundingClientRect();
  pegmanMenu.style.top = `${rect.bottom + 5}px`;
  pegmanMenu.style.left = `${rect.left}px`;
  pegmanMenu.style.display = 'block';

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', hidePegmanMenu);
  }, 0);
}

// Hide menu function
function hidePegmanMenu() {
  if (!pegmanMenu || !pegmanButton) return;

  pegmanMenu.style.display = 'none';
  pegmanButton.classList.remove('buttonHover');
  document.removeEventListener('click', hidePegmanMenu);
}

// Hide menu on window resize
window.addEventListener('resize', hidePegmanMenu);

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
