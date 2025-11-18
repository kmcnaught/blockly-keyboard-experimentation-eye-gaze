/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
// Import the default blocks.
import 'blockly/blocks';
import {installAllBlocks as installColourBlocks} from '@blockly/field-colour';
import {KeyboardNavigation, TriggerMode} from '../src/index';
import {registerFlyoutCursor} from '../src/flyout_cursor';
import {registerNavigationDeferringToolbox} from '../src/navigation_deferring_toolbox';
// @ts-expect-error No types in js file
import {forBlock} from './blocks/p5_generators';
// @ts-expect-error No types in js file
import {blocks} from './blocks/p5_blocks';
// @ts-expect-error No types in js file
import {toolbox as toolboxFlyout} from './blocks/toolbox.js';
// @ts-expect-error No types in js file
import toolboxCategories from './toolboxCategories.js';
// @ts-expect-error No types in js file
import toolboxCustom from './toolboxCustom.js';

import {javascriptGenerator} from 'blockly/javascript';
// @ts-expect-error No types in js file
import {load} from './loadTestBlocks';
import {runCode, registerRunCodeShortcut} from './runCode';
import {createBuildInfoComponent, registerBuildInfoStyles, startBuildInfoAutoRefresh} from '../src/build_info_component';

(window as unknown as {Blockly: typeof Blockly}).Blockly = Blockly;

let autoRunTimer: number | null = null;
let keyboardNavigation: KeyboardNavigation | null = null;

// Mode types
type Mode = 'sticky' | 'click';
type ConnectionSize = 'minimal' | 'medium' | 'large';

// Track whether we're programmatically updating checkboxes to prevent loops
let isUpdatingFromMode = false;

// Define which scenarios are valid for each toolbox type
const TOOLBOX_SCENARIOS: Record<string, string[]> = {
  'toolbox': [
    'blank', 'sun', 'nestedConnections', 'comments', 'simpleCircle',
    'moreBlocks', 'navigationTestBlocks', 'moveStartTestBlocks',
    'moveStatementTestBlocks', 'moveValueTestBlocks', 'emptyWorkspace'
  ], // Default toolbox - general programming blocks (original scenarios)
  'custom': ['blank', 'face', 'landscape', 'effects'], // Custom toolbox - creative p5.js blocks
  'flyout': ['blank'], // Flyout toolbox - minimal
};

/**
 * Check if a scenario is valid for the given toolbox.
 * @param scenario The scenario to check.
 * @param toolbox The toolbox type.
 * @returns True if the scenario is valid for the toolbox.
 */
function isScenarioValidForToolbox(scenario: string, toolbox: string): boolean {
  const validScenarios = TOOLBOX_SCENARIOS[toolbox] || ['blank'];
  return validScenarios.includes(scenario);
}

/**
 * Find which toolbox supports the given scenario.
 * @param scenario The scenario to find a toolbox for.
 * @returns The toolbox type, or 'toolbox' as default.
 */
function getToolboxForScenario(scenario: string): string {
  for (const [toolbox, scenarios] of Object.entries(TOOLBOX_SCENARIOS)) {
    if (scenarios.includes(scenario)) {
      return toolbox;
    }
  }
  return 'toolbox'; // Default fallback
}

/**
 * Parse query params for inject and navigation options and update
 * the fields on the options form to match.
 *
 * @returns An options object with keys for each supported option.
 */
