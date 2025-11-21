/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Blocks for Maze game.
 * Adapted from blockly-games for use with modern Blockly and keyboard navigation.
 */

import * as Blockly from 'blockly/core';
import {javascriptGenerator, Order} from 'blockly/javascript';

/**
 * Counterclockwise arrow to be appended to left turn option.
 */
const LEFT_TURN = ' ↺';

/**
 * Clockwise arrow to be appended to right turn option.
 */
const RIGHT_TURN = ' ↻';

/**
 * Straight arrow for move forward.
 */
const MOVE_FORWARD = ' ↑';

/**
 * Common HSV hue for all movement blocks.
 */
const MOVEMENT_HUE = 290;

/**
 * HSV hue for loop block.
 */
const LOOPS_HUE = 120;

/**
 * Common HSV hue for all logic blocks.
 */
const LOGIC_HUE = 210;

/**
 * Register maze blocks with Blockly.
 */
export function registerMazeBlocks() {
  const TURN_DIRECTIONS: Blockly.MenuOption[] = [
    ['%{BKY_MAZE_TURN_LEFT}', 'turnLeft'],
    ['%{BKY_MAZE_TURN_RIGHT}', 'turnRight'],
  ];

  const PATH_DIRECTIONS: Blockly.MenuOption[] = [
    ['%{BKY_MAZE_PATH_AHEAD}', 'isPathForward'],
    ['%{BKY_MAZE_PATH_LEFT}', 'isPathLeft'],
    ['%{BKY_MAZE_PATH_RIGHT}', 'isPathRight'],
  ];

  // Add arrows to turn options after prefix/suffix have been separated.
  Blockly.Extensions.register('maze_turn_arrows', function (this: Blockly.Block) {
    const field = this.getField('DIR') as Blockly.FieldDropdown;
    const options = field.getOptions();
    if (options.length >= 2) {
      // Modify the display text to add arrows
      const newOptions: Blockly.MenuOption[] = options.map((option, index) => {
        if (index === options.length - 2) {
          return [option[0] + LEFT_TURN, option[1]];
        } else if (index === options.length - 1) {
          return [option[0] + RIGHT_TURN, option[1]];
        }
        return option;
      });
      // Update the options using public API
      (field as any).menuGenerator_ = newOptions;
    }
  });

  Blockly.defineBlocksWithJsonArray([
    // Block for moving forward.
    {
      type: 'maze_moveForward',
      message0: '%{BKY_MAZE_MOVE_FORWARD}',
      previousStatement: null,
      nextStatement: null,
      colour: MOVEMENT_HUE,
      tooltip: '%{BKY_MAZE_MOVE_FORWARD_TOOLTIP}',
    },

    // Block for turning left or right.
    {
      type: 'maze_turn',
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: TURN_DIRECTIONS,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: MOVEMENT_HUE,
      tooltip: '%{BKY_MAZE_TURN_TOOLTIP}',
      extensions: ['maze_turn_arrows'],
    },

    // Block for conditional "if there is a path".
    {
      type: 'maze_if',
      message0: '%1%2%{BKY_MAZE_DO} %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: PATH_DIRECTIONS,
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'input_statement',
          name: 'DO',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: LOGIC_HUE,
      tooltip: '%{BKY_MAZE_IF_TOOLTIP}',
      extensions: ['maze_turn_arrows'],
    },

    // Block for conditional "if there is a path, else".
    {
      type: 'maze_ifElse',
      message0: '%1%2%{BKY_MAZE_DO} %3%{BKY_MAZE_ELSE} %4',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: PATH_DIRECTIONS,
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'input_statement',
          name: 'DO',
        },
        {
          type: 'input_statement',
          name: 'ELSE',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: LOGIC_HUE,
      tooltip: '%{BKY_MAZE_IFELSE_TOOLTIP}',
      extensions: ['maze_turn_arrows'],
    },

    // Block for repeat loop.
    {
      type: 'maze_forever',
      message0: '%{BKY_MAZE_REPEAT_UNTIL} %1%2%{BKY_MAZE_DO} %3',
      args0: [
        {
          type: 'field_image',
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQCAYAAAAiYZ4HAAABGUlEQVQoU2NkwAIYGRn/MzAwMKCrZ2Fh+c/CwvIfXQ0DA8N/FhYWBlRNLCz//zMwMPxnYWH5jyoGVMMIVMPAwPCfhYXlP5oaFpaW/ywsLAyMjIwMDAwM/1lYWP6jqUHRwMDwn5mZmYGBgeE/MzMzA7oaRkZGBgYGhv8sLCz/0dQwMDAwMDMzMzAwMDBgqGFhYWFgZGRkYGBg+I+uhoGB4T8LCwsDAwMDg=',
          width: 12,
          height: 16,
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'input_statement',
          name: 'DO',
        },
      ],
      previousStatement: null,
      colour: LOOPS_HUE,
      tooltip: '%{BKY_MAZE_WHILE_TOOLTIP}',
    },
  ]);

  // JavaScript code generators
  // DON'T use await - just call the functions directly
  // They will queue the animations internally
  javascriptGenerator.forBlock['maze_moveForward'] = function (block) {
    return `moveForward('block_id_${block.id}'); //${MOVE_FORWARD}\n`;
  };

  javascriptGenerator.forBlock['maze_turn'] = function (block) {
    const dir = block.getFieldValue('DIR');
    if (dir === 'turnLeft') {
      return `turnLeft('block_id_${block.id}');    //${LEFT_TURN}\n`;
    } else {
      return `turnRight('block_id_${block.id}');   //${RIGHT_TURN}\n`;
    }
  };

  javascriptGenerator.forBlock['maze_if'] = function (block) {
    const argument = `${block.getFieldValue('DIR')}('block_id_${block.id}')`;
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    return `if (${argument}) {\n${branch}}\n`;
  };

  javascriptGenerator.forBlock['maze_ifElse'] = function (block) {
    const argument = `${block.getFieldValue('DIR')}('block_id_${block.id}')`;
    const branch0 = javascriptGenerator.statementToCode(block, 'DO');
    const branch1 = javascriptGenerator.statementToCode(block, 'ELSE');
    return `if (${argument}) {\n${branch0}} else {\n${branch1}}\n`;
  };

  javascriptGenerator.forBlock['maze_forever'] = function (block) {
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    if (branch) {
      return 'while (notDone()) {\n' + branch + '}\n';
    } else {
      return 'while (notDone()) {}\n';
    }
  };
}
