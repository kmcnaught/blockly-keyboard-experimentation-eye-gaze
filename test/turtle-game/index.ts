/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Turtle graphics game with keyboard navigation support.
 * Uses JS-Interpreter for faithful execution with pause/resume and block highlighting.
 */

import * as Blockly from 'blockly/core';
import {javascriptGenerator} from 'blockly/javascript';
import {KeyboardNavigation} from '../../src/index';
import {registerFlyoutCursor} from '../../src/flyout_cursor';
import {registerNavigationDeferringToolbox} from '../../src/navigation_deferring_toolbox';
import {initBlocks} from './blocks';
import {TurtleGame, WIDTH, HEIGHT} from './turtle';
import {loadMessages, getBrowserLocale, msg, type SupportedLocale} from './messages';

// Import JS-Interpreter as a module
// @ts-ignore - js-interpreter doesn't have TypeScript definitions
import Interpreter from 'js-interpreter';

// Initialize locale (browser detection or saved preference)
let currentLocale: SupportedLocale =
  (localStorage.getItem('turtleGameLocale') as SupportedLocale) || getBrowserLocale();

// Load internationalized messages
loadMessages(currentLocale);

// Register turtle-specific blocks
initBlocks();

// Game state
let currentLevel = parseInt(localStorage.getItem('turtleGameLevel') || '1', 10);
let turtleGame: TurtleGame;
let workspace: Blockly.WorkspaceSvg;
let interpreter: any = null;
let isRunning = false;
let animationSpeed = 0.5; // 0 = slow, 1 = fast

/**
 * Update all UI text elements with internationalized messages
 */
function updateUIText() {
  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    pageTitle.textContent = `🐢 ${msg('TURTLE_TITLE')}`;
  }

  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    subtitle.textContent = msg('TURTLE_SUBTITLE');
  }

  const langLabel = document.querySelector('label[for="languageSelect"]');
  if (langLabel) {
    langLabel.textContent = `🌐 ${msg('TURTLE_LANGUAGE_LABEL')}`;
  }

  const runButton = document.getElementById('runButton');
  if (runButton) {
    runButton.textContent = `▶️ ${msg('TURTLE_RUN_PROGRAM')}`;
  }

  const resetButton = document.getElementById('resetButton');
  if (resetButton) {
    resetButton.textContent = `🔄 ${msg('TURTLE_RESET_PROGRAM')}`;
  }

  const speedLabel = document.querySelector('label[for="speedSlider"]');
  if (speedLabel) {
    speedLabel.textContent = msg('TURTLE_SPEED_LABEL');
  }
}

// Update UI text on load
updateUIText();

// CRITICAL: Register keyboard navigation components BEFORE Blockly injection
KeyboardNavigation.registerKeyboardNavigationStyles();
registerFlyoutCursor();
registerNavigationDeferringToolbox();