function getOptions() {
  const params = new URLSearchParams(window.location.search);

  const rendererParam = params.get('renderer');
  let renderer = 'zelos';
  // For backwards compatibility with previous behaviour, support
  // (e.g.) ?geras as well as ?renderer=geras:
  if (rendererParam) {
    renderer = rendererParam;
  } else if (params.get('geras')) {
    renderer = 'geras';
  } else if (params.get('thrasos')) {
    renderer = 'thrasos';
  }

  // Get scenario param first
  const scenarioParam = params.get('scenario');
  let scenario = scenarioParam ?? 'blank';

  // Get or auto-select toolbox
  const toolboxParam = params.get('toolbox');
  let toolbox: string;

  if (toolboxParam) {
    // Toolbox param provided - use it and adjust scenario if needed
    toolbox = toolboxParam;

    // If scenario doesn't fit the selected toolbox, default to 'blank'
    if (!isScenarioValidForToolbox(scenario, toolbox)) {
      console.log(`Scenario "${scenario}" is not valid for toolbox "${toolbox}". Defaulting to blank scenario.`);
      scenario = 'blank';
    }
  } else {
    // No toolbox param - auto-select based on scenario
    toolbox = getToolboxForScenario(scenario);
    console.log(`Auto-selected toolbox "${toolbox}" for scenario "${scenario}"`);
  }

  // Select the appropriate toolbox object
  let toolboxObject;
  if (toolbox === 'flyout') {
    toolboxObject = toolboxFlyout;
  } else if (toolbox === 'custom') {
    toolboxObject = toolboxCustom;
    // Apply custom toolbox styling
    document.body.classList.add('custom-toolbox');
  } else {
    toolboxObject = toolboxCategories;
  }

  // Update form inputs to match params, but only after the page is
  // fully loaded as Chrome (at least) tries to restore previous form
  // values and does so _after_ DOMContentLoaded has fired, which can
  // result in the form inputs being out-of-sync with the actual
  // options when doing browswer page navigation.
  window.addEventListener('load', () => {
    (document.getElementById('renderer') as HTMLSelectElement).value = renderer;
    (document.getElementById('toolbox') as HTMLSelectElement).value = toolbox;
    (document.getElementById('scenario') as HTMLSelectElement).value = scenario;
    // Reset trigger mode to default to prevent browser auto-fill mismatch
    (document.getElementById('triggerMode') as HTMLSelectElement).value = 'double_click';
  });

  return {
    scenario,
    renderer,
    toolbox: toolboxObject,
  };
}

/**
 * Create the workspace, including installing keyboard navigation and
 * change listeners.
 *
 * @returns The created workspace.
 */
function createWorkspace(): Blockly.WorkspaceSvg {
  const {scenario, renderer, toolbox} = getOptions();

  const injectOptions = {
    toolbox,
    renderer,
  };
  const blocklyDiv = document.getElementById('blocklyDiv');
  if (!blocklyDiv) {
    throw new Error('Missing blocklyDiv');
  }

  // Must be called before injection.
  KeyboardNavigation.registerKeyboardNavigationStyles();
  registerFlyoutCursor();
  registerNavigationDeferringToolbox();
  const workspace = Blockly.inject(blocklyDiv, injectOptions);

  Blockly.ContextMenuItems.registerCommentOptions();
  const kbNav = new KeyboardNavigation(workspace);
  keyboardNavigation = kbNav;
  // Expose keyboard navigation instance for debugging
  (window as any).kbNav = kbNav;
  registerRunCodeShortcut(runCode);

  // Disable blocks that aren't inside the setup or draw loops.
  workspace.addChangeListener(Blockly.Events.disableOrphans);

  // Track code changes and auto-run with debounce
  workspace.addChangeListener((event: Blockly.Events.Abstract) => {
    // Only auto-run for events that actually change the generated code (AST changes)
    let shouldAutoRun = false;

    if (event.type === Blockly.Events.BLOCK_MOVE) {
      // Only trigger if the block's connections changed, not just position
      const moveEvent = event as Blockly.Events.BlockMove;
      // Check if parent changed (connection change) or if oldCoordinate is undefined
      // (which indicates a connection change rather than just a drag)
      if (moveEvent.oldParentId !== moveEvent.newParentId ||
          moveEvent.oldInputName !== moveEvent.newInputName) {
        shouldAutoRun = true;
      }
    } else if (
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_CHANGE
    ) {
      // These always affect the generated code
      shouldAutoRun = true;
    }

    if (shouldAutoRun) {
      // Clear any existing timer
      if (autoRunTimer !== null) {
        window.clearTimeout(autoRunTimer);
      }

      // Set new timer to run code after 300ms delay
      const tryRunCode = () => {
        // Check if a block is currently being dragged before auto-running
        const isDragging = workspace.isDragging();
        if (!isDragging) {
          runCode();
          autoRunTimer = null;
        } else {
          // Still dragging, retry in another 100ms
          autoRunTimer = window.setTimeout(tryRunCode, 100);
        }
      };
      autoRunTimer = window.setTimeout(tryRunCode, 300);
    }
  });

  load(workspace, scenario);

  // Add padding by scrolling the workspace view slightly to the right
  workspace.scroll(30, 0);

  runCode();

  return workspace;
}

/**
 * Install p5.js blocks and generators.
 */
function addP5() {
  // Installs all four blocks, the colour field, and all language generators.
  installColourBlocks({
    javascript: javascriptGenerator,
  });
  Blockly.common.defineBlocks(blocks);
  Object.assign(javascriptGenerator.forBlock, forBlock);
  javascriptGenerator.addReservedWords('sketch');
}

