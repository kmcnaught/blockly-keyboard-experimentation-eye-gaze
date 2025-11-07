/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {KeyboardNavigation, TriggerMode} from '../src/index';
import {registerFlyoutCursor} from '../src/flyout_cursor';
import {registerNavigationDeferringToolbox} from '../src/navigation_deferring_toolbox';

(window as unknown as {Blockly: typeof Blockly}).Blockly = Blockly;

let workspace: Blockly.WorkspaceSvg | null = null;
let keyboardNavigation: KeyboardNavigation | null = null;

// Mode types
type Mode = 'sticky' | 'click';
type HighlightSize = 'minimal' | 'medium' | 'large';

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
 * Load the initial scenario: 7 disconnected blocks arranged in a clear layout.
 */
function loadScenario() {
  if (!workspace) return;

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

  if (mode === 'sticky') {
    // Sticky drag: block sticks to mouse, no highlights
    keyboardNavigation.setKeepBlockOnMouse(true);
    keyboardNavigation.setHighlightConnections(false);
  } else {
    // Click destination: click to place, with highlights
    keyboardNavigation.setKeepBlockOnMouse(false);
    keyboardNavigation.setHighlightConnections(true);
  }

  localStorage.setItem('mode', mode);
}

/**
 * Apply trigger mode setting.
 */
function applyTrigger(trigger: TriggerMode) {
  if (!keyboardNavigation) return;
  keyboardNavigation.setTriggerMode(trigger);
  localStorage.setItem('trigger', trigger);
}

/**
 * Apply connection highlight size setting.
 */
function applyHighlightSize(size: HighlightSize) {
  if (!keyboardNavigation) return;
  keyboardNavigation.setConnectionSize(size);
  localStorage.setItem('highlightSize', size);
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
      startScale: 1.0,
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

  // Reset button
  const resetButton = document.getElementById('resetButton');
  resetButton?.addEventListener('click', () => {
    loadScenario();
  });
}

/**
 * Load saved settings or apply defaults.
 */
function loadSettings() {
  // Load mode (default: click destination)
  const savedMode = (localStorage.getItem('mode') as Mode) || 'click';
  const modeRadio = document.querySelector(`input[name="mode"][value="${savedMode}"]`) as HTMLInputElement;
  if (modeRadio) {
    modeRadio.checked = true;
    applyMode(savedMode);
  }

  // Load trigger (default: double_click)
  const savedTrigger = (localStorage.getItem('trigger') as TriggerMode) || 'double_click';
  const triggerRadio = document.querySelector(`input[name="trigger"][value="${savedTrigger}"]`) as HTMLInputElement;
  if (triggerRadio) {
    triggerRadio.checked = true;
    applyTrigger(savedTrigger);
  }

  // Load highlight size (default: medium)
  const savedSize = (localStorage.getItem('highlightSize') as HighlightSize) || 'medium';
  const sizeSelect = document.getElementById('highlightSize') as HTMLSelectElement;
  if (sizeSelect) {
    sizeSelect.value = savedSize;
    applyHighlightSize(savedSize);
  }
}

/**
 * Initialize the demo on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
  createWorkspace();
  setupEventHandlers();
  loadSettings();
});