// Build toolbox based on level
function getToolbox() {
  const blocks: any[] = [];

  // Level 1-9: Simplified blocks with internal values
  if (currentLevel < 10) {
    blocks.push({
      kind: 'block',
      type: 'turtle_move_internal',
      fields: {VALUE: '100'},
    });
    blocks.push({
      kind: 'block',
      type: 'turtle_turn_internal',
      fields: {VALUE: '90'},
    });

    if (currentLevel >= 3) {
      blocks.push({kind: 'block', type: 'turtle_colour_internal'});
    }

    if (currentLevel >= 4) {
      blocks.push({kind: 'block', type: 'turtle_pen'});
    }

    if (currentLevel >= 2) {
      blocks.push({
        kind: 'block',
        type: 'turtle_repeat_internal',
        fields: {TIMES: '4'},
      });
    }
  } else {
    // Level 10: Full blocks with categories (matching original blockly-games)
    return {
      kind: 'categoryToolbox',
      contents: [
        // Turtle category
        {
          kind: 'category',
          name: msg('CATEGORY_TURTLE'),
          colour: '160',
          contents: [
            {
              kind: 'block',
              type: 'turtle_move',
              inputs: {
                VALUE: {shadow: {type: 'math_number', fields: {NUM: 10}}},
              },
            },
            {
              kind: 'block',
              type: 'turtle_turn',
              inputs: {
                VALUE: {shadow: {type: 'math_number', fields: {NUM: 90}}},
              },
            },
            {
              kind: 'block',
              type: 'turtle_width',
              inputs: {
                WIDTH: {shadow: {type: 'math_number', fields: {NUM: 1}}},
              },
            },
            {kind: 'block', type: 'turtle_pen'},
            {kind: 'block', type: 'turtle_visibility'},
            {
              kind: 'block',
              type: 'turtle_print',
              inputs: {
                TEXT: {shadow: {type: 'text', fields: {TEXT: ''}}},
              },
            },
            {kind: 'block', type: 'turtle_font'},
          ],
        },
        // Colour category
        {
          kind: 'category',
          name: msg('CATEGORY_COLOUR'),
          colour: '%{BKY_COLOUR_HUE}',
          contents: [
            {
              kind: 'block',
              type: 'turtle_colour',
              inputs: {
                COLOUR: {shadow: {type: 'colour_picker'}},
              },
            },
            {kind: 'block', type: 'colour_picker'},
            {kind: 'block', type: 'colour_random'},
            {
              kind: 'block',
              type: 'colour_rgb',
              inputs: {
                RED: {shadow: {type: 'math_number', fields: {NUM: 100}}},
                GREEN: {shadow: {type: 'math_number', fields: {NUM: 50}}},
                BLUE: {shadow: {type: 'math_number', fields: {NUM: 0}}},
              },
            },
            {
              kind: 'block',
              type: 'colour_blend',
              inputs: {
                COLOUR1: {shadow: {type: 'colour_picker', fields: {COLOUR: '#ff0000'}}},
                COLOUR2: {shadow: {type: 'colour_picker', fields: {COLOUR: '#3333ff'}}},
                RATIO: {shadow: {type: 'math_number', fields: {NUM: 0.5}}},
              },
            },
          ],
        },
        // Logic category
        {
          kind: 'category',
          name: msg('CATEGORY_LOGIC'),
          colour: '%{BKY_LOGIC_HUE}',
          contents: [
            {kind: 'block', type: 'controls_if'},
            {kind: 'block', type: 'logic_compare'},
            {kind: 'block', type: 'logic_operation'},
            {kind: 'block', type: 'logic_negate'},
            {kind: 'block', type: 'logic_boolean'},
            {kind: 'block', type: 'logic_ternary'},
          ],
        },
        // Loops category
        {
          kind: 'category',
          name: msg('CATEGORY_LOOPS'),
          colour: '%{BKY_LOOPS_HUE}',
          contents: [
            {
              kind: 'block',
              type: 'controls_repeat_ext',
              inputs: {
                TIMES: {shadow: {type: 'math_number', fields: {NUM: 10}}},
              },
            },
            {kind: 'block', type: 'controls_whileUntil'},
            {
              kind: 'block',
              type: 'controls_for',
              inputs: {
                FROM: {shadow: {type: 'math_number', fields: {NUM: 1}}},
                TO: {shadow: {type: 'math_number', fields: {NUM: 10}}},
                BY: {shadow: {type: 'math_number', fields: {NUM: 1}}},
              },
            },
            {kind: 'block', type: 'controls_flow_statements'},
          ],
        },
        // Math category
        {
          kind: 'category',
          name: msg('CATEGORY_MATH'),
          colour: '%{BKY_MATH_HUE}',
          contents: [
            {kind: 'block', type: 'math_number'},
            {
              kind: 'block',
              type: 'math_arithmetic',
              inputs: {
                A: {shadow: {type: 'math_number', fields: {NUM: 1}}},
                B: {shadow: {type: 'math_number', fields: {NUM: 1}}},
              },
            },
            {
              kind: 'block',
              type: 'math_single',
              inputs: {
                NUM: {shadow: {type: 'math_number', fields: {NUM: 9}}},
              },
            },
            {
              kind: 'block',
              type: 'math_trig',
              inputs: {
                NUM: {shadow: {type: 'math_number', fields: {NUM: 45}}},
              },
            },
            {kind: 'block', type: 'math_constant'},
            {
              kind: 'block',
              type: 'math_number_property',
              inputs: {
                NUMBER_TO_CHECK: {shadow: {type: 'math_number', fields: {NUM: 0}}},
              },
            },
            {
              kind: 'block',
              type: 'math_round',
              inputs: {
                NUM: {shadow: {type: 'math_number', fields: {NUM: 3.1}}},
              },
            },
            {
              kind: 'block',
              type: 'math_modulo',
              inputs: {
                DIVIDEND: {shadow: {type: 'math_number', fields: {NUM: 64}}},
                DIVISOR: {shadow: {type: 'math_number', fields: {NUM: 10}}},
              },
            },
            {
              kind: 'block',
              type: 'math_constrain',
              inputs: {
                VALUE: {shadow: {type: 'math_number', fields: {NUM: 50}}},
                LOW: {shadow: {type: 'math_number', fields: {NUM: 1}}},
                HIGH: {shadow: {type: 'math_number', fields: {NUM: 100}}},
              },
            },
            {
              kind: 'block',
              type: 'math_random_int',
              inputs: {
                FROM: {shadow: {type: 'math_number', fields: {NUM: 1}}},
                TO: {shadow: {type: 'math_number', fields: {NUM: 100}}},
              },
            },
            {kind: 'block', type: 'math_random_float'},
          ],
        },
        // Lists category
        {
          kind: 'category',
          name: msg('CATEGORY_LISTS'),
          colour: '%{BKY_LISTS_HUE}',
          contents: [
            {
              kind: 'block',
              type: 'lists_create_with',
              extraState: {itemCount: 0},
            },
            {kind: 'block', type: 'lists_create_with'},
            {
              kind: 'block',
              type: 'lists_repeat',
              inputs: {
                NUM: {shadow: {type: 'math_number', fields: {NUM: 5}}},
              },
            },
            {kind: 'block', type: 'lists_length'},
            {kind: 'block', type: 'lists_isEmpty'},
            {
              kind: 'block',
              type: 'lists_indexOf',
              inputs: {
                VALUE: {
                  block: {type: 'variables_get', fields: {VAR: 'list'}},
                },
              },
            },
            {
              kind: 'block',
              type: 'lists_getIndex',
              inputs: {
                VALUE: {
                  block: {type: 'variables_get', fields: {VAR: 'list'}},
                },
              },
            },
            {
              kind: 'block',
              type: 'lists_setIndex',
              inputs: {
                LIST: {
                  block: {type: 'variables_get', fields: {VAR: 'list'}},
                },
              },
            },
            {
              kind: 'block',
              type: 'lists_getSublist',
              inputs: {
                LIST: {
                  block: {type: 'variables_get', fields: {VAR: 'list'}},
                },
              },
            },
            {kind: 'block', type: 'lists_sort'},
            {kind: 'block', type: 'lists_reverse'},
          ],
        },
        // Separator
        {kind: 'sep'},
        // Variables category (dynamic)
        {
          kind: 'category',
          name: msg('CATEGORY_VARIABLES'),
          colour: '%{BKY_VARIABLES_HUE}',
          custom: 'VARIABLE',
        },
        // Procedures category (dynamic)
        {
          kind: 'category',
          name: msg('CATEGORY_PROCEDURES'),
          colour: '%{BKY_PROCEDURES_HUE}',
          custom: 'PROCEDURE',
        },
      ],
    };
  }

  return {
    kind: 'flyoutToolbox',
    contents: blocks,
  };
}

