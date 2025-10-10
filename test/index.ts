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
    // Toolbox param provided - use it
    toolbox = toolboxParam;
  } else {
    // No toolbox param - auto-select based on scenario
    toolbox = getToolboxForScenario(scenario);
    console.log(`Auto-selected toolbox "${toolbox}" for scenario "${scenario}"`);
  }

  // Validate scenario/toolbox combination and fix if needed
  if (!isScenarioValidForToolbox(scenario, toolbox)) {
    console.warn(`Scenario "${scenario}" is not valid for toolbox "${toolbox}". Auto-selecting correct toolbox.`);
    toolbox = getToolboxForScenario(scenario);
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

document.addEventListener('DOMContentLoaded', () => {
  // Initialize build info styles
  registerBuildInfoStyles();

  addP5();
  createWorkspace();
  document.getElementById('run')?.addEventListener('click', runCode);
  document.getElementById('rerunButton')?.addEventListener('click', runCode);

  // Wire up connection highlighting checkbox
  const highlightCheckbox = document.getElementById('highlightConnections') as HTMLInputElement;
  // Load from localStorage, or use checkbox default
  const savedHighlightConnections = localStorage.getItem('highlightConnections');
  if (savedHighlightConnections !== null) {
    highlightCheckbox.checked = savedHighlightConnections === 'true';
  }
  if (highlightCheckbox) {
    keyboardNavigation?.setHighlightConnections(highlightCheckbox.checked);
  }
  highlightCheckbox?.addEventListener('change', () => {
    const enabled = highlightCheckbox.checked;
    keyboardNavigation?.setHighlightConnections(enabled);
    localStorage.setItem('highlightConnections', String(enabled));
  });

  // Wire up fatter connections checkbox
  const fatterConnectionsCheckbox = document.getElementById('fatterConnections') as HTMLInputElement;
  // Load from localStorage, or use checkbox default
  const savedFatterConnections = localStorage.getItem('fatterConnections');
  if (savedFatterConnections !== null) {
    fatterConnectionsCheckbox.checked = savedFatterConnections === 'true';
  }
  if (fatterConnectionsCheckbox) {
    keyboardNavigation?.setFatterConnections(fatterConnectionsCheckbox.checked);
  }
  fatterConnectionsCheckbox?.addEventListener('change', () => {
    const enabled = fatterConnectionsCheckbox.checked;
    keyboardNavigation?.setFatterConnections(enabled);
    localStorage.setItem('fatterConnections', String(enabled));
  });

  // Wire up keep block on mouse checkbox
  const keepBlockOnMouseCheckbox = document.getElementById('keepBlockOnMouse') as HTMLInputElement;
  // Load from localStorage, or use checkbox default
  const savedKeepBlockOnMouse = localStorage.getItem('keepBlockOnMouse');
  if (savedKeepBlockOnMouse !== null) {
    keepBlockOnMouseCheckbox.checked = savedKeepBlockOnMouse === 'true';
  }
  if (keepBlockOnMouseCheckbox) {
    keyboardNavigation?.setKeepBlockOnMouse(keepBlockOnMouseCheckbox.checked);
  }
  keepBlockOnMouseCheckbox?.addEventListener('change', () => {
    const enabled = keepBlockOnMouseCheckbox.checked;
    keyboardNavigation?.setKeepBlockOnMouse(enabled);
    localStorage.setItem('keepBlockOnMouse', String(enabled));
  });

  // Wire up trigger mode dropdown
  const triggerModeSelect = document.getElementById('triggerMode') as HTMLSelectElement;
  triggerModeSelect?.addEventListener('change', () => {
    const mode = triggerModeSelect.value as TriggerMode;
    keyboardNavigation?.setTriggerMode(mode);
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
