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
import {MazeGame, MAX_BLOCKS} from './maze';
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

/**
 * Get the toolbox configuration for a specific level.
 * Blocks are progressively unlocked as levels advance.
 *
 * Level 1-2: moveForward, turn (basic sequencing)
 * Level 3-5: + forever loop (introduces loops)
 * Level 6: + if (preset to isPathLeft)
 * Level 7-8: + if (with dropdown)
 * Level 9-10: + ifElse
 */
function getToolboxForLevel(level: number): Blockly.utils.toolbox.ToolboxDefinition {
  const contents: Blockly.utils.toolbox.ToolboxItemInfo[] = [
    {kind: 'block', type: 'maze_moveForward'},
    {kind: 'block', type: 'maze_turn', fields: {DIR: 'turnLeft'}},
    {kind: 'block', type: 'maze_turn', fields: {DIR: 'turnRight'}},
  ];

  // Level 3+: Add forever loop
  if (level > 2) {
    contents.push({kind: 'block', type: 'maze_forever'});
  }

  // Level 6: Add if block (preset to isPathLeft)
  if (level === 6) {
    contents.push({kind: 'block', type: 'maze_if', fields: {DIR: 'isPathLeft'}});
  }
  // Level 7+: Add if block with dropdown
  else if (level > 6) {
    contents.push({kind: 'block', type: 'maze_if'});
  }

  // Level 9+: Add ifElse block
  if (level > 8) {
    contents.push({kind: 'block', type: 'maze_ifElse'});
  }

  return {kind: 'flyoutToolbox', contents};
}

// Start at level 1
const initialLevel = 1;
const initialMaxBlocks = MAX_BLOCKS[initialLevel - 1];

// Initialize Blockly workspace with level-specific configuration
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: getToolboxForLevel(initialLevel),
  trashcan: true,
  maxBlocks: initialMaxBlocks === Infinity ? undefined : initialMaxBlocks,
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

/**
 * Update the capacity bubble display based on remaining block capacity.
 */
function updateCapacityBubble() {
  const capacityBubble = document.getElementById('capacityBubble');
  if (!capacityBubble) return;

  const currentLevel = mazeGame.getLevel();
  const maxBlocks = MAX_BLOCKS[currentLevel - 1];

  // Hide bubble if no limit
  if (maxBlocks === Infinity) {
    capacityBubble.classList.add('hidden');
    return;
  }

  const remaining = workspace.remainingCapacity();
  capacityBubble.classList.remove('hidden', 'warning', 'error');

  if (remaining <= 0) {
    capacityBubble.textContent = msg('MAZE_CAPACITY_NONE');
    capacityBubble.classList.add('error');
  } else if (remaining <= 2) {
    capacityBubble.textContent = msg('MAZE_CAPACITY', remaining);
    capacityBubble.classList.add('warning');
  } else {
    capacityBubble.textContent = msg('MAZE_CAPACITY', remaining);
  }
}

// Listen for workspace changes to update capacity
workspace.addChangeListener((event) => {
  if (event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_MOVE) {
    updateCapacityBubble();
  }
});

/**
 * Update workspace configuration for a new level.
 * This updates both the toolbox and the maxBlocks limit.
 */
function updateWorkspaceForLevel(level: number) {
  const maxBlocks = MAX_BLOCKS[level - 1];

  // Update toolbox with level-appropriate blocks
  workspace.updateToolbox(getToolboxForLevel(level));

  // Update max blocks - need to set the option and refresh
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = workspace.options as any;
  options.maxBlocks = maxBlocks === Infinity ? Infinity : maxBlocks;

  // Clear workspace when changing levels
  workspace.clear();

  // Update capacity display
  updateCapacityBubble();
}

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
    const newLevel = currentLevel - 1;
    mazeGame.setLevel(newLevel);
    updateWorkspaceForLevel(newLevel);
    updateLevelDisplay();
  }
});