// Get workspace injection options
function getWorkspaceOptions() {
  return {
    toolbox: getToolbox(),
    trashcan: true,
    zoom: {
      controls: currentLevel === 10,
      wheel: currentLevel === 10,
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
  };
}

// Track keyboard navigation instance
let keyboardNavigation: KeyboardNavigation | null = null;

// Initialize or reinitialize workspace
function initWorkspace() {
  // Dispose of old keyboard navigation first (unregisters shortcuts)
  if (keyboardNavigation) {
    keyboardNavigation.dispose();
    keyboardNavigation = null;
  }

  // Dispose of old workspace if it exists
  if (workspace) {
    workspace.dispose();
  }

  // Create new workspace
  workspace = Blockly.inject('blocklyDiv', getWorkspaceOptions());

  // Initialize keyboard navigation plugin
  keyboardNavigation = new KeyboardNavigation(workspace, {
    highlightConnections: true,
  });

  return workspace;
}

// Initialize Blockly workspace
workspace = initWorkspace();

// Add reserved words to prevent naming conflicts
javascriptGenerator.addReservedWords(
  'moveForward,moveBackward,turnRight,turnLeft,penUp,penDown,' +
  'penWidth,penColour,hideTurtle,showTurtle,print,font'
);

// Initialize turtle game with three canvases
const displayCanvas = document.getElementById('display') as HTMLCanvasElement;
const answerCanvas = document.getElementById('answer') as HTMLCanvasElement;
const scratchCanvas = document.getElementById('scratch') as HTMLCanvasElement;

turtleGame = new TurtleGame(displayCanvas, answerCanvas, scratchCanvas, currentLevel);

// Update level display
function updateLevelDisplay() {
  const levelTitle = document.getElementById('levelTitle');
  const levelDisplay = document.getElementById('levelDisplay');
  const goalDescription = document.querySelector('.goal-description');
  const prevButton = document.getElementById('prevLevel') as HTMLButtonElement;
  const nextButton = document.getElementById('nextLevel') as HTMLButtonElement;

  if (levelTitle) {
    levelTitle.textContent = `${msg('TURTLE_LEVEL')} ${currentLevel}`;
  }

  if (levelDisplay) {
    levelDisplay.textContent = msg('TURTLE_LEVEL_COUNTER', currentLevel, 10);
  }

  if (goalDescription) {
    if (currentLevel === 10) {
      goalDescription.innerHTML = `<strong>${msg('TURTLE_GOAL_LABEL')}</strong> ${msg('TURTLE_HELP_TEXT10')}`;
    } else {
      goalDescription.innerHTML = `<strong>${msg('TURTLE_GOAL_LABEL')}</strong> Match your drawing to the semi-transparent pattern shown on the canvas. The turtle starts in the center facing up.`;
    }
  }

  if (prevButton) {
    prevButton.disabled = currentLevel <= 1;
  }

  if (nextButton) {
    nextButton.disabled = currentLevel >= 10;
  }
}

// Change level
function setLevel(newLevel: number) {
  const oldLevel = currentLevel;
  currentLevel = newLevel;
  localStorage.setItem('turtleGameLevel', currentLevel.toString());

  // Recreate turtle game with new level
  turtleGame = new TurtleGame(displayCanvas, answerCanvas, scratchCanvas, currentLevel);

  // Check if we're crossing the level 9/10 boundary (toolbox mode change)
  const wasCategory = oldLevel === 10;
  const isCategory = newLevel === 10;

  if (wasCategory !== isCategory) {
    // Toolbox mode changed - must recreate workspace
    initWorkspace();
  } else {
    // Same toolbox mode - just update toolbox and clear
    workspace.updateToolbox(getToolbox());
    workspace.clear();
  }

  updateLevelDisplay();
}

// Previous level button handler
document.getElementById('prevLevel')?.addEventListener('click', () => {
  if (currentLevel > 1) {
    setLevel(currentLevel - 1);
  }
});

// Next level button handler
document.getElementById('nextLevel')?.addEventListener('click', () => {
  if (currentLevel < 10) {
    setLevel(currentLevel + 1);
  }
});

// Speed slider
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
if (speedSlider) {
  speedSlider.addEventListener('input', () => {
    animationSpeed = parseFloat(speedSlider.value);
  });
}

// Initialize JS-Interpreter API
function initInterpreter(interpreter: any, globalObject: any) {
  // Helper to create wrapper functions
  const wrap = (name: string, func: (...args: any[]) => void) => {
    const wrapper = function(...args: any[]) {
      func(...args);
    };
    interpreter.setProperty(globalObject, name, interpreter.createNativeFunction(wrapper));
  };

  // Movement functions
  wrap('moveForward', (distance: number, id: string) => {
    turtleGame.move(distance);
    animate(id);
  });

  wrap('moveBackward', (distance: number, id: string) => {
    turtleGame.move(-distance);
    animate(id);
  });

  wrap('turnRight', (angle: number, id: string) => {
    turtleGame.turn(angle);
    animate(id);
  });

  wrap('turnLeft', (angle: number, id: string) => {
    turtleGame.turn(-angle);
    animate(id);
  });

  // Pen functions
  wrap('penUp', (id: string) => {
    turtleGame.setPenDown(false);
    animate(id);
  });

  wrap('penDown', (id: string) => {
    turtleGame.setPenDown(true);
    animate(id);
  });

  wrap('penWidth', (width: number, id: string) => {
    turtleGame.setPenWidth(width);
    animate(id);
  });

  wrap('penColour', (colour: string, id: string) => {
    turtleGame.setPenColour(colour);
    animate(id);
  });

  // Visibility functions
  wrap('hideTurtle', (id: string) => {
    turtleGame.setVisible(false);
    animate(id);
  });

  wrap('showTurtle', (id: string) => {
    turtleGame.setVisible(true);
    animate(id);
  });

  // Text functions
  wrap('print', (text: string, id: string) => {
    turtleGame.print(text);
    animate(id);
  });

  wrap('font', (font: string, size: number, style: string, id: string) => {
    turtleGame.setFont(font, size, style);
    animate(id);
  });

  // Alert for debugging (optional)
  wrap('alert', (text: string) => {
    alert(text);
  });
}

// Animate and highlight block
function animate(id?: string) {
  if (id) {
    turtleGame.display();
    workspace.highlightBlock(id);

    // Calculate delay based on speed slider
    // Speed 0 (slow) = 1000ms, Speed 1 (fast) = 10ms
    const delay = Math.max(10, 1000 * (1 - animationSpeed) * (1 - animationSpeed));

    // Return a promise that resolves after the delay
    return new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
    });
  }
  return Promise.resolve();
}

