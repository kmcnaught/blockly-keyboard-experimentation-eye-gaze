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
  // Update page title
  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    pageTitle.textContent = msg('MAZE_TITLE');
  }

  // Update button text
  const runButton = document.getElementById('runButton');
  if (runButton) {
    runButton.textContent = msg('MAZE_RUN_PROGRAM');
  }

  const resetButton = document.getElementById('resetButton');
  if (resetButton) {
    resetButton.textContent = msg('MAZE_RESET_PROGRAM');
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
    capacityBubble.textContent = msg('MAZE_CAPACITY', 0);
    capacityBubble.classList.add('error');
  } else if (remaining === 1) {
    capacityBubble.textContent = msg('MAZE_CAPACITY_1', remaining);
    capacityBubble.classList.add('warning');
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

// Register block highlighting callback for code execution visualization
mazeGame.onHighlight((blockId) => {
  workspace.highlightBlock(blockId);
});

// Update level display
function updateLevelDisplay() {
  const currentLevel = mazeGame.getLevel();
  const maxLevel = MazeGame.getMaxLevel();

  const levelDisplay = document.getElementById('levelDisplay');
  const prevButton = document.getElementById('prevLevel') as HTMLButtonElement;
  const nextButton = document.getElementById('nextLevel') as HTMLButtonElement;

  if (levelDisplay) {
    levelDisplay.textContent = `${msg('MAZE_LEVEL')} ${currentLevel}`;
  }

  if (prevButton) {
    prevButton.disabled = currentLevel <= 1;
  }

  if (nextButton) {
    nextButton.disabled = currentLevel >= maxLevel;
  }
}

// Previous level button handler (uses shared function, resetHintState called there)
document.getElementById('prevLevel')?.addEventListener('click', goToPreviousLevel);

// Next level button handler (uses shared function, resetHintState called there)
document.getElementById('nextLevel')?.addEventListener('click', goToNextLevel);

// Setup the Pegman button and menu
const pegmanButton = document.getElementById('pegmanButton');
const pegmanImg = pegmanButton?.querySelector('img');
const pegmanMenu = document.getElementById('pegmanMenu');
const skins = MazeGame.getSkins();

// Set initial character sprite in button
if (pegmanImg) {
  pegmanImg.src = skins[savedSkin].sprite;
}

// Initialize Christmas theme if Rudolph was saved as preferred skin
// (RUDOLPH_SKIN_ID will be 4 - index of Rudolph in SKINS array)
if (savedSkin === 4) {
  // Defer to ensure DOM is ready
  setTimeout(() => setChristmasTheme(true), 100);
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

// Christmas theme constants
const RUDOLPH_SKIN_ID = 4; // Index of Rudolph in SKINS array
let snowflakesCreated = false;

/**
 * Create snowflake elements for the snow effect.
 */
function createSnowflakes() {
  if (snowflakesCreated) return;

  const snowContainer = document.getElementById('snowContainer');
  if (!snowContainer) return;

  // Clear existing snowflakes
  snowContainer.innerHTML = '';

  // Create 30 snowflakes with varied properties
  const snowflakeChars = ['❄', '❅', '❆', '•'];
  for (let i = 0; i < 30; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.textContent = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];

    // Random horizontal position
    snowflake.style.left = `${Math.random() * 100}%`;

    // Random size (0.5em to 1.5em)
    const size = 0.5 + Math.random() * 1;
    snowflake.style.fontSize = `${size}em`;

    // Random animation duration (5s to 15s for parallax effect)
    const duration = 5 + Math.random() * 10;
    snowflake.style.animationDuration = `${duration}s`;

    // Random delay so they don't all start at once
    snowflake.style.animationDelay = `${Math.random() * duration}s`;

    // Random opacity (0.5 to 1.0)
    snowflake.style.opacity = `${0.5 + Math.random() * 0.5}`;

    snowContainer.appendChild(snowflake);
  }

  snowflakesCreated = true;
}

/**
 * Enable or disable Christmas theme effects.
 */
function setChristmasTheme(enabled: boolean) {
  const header = document.querySelector('header');
  const snowContainer = document.getElementById('snowContainer');

  if (enabled) {
    // Enable Christmas theme
    header?.classList.add('christmas');
    if (snowContainer) {
      createSnowflakes();
      snowContainer.classList.add('active');
    }
  } else {
    // Disable Christmas theme
    header?.classList.remove('christmas');
    snowContainer?.classList.remove('active');
  }
}

// Function to change the character
function changePegman(skinId: number) {
  mazeGame.setSkin(skinId);
  localStorage.setItem('mazeGameSkin', skinId.toString());

  // Update button image
  if (pegmanImg) {
    pegmanImg.src = skins[skinId].sprite;
  }

  // Toggle Christmas theme based on skin
  setChristmasTheme(skinId === RUDOLPH_SKIN_ID);

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

// ========== INSTRUCTION BAR SYSTEM ==========

/**
 * Display modes for the instruction bar.
 * - 'both': Show instructions and hints
 * - 'instructions': Show only level instructions
 * - 'none': Hide the instruction bar completely
 */
type DisplayMode = 'both' | 'instructions' | 'none';

// Load saved display mode or default to 'both'
let displayMode: DisplayMode =
  (localStorage.getItem('mazeDisplayMode') as DisplayMode) || 'both';

/**
 * Cycle through display modes: both -> instructions -> none -> both
 */
function cycleDisplayMode() {
  const modes: DisplayMode[] = ['both', 'instructions', 'none'];
  const currentIndex = modes.indexOf(displayMode);
  displayMode = modes[(currentIndex + 1) % modes.length];
  localStorage.setItem('mazeDisplayMode', displayMode);
  updateInstructionBar();
}

/**
 * Update the instruction bar based on current display mode and level.
 */
function updateInstructionBar() {
  const instructionBar = document.getElementById('instructionBar');
  const levelInstruction = document.getElementById('levelInstruction');
  const contextualHint = document.getElementById('contextualHint');

  if (!instructionBar || !levelInstruction) return;

  // Handle 'none' mode - hide the bar
  if (displayMode === 'none') {
    instructionBar.classList.add('hidden');
    return;
  }

  // Show the bar
  instructionBar.classList.remove('hidden');

  // Update level instruction
  const level = mazeGame.getLevel();
  const instructionKey = `MAZE_INSTRUCTION_${level}`;
  levelInstruction.textContent = msg(instructionKey);

  // Handle hints visibility
  if (contextualHint) {
    if (displayMode === 'instructions') {
      // Hide hints in instructions-only mode
      contextualHint.textContent = '';
    }
    // In 'both' mode, hints are updated by updateContextualHint()
  }
}

/**
 * Update just the contextual hint portion of the instruction bar.
 */
function updateContextualHint(hintKey: string | null) {
  const contextualHint = document.getElementById('contextualHint');
  if (!contextualHint) return;

  // Don't show hints if display mode is not 'both'
  if (displayMode !== 'both') {
    contextualHint.textContent = '';
    return;
  }

  if (hintKey) {
    contextualHint.textContent = msg(hintKey);
  } else {
    contextualHint.textContent = '';
  }
}

// ========== HINT SYSTEM ==========

// Track execution state for hints
let hasRun = false;
let lastResult: 'success' | 'failure' | 'error' | 'none' = 'none';
let hintTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Show a hint in the instruction bar.
 */
function showHint(messageKey: string) {
  updateContextualHint(messageKey);
}

/**
 * Hide the contextual hint.
 */
function hideHint() {
  updateContextualHint(null);
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
}

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
  // Update instruction bar for new level
  updateInstructionBar();
  // Trigger initial hint for new level
  setTimeout(levelHelp, 1000);
}

// Note: resetHintState is called within goToPreviousLevel and goToNextLevel

// Initialize instruction bar and hints after page load
updateInstructionBar();
setTimeout(levelHelp, 3000);

// ========== GLOBAL KEYBOARD SHORTCUTS ==========

/**
 * Go to previous level (shared by button and keyboard shortcut).
 */
function goToPreviousLevel() {
  const currentLevel = mazeGame.getLevel();
  if (currentLevel > 1) {
    const newLevel = currentLevel - 1;
    mazeGame.setLevel(newLevel);
    updateWorkspaceForLevel(newLevel);
    updateLevelDisplay();
    resetHintState();
  }
}

/**
 * Go to next level (shared by button and keyboard shortcut).
 */
function goToNextLevel() {
  const currentLevel = mazeGame.getLevel();
  const maxLevel = MazeGame.getMaxLevel();
  if (currentLevel < maxLevel) {
    const newLevel = currentLevel + 1;
    mazeGame.setLevel(newLevel);
    updateWorkspaceForLevel(newLevel);
    updateLevelDisplay();
    resetHintState();
  }
}

/**
 * Global keyboard shortcuts for quick navigation and actions.
 * These work from anywhere on the page.
 *
 * Shortcuts:
 * - Ctrl+Alt+1: Jump to workspace
 * - Ctrl+Alt+2: Jump to toolbox
 * - Ctrl+Alt+R: Run the program (alternative)
 * - H: Toggle instruction bar display mode
 * - [: Previous level
 * - ]: Next level
 * - R: Run the program
 * - ? or /: Show shortcuts dialog
 */
// Use capture phase (true) to handle shortcuts before Blockly intercepts them
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Ignore if user is typing in an input field
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
      target.isContentEditable) {
    return;
  }

  // Ctrl+Alt+1: Jump to workspace
  if (e.ctrlKey && e.altKey && e.key === '1') {
    e.preventDefault();
    e.stopPropagation();
    // Enable keyboard navigation mode
    Blockly.keyboardNavigationController.setIsActive(true);
    // Focus the workspace - try to focus first block if available
    const topBlocks = workspace.getTopBlocks(true);
    if (topBlocks.length > 0) {
      Blockly.getFocusManager().focusNode(topBlocks[0]);
    } else {
      Blockly.getFocusManager().focusTree(workspace);
    }
    return;
  }

  // Ctrl+Alt+2: Jump to toolbox/flyout
  if (e.ctrlKey && e.altKey && e.key === '2') {
    e.preventDefault();
    e.stopPropagation();
    // Enable keyboard navigation mode
    Blockly.keyboardNavigationController.setIsActive(true);
    // Focus the toolbox or flyout
    const toolbox = workspace.getToolbox();
    const flyout = workspace.getFlyout();
    if (toolbox) {
      Blockly.getFocusManager().focusTree(toolbox);
    } else if (flyout) {
      Blockly.getFocusManager().focusTree(flyout.getWorkspace());
    }
    return;
  }

  // Ctrl+Alt+R: Run the program
  if (e.ctrlKey && e.altKey && e.key === 'r') {
    e.preventDefault();
    e.stopPropagation();
    // Only run if not already executing
    if (!mazeGame.isExecuting()) {
      hasRun = true;
      hideHint();
      const code = javascriptGenerator.workspaceToCode(workspace);
      mazeGame.execute(code);
    }
    return;
  }

  // H: Toggle instruction bar display mode (no modifiers)
  if (e.key === 'h' || e.key === 'H') {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      cycleDisplayMode();
      return;
    }
  }

  // [: Previous level (no modifiers)
  if (e.key === '[') {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      goToPreviousLevel();
      return;
    }
  }

  // ]: Next level (no modifiers)
  if (e.key === ']') {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      goToNextLevel();
      return;
    }
  }

  // R: Run the program (no modifiers)
  if (e.key === 'r' || e.key === 'R') {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!mazeGame.isExecuting()) {
        hasRun = true;
        hideHint();
        const code = javascriptGenerator.workspaceToCode(workspace);
        mazeGame.execute(code);
      }
      return;
    }
  }

  // ? or /: Show shortcuts dialog (no modifiers)
  if (e.key === '?' || e.key === '/') {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      keyboardNavigation.toggleShortcutDialog();
      return;
    }
  }
}, true); // Use capture phase to handle before Blockly
