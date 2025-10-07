/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
// Import the default blocks.
import 'blockly/blocks';
import {installAllBlocks as installColourBlocks} from '@blockly/field-colour';
import {KeyboardNavigation} from '../src/index';
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

import {javascriptGenerator} from 'blockly/javascript';
// @ts-expect-error No types in js file
import {load} from './loadTestBlocks';
import {runCode, registerRunCodeShortcut} from './runCode';
import {createBuildInfoComponent, registerBuildInfoStyles, startBuildInfoAutoRefresh} from '../src/build_info_component';

(window as unknown as {Blockly: typeof Blockly}).Blockly = Blockly;

let codeHasChanged = false;

/**
 * Show the overlay indicating code needs to be re-run.
 */
function showOverlay() {
  const overlay = document.getElementById('canvasOverlay');
  if (overlay) {
    overlay.classList.add('visible');
  }
}

/**
 * Hide the overlay.
 */
function hideOverlay() {
  const overlay = document.getElementById('canvasOverlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }
}

/**
 * Wrapper for runCode that also hides the overlay.
 */
function runCodeAndHideOverlay() {
  runCode();
  codeHasChanged = false;
  hideOverlay();
}

/**
 * Parse query params for inject and navigation options and update
 * the fields on the options form to match.
 *
 * @returns An options object with keys for each supported option.
 */
function getOptions() {
  const params = new URLSearchParams(window.location.search);

  const scenarioParam = params.get('scenario');
  const scenario = scenarioParam ?? 'blank';

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

  const toolboxParam = params.get('toolbox');
  const toolbox = toolboxParam ?? 'toolbox';
  const toolboxObject =
    toolbox === 'flyout' ? toolboxFlyout : toolboxCategories;

  // Update form inputs to match params, but only after the page is
  // fully loaded as Chrome (at least) tries to restore previous form
  // values and does so _after_ DOMContentLoaded has fired, which can
  // result in the form inputs being out-of-sync with the actual
  // options when doing browswer page navigation.
  window.addEventListener('load', () => {
    (document.getElementById('renderer') as HTMLSelectElement).value = renderer;
    (document.getElementById('scenario') as HTMLSelectElement).value = scenario;
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
  // Expose keyboard navigation instance for debugging
  (window as any).kbNav = kbNav;
  registerRunCodeShortcut();

  // Disable blocks that aren't inside the setup or draw loops.
  workspace.addChangeListener(Blockly.Events.disableOrphans);

  // Track code changes and show overlay
  workspace.addChangeListener((event: Blockly.Events.Abstract) => {
    // Only show overlay for events that actually change the code
    if (
      event.type === Blockly.Events.BLOCK_MOVE ||
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_CHANGE
    ) {
      codeHasChanged = true;
      showOverlay();
    }
  });

  load(workspace, scenario);
  runCode();
  codeHasChanged = false;

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
  document.getElementById('run')?.addEventListener('click', runCodeAndHideOverlay);
  document.getElementById('rerunButton')?.addEventListener('click', runCodeAndHideOverlay);  

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