// Execute the user's program
async function execute() {
  if (isRunning) {
    alert(msg('TURTLE_ALERT_ALREADY_RUNNING'));
    return;
  }

  const runButton = document.getElementById('runButton');
  const resetButton = document.getElementById('resetButton');

  if (runButton) runButton.style.display = 'none';
  if (resetButton) resetButton.style.display = 'inline';

  isRunning = true;
  turtleGame.reset();

  // Generate code
  const code = javascriptGenerator.workspaceToCode(workspace);

  // Create interpreter
  interpreter = new Interpreter(code, initInterpreter);

  // Run interpreter
  try {
    let steps = 0;
    const maxSteps = 100000; // Prevent infinite loops

    while (interpreter.step() && steps < maxSteps) {
      steps++;
      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (steps >= maxSteps) {
      alert('Program took too long to execute. It may have an infinite loop.');
    }
  } catch (error) {
    console.error('Execution error:', error);
    alert(`Error: ${error}`);
  }

  // Clear highlighting
  workspace.highlightBlock(null);

  // Check answer
  if (!isRunning) return; // User hit reset during execution

  const blockCount = workspace.getAllBlocks(false).length;
  const result = turtleGame.checkAnswer(blockCount);

  if (result.correct) {
    alert(msg('TURTLE_SUCCESS_MESSAGE'));
    if (currentLevel < 10) {
      // Move to next level
      setTimeout(() => {
        if (confirm(msg('TURTLE_NEXT_LEVEL', currentLevel + 1))) {
          setLevel(currentLevel + 1);
        }
      }, 500);
    }
  } else if (result.message) {
    alert(result.message);
  }

  isRunning = false;
  if (runButton) runButton.style.display = 'inline';
  if (resetButton) resetButton.style.display = 'none';
}

// Run button handler
document.getElementById('runButton')?.addEventListener('click', () => {
  execute();
});

// Reset button handler
document.getElementById('resetButton')?.addEventListener('click', () => {
  isRunning = false;
  interpreter = null;
  workspace.highlightBlock(null);
  turtleGame.reset();

  const runButton = document.getElementById('runButton');
  const resetButton = document.getElementById('resetButton');
  if (runButton) runButton.style.display = 'inline';
  if (resetButton) resetButton.style.display = 'none';
});

// Language selector handler
const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
if (languageSelect) {
  languageSelect.value = currentLocale;

  languageSelect.addEventListener('change', () => {
    const newLocale = languageSelect.value as SupportedLocale;
    localStorage.setItem('turtleGameLocale', newLocale);
    window.location.reload();
  });
}

// Initial level display update
updateLevelDisplay();

console.log(`Turtle game initialized with keyboard navigation support (level: ${currentLevel}, locale: ${currentLocale})`);
