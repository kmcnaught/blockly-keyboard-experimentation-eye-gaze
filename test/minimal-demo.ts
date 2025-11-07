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
let currentPreset: string | null = null;

// Preset configurations
const PRESETS = {
  '1': {
    name: 'Motor Impaired',
    triggerMode: 'grip_click' as TriggerMode,
    fatterConnections: true,
    highlightConnections: false,
    keepBlockOnMouse: false,
  },
  '2': {
    name: 'Touch Device',
    triggerMode: 'double_click' as TriggerMode,
    fatterConnections: true,
    highlightConnections: true,
    keepBlockOnMouse: true,
  },
  '3': {
    name: 'Precision Mode',
    triggerMode: 'shift_click' as TriggerMode,
    fatterConnections: true,
    highlightConnections: true,
    keepBlockOnMouse: true,
  },
};

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

  // Statement with value input: "knees ___ toes"
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
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Knees and toes',
        helpUrl: '',
      });
    },
  };

  // Value block: "and"
  Blockly.Blocks['connector_and'] = {
    init: function () {
      this.jsonInit({
        type: 'connector_and',
        message0: 'and',
        output: 'String',
        colour: 290,
        tooltip: 'Connector word',
        helpUrl: '',
      });
    },
  };
}

/**
 * Create the minimal toolbox with just our custom blocks.
 */
function createToolbox() {
  return {
    kind: 'flyoutToolbox',
    contents: [
      {
        kind: 'block',
        type: 'song_container',
      },
      {
        kind: 'block',
        type: 'lyric_heads',
      },
      {
        kind: 'block',
        type: 'lyric_shoulders',
      },
      {
        kind: 'block',
        type: 'lyric_knees_toes',
      },
      {
        kind: 'block',
        type: 'connector_and',
      },
    ],
  };
}

/**
 * Load the initial scenario: 7 disconnected blocks.
 */
function loadScenario() {
  if (!workspace) return;

  workspace.clear();

  // Create blocks at specific positions (all disconnected)
  const containerBlock = workspace.newBlock('song_container');
  containerBlock.moveBy(100, 50);
  containerBlock.initSvg();
  containerBlock.render();

  const headsBlock = workspace.newBlock('lyric_heads');
  headsBlock.moveBy(100, 180);
  headsBlock.initSvg();
  headsBlock.render();

  const shouldersBlock = workspace.newBlock('lyric_shoulders');
  shouldersBlock.moveBy(100, 240);
  shouldersBlock.initSvg();
  shouldersBlock.render();

  const knees1Block = workspace.newBlock('lyric_knees_toes');
  knees1Block.moveBy(100, 300);
  knees1Block.initSvg();
  knees1Block.render();

  const knees2Block = workspace.newBlock('lyric_knees_toes');
  knees2Block.moveBy(100, 360);
  knees2Block.initSvg();
  knees2Block.render();

  const and1Block = workspace.newBlock('connector_and');
  and1Block.moveBy(300, 300);
  and1Block.initSvg();
  and1Block.render();

  const and2Block = workspace.newBlock('connector_and');
  and2Block.moveBy(300, 360);
  and2Block.initSvg();
  and2Block.render();
}

/**
 * Apply a preset configuration.
 */
function applyPreset(presetId: string) {
  const preset = PRESETS[presetId as keyof typeof PRESETS];
  if (!preset || !keyboardNavigation) return;

  currentPreset = presetId;

  // Update keyboard navigation settings
  keyboardNavigation.setTriggerMode(preset.triggerMode);
  keyboardNavigation.setFatterConnections(preset.fatterConnections);
  keyboardNavigation.setHighlightConnections(preset.highlightConnections);
  keyboardNavigation.setKeepBlockOnMouse(preset.keepBlockOnMouse);

  // Update UI controls (in case advanced is open)
  const triggerModeSelect = document.getElementById('triggerMode') as HTMLSelectElement;
  const fatterConnectionsCheckbox = document.getElementById('fatterConnections') as HTMLInputElement;
  const highlightConnectionsCheckbox = document.getElementById('highlightConnections') as HTMLInputElement;
  const keepBlockOnMouseCheckbox = document.getElementById('keepBlockOnMouse') as HTMLInputElement;

  if (triggerModeSelect) triggerModeSelect.value = preset.triggerMode;
  if (fatterConnectionsCheckbox) fatterConnectionsCheckbox.checked = preset.fatterConnections;
  if (highlightConnectionsCheckbox) highlightConnectionsCheckbox.checked = preset.highlightConnections;
  if (keepBlockOnMouseCheckbox) keepBlockOnMouseCheckbox.checked = preset.keepBlockOnMouse;

  // Update active button state
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-preset="${presetId}"]`)?.classList.add('active');

  // Save to localStorage
  localStorage.setItem('currentPreset', presetId);

  // Reset workspace to initial state
  loadScenario();
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
    toolbox: createToolbox(),
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
  registerNavigationDeferringToolbox();

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
  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const presetId = target.getAttribute('data-preset');
      if (presetId) {
        applyPreset(presetId);
      }
    });
  });

  // Advanced toggle
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedOptions = document.getElementById('advancedOptions');
  advancedToggle?.addEventListener('click', () => {
    advancedToggle.classList.toggle('expanded');
    advancedOptions?.classList.toggle('visible');
  });

  // Reset button
  const resetButton = document.getElementById('resetButton');
  resetButton?.addEventListener('click', () => {
    loadScenario();
  });

  // Trigger mode dropdown
  const triggerModeSelect = document.getElementById('triggerMode') as HTMLSelectElement;
  triggerModeSelect?.addEventListener('change', () => {
    const mode = triggerModeSelect.value as TriggerMode;
    keyboardNavigation?.setTriggerMode(mode);
    currentPreset = null; // Clear preset selection when manually changing
    document.querySelectorAll('.preset-btn').forEach((btn) => btn.classList.remove('active'));
  });

  // Fatter connections checkbox
  const fatterConnectionsCheckbox = document.getElementById('fatterConnections') as HTMLInputElement;
  fatterConnectionsCheckbox?.addEventListener('change', () => {
    keyboardNavigation?.setFatterConnections(fatterConnectionsCheckbox.checked);
    currentPreset = null;
    document.querySelectorAll('.preset-btn').forEach((btn) => btn.classList.remove('active'));
  });

  // Highlight connections checkbox
  const highlightConnectionsCheckbox = document.getElementById('highlightConnections') as HTMLInputElement;
  highlightConnectionsCheckbox?.addEventListener('change', () => {
    keyboardNavigation?.setHighlightConnections(highlightConnectionsCheckbox.checked);
    currentPreset = null;
    document.querySelectorAll('.preset-btn').forEach((btn) => btn.classList.remove('active'));
  });

  // Keep block on mouse checkbox
  const keepBlockOnMouseCheckbox = document.getElementById('keepBlockOnMouse') as HTMLInputElement;
  keepBlockOnMouseCheckbox?.addEventListener('change', () => {
    keyboardNavigation?.setKeepBlockOnMouse(keepBlockOnMouseCheckbox.checked);
    currentPreset = null;
    document.querySelectorAll('.preset-btn').forEach((btn) => btn.classList.remove('active'));
  });
}

/**
 * Initialize the demo on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
  createWorkspace();
  setupEventHandlers();

  // Check for saved preset
  const savedPreset = localStorage.getItem('currentPreset');
  if (savedPreset && PRESETS[savedPreset as keyof typeof PRESETS]) {
    applyPreset(savedPreset);
  } else {
    // Default to Preset 1
    applyPreset('1');
  }
});