/**
 * Apply mode settings (sticky drag vs click destination).
 */
function applyMode(mode: Mode) {
  if (!keyboardNavigation) return;

  isUpdatingFromMode = true;

  const highlightCheckbox = document.getElementById('highlightConnections') as HTMLInputElement;
  const keepBlockCheckbox = document.getElementById('keepBlockOnMouse') as HTMLInputElement;
  const connectionSizeRow = document.getElementById('connectionSizeRow');

  if (mode === 'sticky') {
    // Sticky drag: block sticks to mouse, no highlights
    keyboardNavigation.setKeepBlockOnMouse(true);
    keyboardNavigation.setHighlightConnections(false);

    // Update checkboxes to reflect the mode
    if (keepBlockCheckbox) keepBlockCheckbox.checked = true;
    if (highlightCheckbox) highlightCheckbox.checked = false;

    // Hide connection size option since highlights are disabled
    if (connectionSizeRow) connectionSizeRow.style.display = 'none';
  } else {
    // Click destination: click to place, with highlights
    keyboardNavigation.setKeepBlockOnMouse(false);
    keyboardNavigation.setHighlightConnections(true);

    // Update checkboxes to reflect the mode
    if (keepBlockCheckbox) keepBlockCheckbox.checked = false;
    if (highlightCheckbox) highlightCheckbox.checked = true;

    // Show connection size option since highlights are enabled
    if (connectionSizeRow) connectionSizeRow.style.display = 'flex';
  }

  localStorage.setItem('mode', mode);
  isUpdatingFromMode = false;
}

/**
 * Detect current mode from checkbox states.
 */