// Next level button handler
document.getElementById('nextLevel')?.addEventListener('click', () => {
  const currentLevel = mazeGame.getLevel();
  const maxLevel = MazeGame.getMaxLevel();
  if (currentLevel < maxLevel) {
    const newLevel = currentLevel + 1;
    mazeGame.setLevel(newLevel);
    updateWorkspaceForLevel(newLevel);
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

// ========== HINT SYSTEM ==========

// Track execution state for hints
let hasRun = false;
let lastResult: 'success' | 'failure' | 'error' | 'none' = 'none';
let hintTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Show a hint dialog with the given message.
 */
function showHint(messageKey: string) {
  const hintDialog = document.getElementById('hintDialog');
  const hintText = document.getElementById('hintText');
  if (!hintDialog || !hintText) return;

  hintText.textContent = msg(messageKey);
  hintDialog.classList.add('visible');

  // Position hint near the workspace
  const blocklyDiv = document.getElementById('blocklyDiv');
  if (blocklyDiv) {
    const rect = blocklyDiv.getBoundingClientRect();
    hintDialog.style.top = `${rect.top + 20}px`;
    hintDialog.style.left = `${rect.left + 20}px`;
  }
}

/**
 * Hide the hint dialog.
 */
function hideHint() {
  const hintDialog = document.getElementById('hintDialog');
  if (hintDialog) {
    hintDialog.classList.remove('visible');
  }
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
}

// Close button for hint dialog
document.querySelector('#hintDialog .close-btn')?.addEventListener('click', hideHint);

/**
 * Determine which hint to show based on current level and workspace state.
 * This implements the original blockly-games hint logic.
 */
function levelHelp() {
  // Don't show hints while executing
  if (mazeGame.isExecuting()) return;

  const level = mazeGame.getLevel();
  const blocks = workspace.getAllBlocks(false);
  const topBlocks = workspace.getTopBlocks(false);
  const maxBlocks = MAX_BLOCKS[level - 1];
  const remaining = workspace.remainingCapacity();

  // Helper to check if a block type exists
  const hasBlockType = (type: string) => blocks.some(b => b.type === type);

  // Helper to count blocks in a loop
  const getNestedBlockCount = (loopBlock: Blockly.Block): number => {
    let count = 0;
    let block = loopBlock.getInputTargetBlock('DO');
    while (block) {
      count++;
      block = block.getNextBlock();
    }
    return count;
  };

  hideHint(); // Clear any existing hint

  // Schedule hint with delay to avoid showing too quickly
  hintTimeout = setTimeout(() => {
    let hintKey: string | null = null;

    switch (level) {
      case 1:
        // Level 1 hints
        if (blocks.length < 2) {
          hintKey = 'MAZE_HINT_STACK';
        } else if (topBlocks.length > 1) {
          hintKey = 'MAZE_HINT_ONE_TOP_BLOCK';
        } else if (!hasRun) {
          hintKey = 'MAZE_HINT_RUN';
        }
        break;

      case 2:
        // Level 2: Hint about resetting after failure
        if (hasRun && lastResult === 'failure') {
          hintKey = 'MAZE_HINT_RESET';
        }
        break;

      case 3:
        // Level 3: Introduces loops (block limit 2)
        if (remaining === 0 && !hasBlockType('maze_forever')) {
          hintKey = 'MAZE_HINT_CAPACITY';
        } else if (!hasBlockType('maze_forever') && remaining > 0) {
          hintKey = 'MAZE_HINT_REPEAT';
        }
        break;

      case 4:
        // Level 4: Multiple blocks in loop
        if (remaining === 0 && (!hasBlockType('maze_forever') || topBlocks.length > 1)) {
          hintKey = 'MAZE_HINT_CAPACITY';
        } else if (hasBlockType('maze_forever')) {
          const foreverBlock = blocks.find(b => b.type === 'maze_forever');
          if (foreverBlock && getNestedBlockCount(foreverBlock) < 2) {
            hintKey = 'MAZE_HINT_REPEAT_MANY';
          }
        }
        break;

      case 5:
        // Level 5: No specific hint (optional skin hint in original)
        break;

      case 6:
        // Level 6: Introduces if block
        if (!hasBlockType('maze_if')) {
          hintKey = 'MAZE_HINT_IF';
        }
        break;

      case 7:
      case 8:
        // Level 7-8: If block with dropdown
        if (hasBlockType('maze_if')) {
          // Check if any if block still has default isPathForward
          const ifBlock = blocks.find(b => b.type === 'maze_if');
          if (ifBlock) {
            const fieldValue = ifBlock.getFieldValue('DIR');
            if (fieldValue === 'isPathForward') {
              hintKey = 'MAZE_HINT_MENU';
            }
          }
        }
        break;

      case 9:
        // Level 9: Introduces ifElse
        if (!hasBlockType('maze_ifElse')) {
          hintKey = 'MAZE_HINT_IF_ELSE';
        }
        break;

      case 10:
        // Level 10: Wall following hint (show once)
        if (!localStorage.getItem('maze_level10_hint_shown')) {
          hintKey = 'MAZE_HINT_WALL_FOLLOW';
          localStorage.setItem('maze_level10_hint_shown', 'true');
        }
        break;
    }

    if (hintKey) {
      showHint(hintKey);
    }
  }, 2000); // 2 second delay before showing hints
}

// Update run button handler to track execution
const originalRunHandler = document.getElementById('runButton');
if (originalRunHandler) {
  originalRunHandler.addEventListener('click', () => {
    hasRun = true;
    hideHint();
  });
}

// Listen for maze game completion events
mazeGame.onComplete((success: boolean) => {
  lastResult = success ? 'success' : 'failure';
  // Trigger hint check after a short delay
  setTimeout(levelHelp, 500);
});

// Trigger hints on workspace changes (with debouncing via the timeout in levelHelp)
workspace.addChangeListener((event) => {
  if (event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_CHANGE ||
      event.type === Blockly.Events.BLOCK_MOVE) {
    levelHelp();
  }
});

// Reset hint state when level changes
function resetHintState() {
  hasRun = false;
  lastResult = 'none';
  hideHint();
  // Trigger initial hint for new level
  setTimeout(levelHelp, 1000);
}

// Hook into level change handlers
document.getElementById('prevLevel')?.addEventListener('click', resetHintState);
document.getElementById('nextLevel')?.addEventListener('click', resetHintState);

// Initial hint after page load
setTimeout(levelHelp, 3000);

console.log(`Maze game initialized with keyboard navigation support (locale: ${currentLocale})`);
