/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {KeyboardNavigation, TriggerMode} from '../src/index';
import {registerFlyoutCursor} from '../src/flyout_cursor';
import {registerNavigationDeferringToolbox} from '../src/navigation_deferring_toolbox';
import { CONTROLS_WHILEUNTIL_OPERATOR_WHILE } from 'blockly/msg/msg';

(window as unknown as {Blockly: typeof Blockly}).Blockly = Blockly;

let workspace: Blockly.WorkspaceSvg | null = null;
let keyboardNavigation: KeyboardNavigation | null = null;

// Mode types
type Mode = 'sticky' | 'click';
type HighlightSize = 'minimal' | 'medium' | 'large';

// URL parameter interface
interface URLParams {
  mode?: Mode;
  trigger?: TriggerMode;
  highlightSize?: HighlightSize;
  optionsVisible?: boolean;
}

// Timer state
let startTime: number | null = null;
let isTaskComplete: boolean = false;
let hasStartedTimer: boolean = false;
let originalInstructionsHTML: string = '';
let dragStartListener: ((e: Blockly.Events.Abstract) => void) | null = null;

/**
 * Define custom blocks for the "Head, Shoulders, Knees and Toes" scenario.
 */
function defineCustomBlocks() {
  // Container block: "play song"
  Blockly.Blocks['song_container'] = {
    init: function () {
      this.jsonInit({
        type: 'song_container',
        message0: 'play song %1 %2',
        args0: [
          {
            type: 'input_dummy',
          },
          {
            type: 'input_statement',
            name: 'LYRICS',
          },
        ],
        colour: 160,
        tooltip: 'Container for song lyrics',
        helpUrl: '',
      });
    },
  };

  // Simple statement: "heads"
  Blockly.Blocks['lyric_heads'] = {
    init: function () {
      this.jsonInit({
        type: 'lyric_heads',
        message0: 'heads',
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Head body part',
        helpUrl: '',
      });
    },
  };

  // Simple statement: "shoulders"
  Blockly.Blocks['lyric_shoulders'] = {
    init: function () {
      this.jsonInit({
        type: 'lyric_shoulders',
        message0: 'shoulders',
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Shoulder body part',
        helpUrl: '',
      });
    },
  };

  // Statement with value input: "knees _ toes" (smaller gap)
  Blockly.Blocks['lyric_knees_toes'] = {
    init: function () {
      this.jsonInit({
        type: 'lyric_knees_toes',
        message0: 'knees %1 toes',
        args0: [
          {
            type: 'input_value',
            name: 'CONNECTOR',
            check: 'String',
            align: 'CENTRE',
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Knees and toes',
        helpUrl: '',
        inputsInline: true,
      });
    },
  };

  // Value block: "... and ..."
  Blockly.Blocks['connector_and'] = {
    init: function () {
      this.jsonInit({
        type: 'connector_and',
        message0: '... and ...',
        output: 'String',
        colour: 290,
        tooltip: 'Connector word',
        helpUrl: '',
      });
    },
  };
}

// No toolbox needed - all blocks are pre-placed on the workspace

/**
 * Parse URL parameters for settings.
 */
function parseUrlParams(): URLParams {
  const params = new URLSearchParams(window.location.search);
  const result: URLParams = {};

  const mode = params.get('mode');
  if (mode === 'sticky' || mode === 'click') {
    result.mode = mode;
  }

  const trigger = params.get('trigger');
  if (trigger === 'focused_click' || trigger === 'double_click' ||
      trigger === 'shift_click' || trigger === 'grip_click') {
    result.trigger = trigger as TriggerMode;
  }

  const highlightSize = params.get('highlightSize');
  if (highlightSize === 'minimal' || highlightSize === 'medium' || highlightSize === 'large') {
    result.highlightSize = highlightSize;
  }

  const optionsVisible = params.get('optionsVisible');
  if (optionsVisible === 'true' || optionsVisible === 'false') {
    result.optionsVisible = optionsVisible === 'true';
  }

  return result;
}

/**
 * Update URL with current settings without page reload.
 */
function updateUrl() {
  const params = new URLSearchParams();

  // Get current settings from localStorage
  const mode = localStorage.getItem('mode');
  const trigger = localStorage.getItem('trigger');
  const highlightSize = localStorage.getItem('highlightSize');
  const optionsVisible = localStorage.getItem('optionsVisible');

  if (mode) params.set('mode', mode);
  if (trigger) params.set('trigger', trigger);
  if (highlightSize) params.set('highlightSize', highlightSize);
  if (optionsVisible) params.set('optionsVisible', optionsVisible);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

/**
 * Check if the puzzle is solved correctly.
 * Expected structure:
 * - Container with exactly 4 statement children
 * - Child 1: lyric_heads
 * - Child 2: lyric_shoulders
 * - Children 3-4: Both lyric_knees_toes (order doesn't matter)
 * - Each lyric_knees_toes has a connector_and in its value input
 */
function checkIfComplete(): boolean {
  if (!workspace || isTaskComplete) return false;

  const blocks = workspace.getAllBlocks(false);
  const container = blocks.find((b) => b.type === 'song_container');
  if (!container) return false;

  // Get the statement input
  const lyricsInput = container.getInput('LYRICS');
  if (!lyricsInput || !lyricsInput.connection) return false;

  // Walk the chain of connected blocks
  const chain: Blockly.Block[] = [];
  let currentBlock = lyricsInput.connection.targetBlock();
  while (currentBlock) {
    chain.push(currentBlock);
    const nextConnection = currentBlock.nextConnection;
    currentBlock = nextConnection?.targetBlock() || null;
  }

  // Should have exactly 4 blocks
  if (chain.length !== 4) return false;

  // Check first two are heads and shoulders in order
  if (chain[0].type !== 'lyric_heads') return false;
  if (chain[1].type !== 'lyric_shoulders') return false;

  // Check last two are both knees_toes (order doesn't matter)
  if (chain[2].type !== 'lyric_knees_toes') return false;
  if (chain[3].type !== 'lyric_knees_toes') return false;

  // Check each knees_toes has a connector_and
  for (let i = 2; i < 4; i++) {
    const connectorInput = chain[i].getInput('CONNECTOR');
    if (!connectorInput || !connectorInput.connection) return false;
    const connectorBlock = connectorInput.connection.targetBlock();
    if (!connectorBlock || connectorBlock.type !== 'connector_and') return false;
  }

  return true;
}

/**
 * Display success message with completion time.
 */
function showSuccess() {
  if (!startTime) return;

  const elapsedMs = Date.now() - startTime;
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);

  const timeText = mins === 0
    ? `${secs} second${secs !== 1 ? 's' : ''}`
    : `${mins} min${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;

  const instructionsPane = document.getElementById('instructionsPane');
  if (instructionsPane) {
    instructionsPane.innerHTML = `
      <h2>🚀 Success! 🚀</h2>
      <p style="font-size: 18px; font-weight: 500; color: #4285f4;">
        Song completed in ${timeText}
      </p>
      <p style="margin-top: 24px; color: #666;">
        Great job assembling the blocks! 🎉
      </p>
    `;
  }

  isTaskComplete = true;
}

/**
 * Restore the original instructions pane content.
 */
function restoreInstructions() {
  const instructionsPane = document.getElementById('instructionsPane');
  if (instructionsPane && originalInstructionsHTML) {
    instructionsPane.innerHTML = originalInstructionsHTML;
  }
}

/**
 * Load the initial scenario: 7 disconnected blocks arranged in a clear layout.
 */
function loadScenario() {
  if (!workspace) return;

  // Reset timer state
  startTime = null;
  hasStartedTimer = false;
  isTaskComplete = false;
  restoreInstructions();

  workspace.clear();

  // Create blocks at specific positions (all disconnected)
  // Container block at top
  const containerBlock = workspace.newBlock('song_container');
  containerBlock.moveBy(50, 30);
  containerBlock.initSvg();
  containerBlock.render();

  // Lyric blocks in left column
  const headsBlock = workspace.newBlock('lyric_heads');
  headsBlock.moveBy(50, 150);
  headsBlock.initSvg();
  headsBlock.render();

  const shouldersBlock = workspace.newBlock('lyric_shoulders');
  shouldersBlock.moveBy(150, 220);
  shouldersBlock.initSvg();
  shouldersBlock.render();

  // Knees_toes blocks in middle column
  const knees1Block = workspace.newBlock('lyric_knees_toes');
  knees1Block.moveBy(250, 150);
  knees1Block.initSvg();
  knees1Block.render();

  const knees2Block = workspace.newBlock('lyric_knees_toes');
  knees2Block.moveBy(250, 50);
  knees2Block.initSvg();
  knees2Block.render();

  // 'And' connector blocks in right column
  const and1Block = workspace.newBlock('connector_and');
  and1Block.moveBy(250, 220);
  and1Block.initSvg();
  and1Block.render();

  const and2Block = workspace.newBlock('connector_and');
  and2Block.moveBy(250, 110);
  and2Block.initSvg();
  and2Block.render();
}

/**
 * Apply mode settings (sticky drag vs click destination).
 */
function applyMode(mode: Mode) {
  if (!keyboardNavigation) return;
console.log('Applying mode:', mode);
  if (mode === 'sticky') {
    console.log('Setting sticky mode');
    // Sticky drag: block sticks to mouse, no highlights
    keyboardNavigation.setKeepBlockOnMouse(true);
    keyboardNavigation.setHighlightConnections(false);

    // Hide connection size option since highlights are disabled
    const highlightSizeRow = document.getElementById('highlightSizeRow');
    if (highlightSizeRow) {
      highlightSizeRow.style.display = 'none';
    }
  } else {
    console.log('Setting click mode');
    // Click destination: click to place, with highlights
    keyboardNavigation.setKeepBlockOnMouse(false);
    keyboardNavigation.setHighlightConnections(true);

    // Show connection size option since highlights are enabled
    const highlightSizeRow = document.getElementById('highlightSizeRow');
    if (highlightSizeRow) {
      highlightSizeRow.style.display = 'flex';
    }
  }

  localStorage.setItem('mode', mode);
  updateUrl();
}

/**
 * Apply trigger mode setting.
 */
function applyTrigger(trigger: TriggerMode) {
  if (!keyboardNavigation) return;
  keyboardNavigation.setTriggerMode(trigger);
  localStorage.setItem('trigger', trigger);
  updateUrl();
}

/**
 * Apply connection highlight size setting.
 */
function applyHighlightSize(size: HighlightSize) {
  if (!keyboardNavigation) return;
  keyboardNavigation.setConnectionSize(size);
  localStorage.setItem('highlightSize', size);
  updateUrl();
}

/**
 * Apply options panel visibility setting.
 */
function applyOptionsVisibility(visible: boolean) {
  const controlsDiv = document.getElementById('controls');
  const toggleOptionsButton = document.getElementById('toggleOptionsButton');

  if (visible) {
    controlsDiv?.classList.remove('hidden');
    if (toggleOptionsButton) toggleOptionsButton.textContent = 'Hide Options';
  } else {
    controlsDiv?.classList.add('hidden');
    if (toggleOptionsButton) toggleOptionsButton.textContent = 'Show Options';
  }

  localStorage.setItem('optionsVisible', visible.toString());
  updateUrl();

  // Resize workspace to fit the new available space
  if (workspace) {
    setTimeout(() => {
      Blockly.svgResize(workspace!);
    }, 0);
  }
}

/**
 * Copy the current URL (with all settings) to clipboard.
 */
async function copyUrlToClipboard() {
  const shareButton = document.getElementById('shareUrlButton');
  if (!shareButton) return;

  const originalText = shareButton.textContent;

  try {
    await navigator.clipboard.writeText(window.location.href);
    shareButton.textContent = '✓ Copied!';
    shareButton.style.borderColor = '#34a853';
    shareButton.style.color = '#34a853';
    shareButton.style.background = '#e6f4ea';

    setTimeout(() => {
      shareButton.textContent = originalText;
      shareButton.style.borderColor = '';
      shareButton.style.color = '';
      shareButton.style.background = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy URL:', err);
    shareButton.textContent = '✗ Failed';
    setTimeout(() => {
      shareButton.textContent = originalText;
    }, 2000);
  }
}

/**
 * Create and initialize the Blockly workspace.
 */
function createWorkspace() {
  const blocklyDiv = document.getElementById('blocklyDiv');
  if (!blocklyDiv) {
    throw new Error('Missing blocklyDiv');
  }

  defineCustomBlocks();

  const injectOptions = {
    renderer: 'zelos',
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.15,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    },
  };

  // Must be called before injection
  KeyboardNavigation.registerKeyboardNavigationStyles();
  registerFlyoutCursor();

  workspace = Blockly.inject(blocklyDiv, injectOptions);

  const kbNav = new KeyboardNavigation(workspace);
  keyboardNavigation = kbNav;

  // Expose for debugging
  (window as any).kbNav = kbNav;
  (window as any).workspace = workspace;

  // Set up event listener for drag events
  dragStartListener = (event: Blockly.Events.Abstract) => {
    if (isTaskComplete) return;

    // Start timer on first block drag (sticky move mode)
    if (
      event.type === Blockly.Events.BLOCK_DRAG &&
      (event as any).isStart
    ) {
      if (!hasStartedTimer) {
        startTime = Date.now();
        hasStartedTimer = true;
        console.log('Timer started!');
      }
    }

    // Check completion after blocks are moved/connected
    if (
      event.type === Blockly.Events.BLOCK_MOVE ||
      event.type === Blockly.Events.BLOCK_DRAG
    ) {
      // Use setTimeout to allow the UI to update first
      setTimeout(() => {
        if (checkIfComplete()) {
          console.log('Puzzle complete!');
          showSuccess();
        }
      }, 100);
    }
  };

  workspace.addChangeListener(dragStartListener);

  // Load the initial scenario
  loadScenario();
}

/**
 * Wire up all UI controls and event handlers.
 */
function setupEventHandlers() {
  // Mode radio buttons (sticky vs click)
  const modeRadios = document.getElementsByName('mode');
  modeRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        applyMode(target.value as Mode);
      }
    });
  });

  // Trigger radio buttons
  const triggerRadios = document.getElementsByName('trigger');
  triggerRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        applyTrigger(target.value as TriggerMode);
      }
    });
  });

  // Highlight size dropdown
  const highlightSizeSelect = document.getElementById('highlightSize') as HTMLSelectElement;
  highlightSizeSelect?.addEventListener('change', () => {
    applyHighlightSize(highlightSizeSelect.value as HighlightSize);
  });

  // Share URL button
  const shareUrlButton = document.getElementById('shareUrlButton');
  shareUrlButton?.addEventListener('click', () => {
    copyUrlToClipboard();
  });

  // Toggle options button
  const toggleOptionsButton = document.getElementById('toggleOptionsButton');
  const controlsDiv = document.getElementById('controls');
  toggleOptionsButton?.addEventListener('click', () => {
    const isCurrentlyVisible = !controlsDiv?.classList.contains('hidden');
    applyOptionsVisibility(!isCurrentlyVisible);
  });

  // Reset button
  const resetButton = document.getElementById('resetButton');
  resetButton?.addEventListener('click', () => {
    loadScenario();
  });
}

/**
 * Load saved settings or apply defaults.
 * Priority: URL params > localStorage > defaults
 */
function loadSettings() {
  const urlParams = parseUrlParams();

  // Load mode (default: click destination)
  const savedMode = urlParams.mode || (localStorage.getItem('mode') as Mode) || 'click';
  const modeRadio = document.querySelector(`input[name="mode"][value="${savedMode}"]`) as HTMLInputElement;
  if (modeRadio) {
    modeRadio.checked = true;
    applyMode(savedMode);
  }

  // Load trigger (default: focused_click)
  const savedTrigger = urlParams.trigger || (localStorage.getItem('trigger') as TriggerMode) || 'focused_click';
  const triggerRadio = document.querySelector(`input[name="trigger"][value="${savedTrigger}"]`) as HTMLInputElement;
  if (triggerRadio) {
    triggerRadio.checked = true;
    applyTrigger(savedTrigger);
  }

  // Load highlight size (default: medium)
  const savedSize = urlParams.highlightSize || (localStorage.getItem('highlightSize') as HighlightSize) || 'medium';
  const sizeSelect = document.getElementById('highlightSize') as HTMLSelectElement;
  if (sizeSelect) {
    sizeSelect.value = savedSize;
    applyHighlightSize(savedSize);
  }

  // Load options visibility (default: visible)
  const optionsVisible = urlParams.optionsVisible !== undefined ? urlParams.optionsVisible :
    (localStorage.getItem('optionsVisible') === 'false' ? false : true);
  applyOptionsVisibility(optionsVisible);
}

/**
 * Initialize the demo on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Store original instructions HTML for restoration after reset
  const instructionsPane = document.getElementById('instructionsPane');
  if (instructionsPane) {
    originalInstructionsHTML = instructionsPane.innerHTML;
  }

  createWorkspace();
  setupEventHandlers();
  loadSettings();
});