function detectModeFromCheckboxes(): Mode {
  const highlightCheckbox = document.getElementById('highlightConnections') as HTMLInputElement;
  const keepBlockCheckbox = document.getElementById('keepBlockOnMouse') as HTMLInputElement;

  const highlightEnabled = highlightCheckbox?.checked ?? false;
  const keepBlockEnabled = keepBlockCheckbox?.checked ?? false;

  // Sticky mode: keepBlock on, highlights off
  if (keepBlockEnabled && !highlightEnabled) {
    return 'sticky';
  }
  // Click mode: keepBlock off, highlights on
  else if (!keepBlockEnabled && highlightEnabled) {
    return 'click';
  }
  // Default to click mode for ambiguous states
  return 'click';
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize build info styles
  registerBuildInfoStyles();

  addP5();
  createWorkspace();
  document.getElementById('run')?.addEventListener('click', runCode);
  document.getElementById('rerunButton')?.addEventListener('click', runCode);

  // Wire up mode dropdown
  const modeSelect = document.getElementById('mode') as HTMLSelectElement;
  modeSelect?.addEventListener('change', () => {
    const mode = modeSelect.value as Mode;
    applyMode(mode);
  });

  // Load saved mode or default to 'click'
  const savedMode = (localStorage.getItem('mode') as Mode) || 'click';
  if (modeSelect) {
    modeSelect.value = savedMode;
    applyMode(savedMode);
  }

  // Wire up connection size dropdown
  const connectionSizeSelect = document.getElementById('connectionSize') as HTMLSelectElement;
  const savedConnectionSize = (localStorage.getItem('connectionSize') as ConnectionSize) || 'medium';
  if (connectionSizeSelect) {
    connectionSizeSelect.value = savedConnectionSize;
    keyboardNavigation?.setConnectionSize(savedConnectionSize);
  }
  connectionSizeSelect?.addEventListener('change', () => {
    const size = connectionSizeSelect.value as ConnectionSize;
    keyboardNavigation?.setConnectionSize(size);
    localStorage.setItem('connectionSize', size);
  });

  // Wire up trigger mode dropdown
  const triggerModeSelect = document.getElementById('triggerMode') as HTMLSelectElement;
  triggerModeSelect?.addEventListener('change', () => {
    const mode = triggerModeSelect.value as TriggerMode;
    keyboardNavigation?.setTriggerMode(mode);
  });

  // Wire up advanced toggle button
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedOptions = document.getElementById('advancedOptions');
  advancedToggle?.addEventListener('click', () => {
    const isExpanded = advancedOptions?.classList.contains('visible');
    if (isExpanded) {
      advancedOptions?.classList.remove('visible');
      advancedToggle?.classList.remove('expanded');
    } else {
      advancedOptions?.classList.add('visible');
      advancedToggle?.classList.add('expanded');
    }
  });

  // Wire up advanced checkboxes (these update the underlying settings directly)
  const highlightCheckbox = document.getElementById('highlightConnections') as HTMLInputElement;
  const keepBlockOnMouseCheckbox = document.getElementById('keepBlockOnMouse') as HTMLInputElement;

  // Load from localStorage for advanced checkboxes
  const savedHighlightConnections = localStorage.getItem('highlightConnections');
  if (savedHighlightConnections !== null) {
    highlightCheckbox.checked = savedHighlightConnections === 'true';
  }
  const savedKeepBlockOnMouse = localStorage.getItem('keepBlockOnMouse');
  if (savedKeepBlockOnMouse !== null) {
    keepBlockOnMouseCheckbox.checked = savedKeepBlockOnMouse === 'true';
  }

  // Advanced checkbox handlers - update mode dropdown when changed manually
  highlightCheckbox?.addEventListener('change', () => {
    if (isUpdatingFromMode) return; // Prevent loops

    const enabled = highlightCheckbox.checked;
    keyboardNavigation?.setHighlightConnections(enabled);
    localStorage.setItem('highlightConnections', String(enabled));

    // Update mode dropdown to reflect new state
    const detectedMode = detectModeFromCheckboxes();
    const modeSelect = document.getElementById('mode') as HTMLSelectElement;
    if (modeSelect) modeSelect.value = detectedMode;
    localStorage.setItem('mode', detectedMode);

    // Show/hide connection size based on highlight state
    const connectionSizeRow = document.getElementById('connectionSizeRow');
    if (connectionSizeRow) {
      connectionSizeRow.style.display = enabled ? 'flex' : 'none';
    }
  });

  keepBlockOnMouseCheckbox?.addEventListener('change', () => {
    if (isUpdatingFromMode) return; // Prevent loops

    const enabled = keepBlockOnMouseCheckbox.checked;
    keyboardNavigation?.setKeepBlockOnMouse(enabled);
    localStorage.setItem('keepBlockOnMouse', String(enabled));

    // Update mode dropdown to reflect new state
    const detectedMode = detectModeFromCheckboxes();
    const modeSelect = document.getElementById('mode') as HTMLSelectElement;
    if (modeSelect) modeSelect.value = detectedMode;
    localStorage.setItem('mode', detectedMode);
  });

  // Wire up scenario dropdown to automatically select correct toolbox
  const scenarioSelect = document.getElementById('scenario') as HTMLSelectElement;
  const toolboxSelect = document.getElementById('toolbox') as HTMLSelectElement;
  const optionsForm = document.getElementById('options') as HTMLFormElement;

  scenarioSelect?.addEventListener('change', () => {
    const scenario = scenarioSelect.value;
    const currentToolbox = toolboxSelect.value;

    // If current toolbox doesn't support the scenario, switch to one that does
    if (!isScenarioValidForToolbox(scenario, currentToolbox)) {
      const correctToolbox = getToolboxForScenario(scenario);
      toolboxSelect.value = correctToolbox;
    }

    // Submit the form to reload with new params (after toolbox is updated)
    optionsForm?.submit();
  });

  // Wire up toolbox dropdown to adjust scenario if needed
  toolboxSelect?.addEventListener('change', () => {
    const selectedToolbox = toolboxSelect.value;
    const currentScenario = scenarioSelect.value;

    // If current scenario doesn't fit the selected toolbox, default to 'blank'
    if (!isScenarioValidForToolbox(currentScenario, selectedToolbox)) {
      scenarioSelect.value = 'blank';
    }

    // Submit the form to reload with new params (after scenario is updated)
    optionsForm?.submit();
  });

  // Add build info component to the page
  const buildInfoElement = createBuildInfoComponent();
  document.body.appendChild(buildInfoElement);

  // Start auto-refresh for development (only in development environment)
  if (process.env.NODE_ENV !== 'production') {
    startBuildInfoAutoRefresh(buildInfoElement, 3000); // Check every 3 seconds
  }
  // Add Blockly to the global scope so that test code can access it to
  // verify state after keypresses.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  window.Blockly = Blockly;

  // Global error handler for media (audio/video) elements
  document.addEventListener('error', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'AUDIO' || target.tagName === 'VIDEO') {
      console.error('Media error detected:');
      console.error('  Element:', target.tagName);
      console.error('  Source:', (target as HTMLMediaElement).src || (target as HTMLMediaElement).currentSrc);
      console.error('  Error:', e);
      console.trace('Stack trace:');
    }
  }, true); // Use capture phase to catch errors before they bubble
});
