/* eslint-disable camelcase */
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

// p5 Basic Setup Blocks

const p5SetupJson = {
  'type': 'p5_setup',
  'message0': 'setup',
  'message1': '%1',
  'args1': [
    {
      'type': 'input_statement',
      'name': 'STATEMENTS',
    },
  ],
  'colour': 300,
  'tooltip': 'Setup the p5 canvas. This code is run once.',
  'helpUrl': '',
};

const p5Setup = {
  init: function () {
    this.jsonInit(p5SetupJson);
    // The setup block can't be removed.
    this.setDeletable(false);
  },
};

const p5DrawOnceJson = {
  'type': 'p5_draw_once',
  'message0': 'draw once',
  'message1': '%1',
  'args1': [
    {
      'type': 'input_statement',
      'name': 'STATEMENTS',
    },
  ],
  'colour': 300,
  'tooltip':
    'Draw static elements on the canvas. This code runs once after setup.',
  'helpUrl': '',
};

const p5DrawOnce = {
  init: function () {
    this.jsonInit(p5DrawOnceJson);
    // The draw once block can't be removed.
    this.setDeletable(false);
  },
};

const p5AnimateJson = {
  'type': 'p5_animate',
  'message0': 'animate',
  'message1': '%1',
  'args1': [
    {
      'type': 'input_statement',
      'name': 'STATEMENTS',
    },
  ],
  'colour': 320,
  'tooltip':
    'Animate interactive effects. This code runs continuously (~60fps) for gaze-responsive elements.',
  'helpUrl': '',
};

const p5Animate = {
  init: function () {
    this.jsonInit(p5AnimateJson);
    // The animate block can't be removed.
    this.setDeletable(false);
  },
};

// Legacy p5_draw block for backwards compatibility
const p5DrawJson = {
  'type': 'p5_draw',
  'message0': 'draw',
  'message1': '%1',
  'args1': [
    {
      'type': 'input_statement',
      'name': 'STATEMENTS',
    },
  ],
  'colour': 300,
  'tooltip': 'Draw on the canvas. This code is run continuously.',
  'helpUrl': '',
};

const p5Draw = {
  init: function () {
    this.jsonInit(p5DrawJson);
    // The draw block can't be removed.
    this.setDeletable(false);
  },
};

