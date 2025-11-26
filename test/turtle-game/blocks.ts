/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Blocks for Turtle game.
 * Adapted from blockly-games turtle blocks.
 */

import * as Blockly from 'blockly/core';
import {javascriptGenerator, Order} from 'blockly/javascript';

/**
 * Common HSV hue for all turtle blocks.
 */
const HUE = 160;

/**
 * Counterclockwise arrow to be appended to left turn option.
 */
const LEFT_TURN = ' ↺';

/**
 * Clockwise arrow to be appended to right turn option.
 */
const RIGHT_TURN = ' ↻';

/**
 * Initialize all turtle blocks and code generators.
 */
export function initBlocks(): void {
  const MOVE_OPTIONS = [
    ['%{BKY_TURTLE_MOVE_FORWARD}', 'moveForward'],
    ['%{BKY_TURTLE_MOVE_BACKWARD}', 'moveBackward'],
  ];

  const TURN_OPTIONS = [
    ['%{BKY_TURTLE_TURN_RIGHT}' + RIGHT_TURN, 'turnRight'],
    ['%{BKY_TURTLE_TURN_LEFT}' + LEFT_TURN, 'turnLeft'],
  ];

  Blockly.defineBlocksWithJsonArray([
    // Block for moving forward or backwards (external distance).
    {
      type: 'turtle_move',
      message0: '%1%2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: MOVE_OPTIONS,
        },
        {
          type: 'input_value',
          name: 'VALUE',
          check: 'Number',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_MOVE_TOOLTIP}',
    },

    // Block for moving forward or backwards (internal distance).
    {
      type: 'turtle_move_internal',
      message0: '%1%2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: MOVE_OPTIONS,
        },
        {
          type: 'field_dropdown',
          name: 'VALUE',
          options: [
            ['20', '20'],
            ['50', '50'],
            ['100', '100'],
            ['150', '150'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_MOVE_TOOLTIP}',
    },

    // Block for turning left or right (external angle).
    {
      type: 'turtle_turn',
      message0: '%1%2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: TURN_OPTIONS,
        },
        {
          type: 'input_value',
          name: 'VALUE',
          check: 'Number',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_TURN_TOOLTIP}',
    },

    // Block for turning left or right (internal angle).
    {
      type: 'turtle_turn_internal',
      message0: '%1%2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: TURN_OPTIONS,
        },
        {
          type: 'field_dropdown',
          name: 'VALUE',
          options: [
            ['1°', '1'],
            ['45°', '45'],
            ['72°', '72'],
            ['90°', '90'],
            ['120°', '120'],
            ['144°', '144'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_TURN_TOOLTIP}',
    },

    // Block for setting the width.
    {
      type: 'turtle_width',
      message0: '%{BKY_TURTLE_SET_WIDTH}%1',
      args0: [
        {
          type: 'input_value',
          name: 'WIDTH',
          check: 'Number',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_WIDTH_TOOLTIP}',
    },

    // Block for pen up/down.
    {
      type: 'turtle_pen',
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PEN',
          options: [
            ['%{BKY_TURTLE_PEN_UP}', 'penUp'],
            ['%{BKY_TURTLE_PEN_DOWN}', 'penDown'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_PEN_TOOLTIP}',
    },

    // Block for setting the colour (external colour).
    {
      type: 'turtle_colour',
      message0: '%{BKY_TURTLE_SET_COLOUR}%1',
      args0: [
        {
          type: 'input_value',
          name: 'COLOUR',
          check: 'Colour',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '%{BKY_COLOUR_HUE}',
      tooltip: '%{BKY_TURTLE_COLOUR_TOOLTIP}',
    },

    // Block for setting the colour (internal colour).
    {
      type: 'turtle_colour_internal',
      message0: '%{BKY_TURTLE_SET_COLOUR}%1',
      args0: [
        {
          type: 'field_colour',
          name: 'COLOUR',
          colour: '#ff0000',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '%{BKY_COLOUR_HUE}',
      tooltip: '%{BKY_TURTLE_COLOUR_TOOLTIP}',
    },

    // Block for changing turtle visiblity.
    {
      type: 'turtle_visibility',
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'VISIBILITY',
          options: [
            ['%{BKY_TURTLE_HIDE_TURTLE}', 'hideTurtle'],
            ['%{BKY_TURTLE_SHOW_TURTLE}', 'showTurtle'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_VISIBILITY_TOOLTIP}',
    },

    // Block for printing text.
    {
      type: 'turtle_print',
      message0: '%{BKY_TURTLE_PRINT}%1',
      args0: [
        {
          type: 'input_value',
          name: 'TEXT',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_PRINT_TOOLTIP}',
    },

    // Block for setting the font.
    {
      type: 'turtle_font',
      message0: '%{BKY_TURTLE_FONT}%1%2%{BKY_TURTLE_FONT_SIZE}%3%4%5',
      args0: [
        {
          type: 'field_dropdown',
          name: 'FONT',
          options: [
            ['Arial', 'Arial'],
            ['Courier New', 'Courier New'],
            ['Georgia', 'Georgia'],
            ['Impact', 'Impact'],
            ['Times New Roman', 'Times New Roman'],
            ['Trebuchet MS', 'Trebuchet MS'],
            ['Verdana', 'Verdana'],
          ],
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'field_number',
          name: 'FONTSIZE',
          value: 18,
          min: 1,
          max: 1000,
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'field_dropdown',
          name: 'FONTSTYLE',
          options: [
            ['%{BKY_TURTLE_FONT_NORMAL}', 'normal'],
            ['%{BKY_TURTLE_FONT_ITALIC}', 'italic'],
            ['%{BKY_TURTLE_FONT_BOLD}', 'bold'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '%{BKY_TURTLE_FONT_TOOLTIP}',
    },

    // Block for repeat n times (internal number).
    {
      type: 'turtle_repeat_internal',
      message0: '%{BKY_CONTROLS_REPEAT_TITLE}%2%{BKY_CONTROLS_REPEAT_INPUT_DO}%3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TIMES',
          options: [
            ['3', '3'],
            ['4', '4'],
            ['5', '5'],
            ['360', '360'],
          ],
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
      colour: '%{BKY_LOOPS_HUE}',
      tooltip: '%{BKY_CONTROLS_REPEAT_TOOLTIP}',
      helpUrl: '%{BKY_CONTROLS_REPEAT_HELPURL}',
    },
  ]);

  // Code generators
  javascriptGenerator.forBlock['turtle_move'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    const dir = block.getFieldValue('DIR');
    return `${dir}(${value}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_move_internal'] = function(block) {
    const value = Number(block.getFieldValue('VALUE'));
    const dir = block.getFieldValue('DIR');
    return `${dir}(${value}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_turn'] = function(block, generator) {
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    const dir = block.getFieldValue('DIR');
    return `${dir}(${value}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_turn_internal'] = function(block) {
    const value = Number(block.getFieldValue('VALUE'));
    const dir = block.getFieldValue('DIR');
    return `${dir}(${value}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_width'] = function(block, generator) {
    const width = generator.valueToCode(block, 'WIDTH', Order.NONE) || '1';
    return `penWidth(${width}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_pen'] = function(block) {
    const pen = block.getFieldValue('PEN');
    return `${pen}('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_colour'] = function(block, generator) {
    const colour = generator.valueToCode(block, 'COLOUR', Order.NONE) || "'#000000'";
    return `penColour(${colour}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_colour_internal'] = function(block) {
    const colour = block.getFieldValue('COLOUR');
    return `penColour('${colour}', 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_visibility'] = function(block) {
    const visibility = block.getFieldValue('VISIBILITY');
    return `${visibility}('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_print'] = function(block, generator) {
    const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
    return `print(${text}, 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_font'] = function(block) {
    const font = block.getFieldValue('FONT');
    const fontSize = Number(block.getFieldValue('FONTSIZE'));
    const fontStyle = block.getFieldValue('FONTSTYLE');
    return `font('${font}', ${fontSize}, '${fontStyle}', 'block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['turtle_repeat_internal'] =
    javascriptGenerator.forBlock['controls_repeat'];
}