const p5CanvasJson = {
  'type': 'p5_canvas',
  'message0': 'create canvas with width %1 height %2',
  'args0': [
    {
      'type': 'field_number',
      'name': 'WIDTH',
      'value': 400,
      'max': 400,
      'precision': 1,
    },
    {
      'type': 'field_number',
      'name': 'HEIGHT',
      'value': 400,
      'max': 400,
      'precision': 1,
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 300,
  'tooltip': 'Create a p5 canvas of the specified size.',
  'helpUrl': '',
};

const p5Canvas = {
  init: function () {
    this.jsonInit(p5CanvasJson);
    // The canvas block can't be moved or disconnected from its parent.
    this.setMovable(false);
    this.setDeletable(false);
  },
};

const buttonsJson = {
  'type': 'buttons',
  'message0': 'If %1 %2 Then %3 %4 more %5 %6 %7',
  'args0': [
    {
      'type': 'field_image',
      'name': 'BUTTON1',
      'src': 'https://www.gstatic.com/codesite/ph/images/star_on.gif',
      'width': 30,
      'height': 30,
      'alt': '*',
    },
    {
      'type': 'input_value',
      'name': 'VALUE1',
      'check': '',
    },
    {
      'type': 'field_image',
      'name': 'BUTTON2',
      'src': 'https://www.gstatic.com/codesite/ph/images/star_on.gif',
      'width': 30,
      'height': 30,
      'alt': '*',
    },
    {
      'type': 'input_dummy',
      'name': 'DUMMY1',
      'check': '',
    },
    {
      'type': 'input_value',
      'name': 'VALUE2',
      'check': '',
    },
    {
      'type': 'input_statement',
      'name': 'STATEMENT1',
      'check': 'Number',
    },
    {
      'type': 'field_image',
      'name': 'BUTTON3',
      'src': 'https://www.gstatic.com/codesite/ph/images/star_on.gif',
      'width': 30,
      'height': 30,
      'alt': '*',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'tooltip': '',
  'helpUrl': '',
};

const buttonsBlock = {
  init: function () {
    this.jsonInit(buttonsJson);
    const clickHandler = function () {
      console.log('clicking a button!');
    };
    this.getField('BUTTON1').setOnClickHandler(clickHandler);
    this.getField('BUTTON2').setOnClickHandler(clickHandler);
    this.getField('BUTTON3').setOnClickHandler(clickHandler);
  },
};

const background = {
  'type': 'p5_background_color',
  'message0': 'Set background color to %1',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 195,
  'tooltip': 'Set the background color of the canvas',
  'helpUrl': '',
};

const stroke = {
  'type': 'p5_stroke',
  'message0': 'Set stroke color to %1',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 195,
  'tooltip': 'Set the stroke color',
  'helpUrl': '',
};

const fill = {
  'type': 'p5_fill',
  'message0': 'Set fill color to %1',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 195,
  'tooltip': 'Set the fill color',
  'helpUrl': '',
};

const loadBackgroundImageJson = {
  'type': 'load_background_image',
  'message0': '📷 load background image %1 %2 %3 fit mode %4',
  'args0': [
    {
      'type': 'field_image',
      'name': 'SELECT_BTN',
      'src': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSIyNCI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzRDQUY1MCIvPjx0ZXh0IHg9IjQwIiB5PSIxNiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2VsZWN0IEZpbGU8L3RleHQ+PC9zdmc+',
      'width': 80,
      'height': 24,
      'alt': 'Select File',
    },
    {
      'type': 'field_label',
      'name': 'FILENAME',
      'text': '(no file)',
    },
    {
      'type': 'input_dummy',
    },
    {
      'type': 'field_dropdown',
      'name': 'FIT_MODE',
      'options': [
        ['contain (fit inside)', 'contain'],
        ['cover (fill canvas)', 'cover'],
        ['stretch to fit', 'stretch'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 195,
  'tooltip': 'Load an image file to use as background',
  'helpUrl': '',
};

const loadBackgroundImage = {
  init: function () {
    this.jsonInit(loadBackgroundImageJson);

    // Create hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Store reference to clean up later
    this.fileInput = fileInput;

    // Set button click handler
    this.getField('SELECT_BTN').setOnClickHandler(() => {
      fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Size validation
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large (max 5MB). Please choose a smaller image.');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        console.warn('Large image file (' + Math.round(file.size / 1024 / 1024 * 10) / 10 + 'MB), may impact performance');
      }

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        this.data = event.target.result;
        this.getField('FILENAME').setValue(file.name);
      };
      reader.readAsDataURL(file);
    });
  },
};

const ellipse = {
  'type': 'p5_ellipse',
  'message0': 'draw ellipse %1 x %2 y %3 width %4 height %5',
  'args0': [
    {
      'type': 'input_dummy',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'WIDTH',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'HEIGHT',
      'check': 'Number',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'tooltip': 'Draw an ellipse on the canvas.',
  'helpUrl': 'https://p5js.org/reference/#/p5/ellipse',
};

const draw_emoji = {
  'type': 'draw_emoji',
  'tooltip': '',
  'helpUrl': '',
  'message0': 'draw %1 %2',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'emoji',
      'options': [
        ['❤️', '❤️'],
        ['✨', '✨'],
        ['🐻', '🐻'],
      ],
    },
    {
      'type': 'input_dummy',
      'name': '',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'inputsInline': true,
};

const simpleCircle = {
  'type': 'simple_circle',
  'tooltip': '',
  'helpUrl': '',
  'message0': 'draw %1 circle %2',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'inputsInline': true,
};

const writeTextWithoutShadow = {
  'type': 'write_text_without_shadow',
  'tooltip': '',
  'helpUrl': '',
  'message0': 'write without shadow %1',
  'args0': [
    {
      'type': 'field_input',
      'name': 'TEXT',
      'text': 'bit',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 225,
};

const writeTextWithShadow = {
  'type': 'write_text_with_shadow',
  'tooltip': '',
  'helpUrl': '',
  'message0': 'write with shadow %1',
  'args0': [
    {
      'type': 'input_value',
      'name': 'TEXT',
      'check': 'String',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 225,
};

const textBlock = {
  'type': 'text_only',
  'tooltip': '',
  'helpUrl': '',
  'message0': '%1',
  'args0': [
    {
      'type': 'field_input',
      'name': 'TEXT',
      'text': 'micro',
    },
  ],
  'output': 'String',
  'colour': 225,
};

// New drawing blocks with configurable positions

const configurableCircle = {
  'type': 'configurable_circle',
  'tooltip': 'Draw a circle at specific coordinates with custom size and color',
  'helpUrl': 'https://p5js.org/reference/#/p5/circle',
  'message0': 'draw %1 circle at x %2 y %3 diameter %4 %5',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'DIAMETER',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'inputsInline': true,
};

const drawLine = {
  'type': 'draw_line',
  'tooltip': 'Draw a line from point 1 to point 2 with specified color',
  'helpUrl': 'https://p5js.org/reference/#/p5/line',
  'message0': 'draw %1 line from x1 %2 y1 %3 to x2 %4 y2 %5 %6',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X1',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y1',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'X2',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y2',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'inputsInline': true,
};

const drawRectangle = {
  'type': 'draw_rectangle',
  'tooltip':
    'Draw a rectangle at specific coordinates with custom size and color',
  'helpUrl': 'https://p5js.org/reference/#/p5/rect',
  'message0': 'draw %1 rectangle at x %2 y %3 width %4 height %5 %6',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'WIDTH',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'HEIGHT',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 230,
  'inputsInline': true,
};

// Mouse/Gaze Input Blocks

const mouseX = {
  'type': 'mouse_x',
  'tooltip': 'Current mouse/gaze x position on the canvas',
  'helpUrl': 'https://p5js.org/reference/#/p5/mouseX',
  'message0': 'mouse x',
  'output': 'Number',
  'colour': 120,
};

const mouseY = {
  'type': 'mouse_y',
  'tooltip': 'Current mouse/gaze y position on the canvas',
  'helpUrl': 'https://p5js.org/reference/#/p5/mouseY',
  'message0': 'mouse y',
  'output': 'Number',
  'colour': 120,
};

const previousMouseX = {
  'type': 'previous_mouse_x',
  'tooltip': 'Previous mouse/gaze x position (from last frame)',
  'helpUrl': 'https://p5js.org/reference/#/p5/pmouseX',
  'message0': 'previous mouse x',
  'output': 'Number',
  'colour': 120,
};

const previousMouseY = {
  'type': 'previous_mouse_y',
  'tooltip': 'Previous mouse/gaze y position (from last frame)',
  'helpUrl': 'https://p5js.org/reference/#/p5/pmouseY',
  'message0': 'previous mouse y',
  'output': 'Number',
  'colour': 120,
};

const mouseSpeed = {
  'type': 'mouse_speed',
  'tooltip': 'Speed of mouse/gaze movement (distance moved between frames)',
  'helpUrl': '',
  'message0': 'mouse speed',
  'output': 'Number',
  'colour': 120,
};

// Sparkle and Effect Blocks

const drawSparkle = {
  'type': 'draw_sparkle',
  'tooltip':
    'Draw a star-shaped sparkle at the specified position with color and size',
  'helpUrl': '',
  'message0': 'draw %1 sparkle at x %2 y %3 size %4 %5',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'SIZE',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 260,
  'inputsInline': true,
};

const drawTrailCircle = {
  'type': 'draw_trail_circle',
  'tooltip':
    'Draw a fading circle that creates a trail effect behind gaze movement',
  'helpUrl': '',
  'message0': 'draw fading %1 circle at x %2 y %3 size %4 %5',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'SIZE',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 260,
  'inputsInline': true,
};

const drawParticleBurst = {
  'type': 'draw_particle_burst',
  'tooltip': 'Create an explosion of small particles at the specified location',
  'helpUrl': '',
  'message0': 'burst %1 %2 particles at x %3 y %4 %5',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COUNT',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 260,
  'inputsInline': true,
};

const addGlowEffect = {
  'type': 'add_glow_effect',
  'tooltip': 'Add a glowing outline around shapes near the gaze position',
  'helpUrl': '',
  'message0': 'add %1 glow around shapes near x %2 y %3 radius %4 %5',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'RADIUS',
      'check': 'Number',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 260,
  'inputsInline': true,
};

// Helper Condition Blocks

const distanceBetween = {
  'type': 'distance_between',
  'tooltip':
    'Calculate the distance between two points (useful for proximity effects)',
  'helpUrl': '',
  'message0': 'distance from x1 %1 y1 %2 to x2 %3 y2 %4',
  'args0': [
    {
      'type': 'input_value',
      'name': 'X1',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y1',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'X2',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y2',
      'check': 'Number',
    },
  ],
  'output': 'Number',
  'colour': 160,
  'inputsInline': true,
};

const mouseInZone = {
  'type': 'mouse_in_zone',
  'tooltip': 'Check if mouse/gaze is within a rectangular area',
  'helpUrl': '',
  'message0': 'mouse in area x %1 y %2 width %3 height %4',
  'args0': [
    {
      'type': 'input_value',
      'name': 'X',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'Y',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'WIDTH',
      'check': 'Number',
    },
    {
      'type': 'input_value',
      'name': 'HEIGHT',
      'check': 'Number',
    },
  ],
  'output': 'Boolean',
  'colour': 160,
  'inputsInline': true,
};

const mouseMoved = {
  'type': 'mouse_moved',
  'tooltip': 'Check if mouse/gaze has moved since the last frame',
  'helpUrl': '',
  'message0': 'mouse moved',
  'output': 'Boolean',
  'colour': 160,
};

const mouseMovedDistance = {
  'type': 'mouse_moved_distance',
  'tooltip': 'Check if mouse/gaze has moved more than a specific distance',
  'helpUrl': '',
  'message0': 'mouse moved more than %1 pixels',
  'args0': [
    {
      'type': 'input_value',
      'name': 'DISTANCE',
      'check': 'Number',
    },
  ],
  'output': 'Boolean',
  'colour': 160,
  'inputsInline': true,
};

const mouseMovedLessThan = {
  'type': 'mouse_moved_less_than',
  'tooltip': 'Check if mouse/gaze has moved less than a specific distance',
  'helpUrl': '',
  'message0': 'mouse moved less than %1 pixels',
  'args0': [
    {
      'type': 'input_value',
      'name': 'DISTANCE',
      'check': 'Number',
    },
  ],
  'output': 'Boolean',
  'colour': 160,
  'inputsInline': true,
};

const mouseInsideCanvas = {
  'type': 'mouse_inside_canvas',
  'tooltip': 'Check if mouse/gaze is within the canvas boundaries',
  'helpUrl': '',
  'message0': 'mouse inside canvas',
  'output': 'Boolean',
  'colour': 160,
};

const mouseSpeedGreaterThan = {
  'type': 'mouse_speed_greater_than',
  'tooltip': 'Check if mouse/gaze speed is greater than a specific value',
  'helpUrl': '',
  'message0': 'mouse speed greater than %1',
  'args0': [
    {
      'type': 'input_value',
      'name': 'SPEED',
      'check': 'Number',
    },
  ],
  'output': 'Boolean',
  'colour': 160,
  'inputsInline': true,
};

// Face Drawing Blocks

const drawFaceShape = {
  'type': 'draw_face_shape',
  'tooltip': 'Draw a face shape without needing coordinates',
  'helpUrl': '',
  'message0': '😊 draw %1 face shape with %2 skin color %3',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'SHAPE',
      'options': [
        ['round', 'round'],
        ['oval', 'oval'],
        ['square', 'square'],
      ],
    },
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
  'inputsInline': true,
};

const drawEyes = {
  'type': 'draw_eyes',
  'tooltip': 'Draw eyes without needing coordinates',
  'helpUrl': '',
  'message0': '👀 draw %1 eyes',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['normal', 'normal'],
        ['sleepy', 'sleepy'],
        ['wide', 'wide'],
        ['winking', 'winking'],
        ['hearts', 'hearts'],
        ['stars', 'stars'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
};

const drawNose = {
  'type': 'draw_nose',
  'tooltip': 'Draw a nose without needing coordinates',
  'helpUrl': '',
  'message0': '👃 draw %1 nose',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['button', 'button'],
        ['long', 'long'],
        ['large', 'large'],
        ['pig', 'pig'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
};

const drawMouth = {
  'type': 'draw_mouth',
  'tooltip': 'Draw a mouth without needing coordinates',
  'helpUrl': '',
  'message0': '👄 draw %1 mouth',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['smile', 'smile'],
        ['sad', 'sad'],
        ['surprised', 'surprised'],
        ['tongue out', 'tongue_out'],
        ['straight', 'straight'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
};

const drawHair = {
  'type': 'draw_hair',
  'tooltip': 'Draw hair without needing coordinates',
  'helpUrl': '',
  'message0': '💇 draw %1 hair with %2 color %3',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['short', 'short'],
        ['long', 'long'],
        ['curly', 'curly'],
        ['spiky', 'spiky'],
      ],
    },
    {
      'type': 'input_value',
      'name': 'COLOR',
    },
    {
      'type': 'input_dummy',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
  'inputsInline': true,
};

const drawAccessories = {
  'type': 'draw_accessories',
  'tooltip': 'Draw face accessories without needing coordinates',
  'helpUrl': '',
  'message0': '👓 draw %1',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['glasses', 'glasses'],
        ['sunglasses', 'sunglasses'],
        ['bow tie', 'bow_tie'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
};

// Landscape Drawing Blocks

const drawSky = {
  'type': 'draw_sky',
  'tooltip': 'Draw a sky without needing coordinates',
  'helpUrl': '',
  'message0': '☁️ draw %1 sky',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['clear blue', 'clear_blue'],
        ['starry night', 'starry_night'],
        ['sunny', 'sunny'],
        ['cloudy', 'cloudy'],
        ['stormy', 'stormy'],
        ['sunset', 'sunset'],
        ['sunrise', 'sunrise'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 140,
};

const drawWeather = {
  'type': 'draw_weather',
  'tooltip': 'Draw weather elements without needing coordinates',
  'helpUrl': '',
  'message0': '🌤️ draw %1',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['sun', 'sun'],
        ['moon', 'moon'],
        ['stars', 'stars'],
        ['clouds', 'clouds'],
        ['rain', 'rain'],
        ['snow', 'snow'],
        ['rainbow', 'rainbow'],
        ['lightning', 'lightning'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 140,
};

const drawTerrain = {
  'type': 'draw_terrain',
  'tooltip': 'Draw terrain without needing coordinates',
  'helpUrl': '',
  'message0': '⛰️ draw %1 terrain',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['hills', 'hills'],
        ['mountains', 'mountains'],
        ['seaside', 'seaside'],
        ['fields', 'fields'],
        ['desert', 'desert'],
        ['forest', 'forest'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 140,
};

const drawForeground = {
  'type': 'draw_foreground',
  'tooltip': 'Draw foreground elements without needing coordinates',
  'helpUrl': '',
  'message0': '🌿 draw %1 foreground',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['grass', 'grass'],
        ['flowers', 'flowers'],
        ['trees', 'trees'],
        ['rocks', 'rocks'],
        ['beach', 'beach'],
        ['road', 'road'],
        ['none', 'none'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 140,
};

// Complete Scene Blocks

const drawCompleteFace = {
  'type': 'draw_complete_face',
  'tooltip': 'Draw a complete face with all features',
  'helpUrl': '',
  'message0':
    '😊 draw complete face: %1 shape, %2 eyes, %3 nose, %4 mouth, %5 hair',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'FACE_SHAPE',
      'options': [
        ['round', 'round'],
        ['oval', 'oval'],
        ['square', 'square'],
      ],
    },
    {
      'type': 'field_dropdown',
      'name': 'EYES',
      'options': [
        ['normal', 'normal'],
        ['sleepy', 'sleepy'],
        ['wide', 'wide'],
        ['winking', 'winking'],
        ['hearts', 'hearts'],
        ['stars', 'stars'],
      ],
    },
    {
      'type': 'field_dropdown',
      'name': 'NOSE',
      'options': [
        ['button', 'button'],
        ['long', 'long'],
        ['large', 'large'],
        ['pig', 'pig'],
      ],
    },
    {
      'type': 'field_dropdown',
      'name': 'MOUTH',
      'options': [
        ['smile', 'smile'],
        ['sad', 'sad'],
        ['surprised', 'surprised'],
        ['tongue out', 'tongue_out'],
        ['straight', 'straight'],
      ],
    },
    {
      'type': 'field_dropdown',
      'name': 'HAIR',
      'options': [
        ['short', 'short'],
        ['long', 'long'],
        ['curly', 'curly'],
        ['spiky', 'spiky'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
};

const drawCompleteLandscape = {
  'type': 'draw_complete_landscape',
  'tooltip': 'Draw a complete landscape scene',
  'helpUrl': '',
  'message0': '🏞️ draw complete landscape: %1 sky, %2 terrain, %3 weather',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'SKY',
      'options': [
        ['clear blue', 'clear_blue'],
        ['starry night', 'starry_night'],
        ['sunny', 'sunny'],
        ['cloudy', 'cloudy'],
        ['stormy', 'stormy'],
        ['sunset', 'sunset'],
        ['sunrise', 'sunrise'],
      ],
    },
    {
      'type': 'field_dropdown',
      'name': 'TERRAIN',
      'options': [
        ['hills', 'hills'],
        ['mountains', 'mountains'],
        ['seaside', 'seaside'],
        ['fields', 'fields'],
        ['desert', 'desert'],
        ['forest', 'forest'],
      ],
    },
    {
      'type': 'field_dropdown',
      'name': 'WEATHER',
      'options': [
        ['none', 'none'],
        ['sun', 'sun'],
        ['moon', 'moon'],
        ['stars', 'stars'],
        ['clouds', 'clouds'],
        ['rain', 'rain'],
        ['snow', 'snow'],
        ['rainbow', 'rainbow'],
        ['lightning', 'lightning'],
      ],
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 140,
};

// Create the block definitions for all the JSON-only blocks.
// This does not register their definitions with Blockly.
const jsonBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  background,
  stroke,
  fill,
  ellipse,
  draw_emoji,
  simpleCircle,
  writeTextWithoutShadow,
  writeTextWithShadow,
  textBlock,
  configurableCircle,
  drawLine,
  drawRectangle,
  mouseX,
  mouseY,
  previousMouseX,
  previousMouseY,
  mouseSpeed,
  drawSparkle,
  drawTrailCircle,
  drawParticleBurst,
  addGlowEffect,
  distanceBetween,
  mouseInZone,
  mouseMoved,
  mouseMovedDistance,
  mouseMovedLessThan,
  mouseInsideCanvas,
  mouseSpeedGreaterThan,
  drawFaceShape,
  drawEyes,
  drawNose,
  drawMouth,
  drawHair,
  drawAccessories,
  drawSky,
  drawWeather,
  drawTerrain,
  drawForeground,
  drawCompleteFace,
  drawCompleteLandscape,
]);

export const blocks = {
  'p5_setup': p5Setup,
  'p5_draw_once': p5DrawOnce,
  'p5_animate': p5Animate,
  'p5_draw': p5Draw,
  'p5_canvas': p5Canvas,
  'buttons_block': buttonsBlock,
  'load_background_image': loadBackgroundImage,
  ...jsonBlocks,
};
