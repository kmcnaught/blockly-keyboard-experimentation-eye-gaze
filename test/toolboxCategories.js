/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {p5CategoryContents} from './blocks/toolbox.js';

export default {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Events',
      categorystyle: 'procedure_category',
      cssConfig: {
        icon: 'icon-events',
      },
      contents: [
        {
          type: 'p5_draw_once',
          kind: 'block',
        },
        {
          type: 'p5_animate',
          kind: 'block',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      categorystyle: 'logic_category',
      cssConfig: {
        icon: 'icon-logic',
      },
      contents: [
        {
          type: 'controls_if',
          kind: 'block',
        },
        {
          type: 'logic_boolean',
          kind: 'block',
          fields: {
            BOOL: 'TRUE',
          },
        },
        {
          type: 'logic_negate',
          kind: 'block',
        },
        {
          type: 'logic_operation',
          kind: 'block',
          fields: {
            OP: 'AND',
          },
        },
        {
          type: 'controls_repeat_ext',
          kind: 'block',
          inputs: {
            TIMES: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 5,
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Maths',
      categorystyle: 'math_category',
      cssConfig: {
        icon: 'icon-maths',
      },
      contents: [
        {
          type: 'math_number',
          kind: 'block',
          fields: {
            NUM: 100,
          },
        },
        {
          type: 'math_arithmetic',
          kind: 'block',
          fields: {
            OP: 'ADD',
          },
          inputs: {
            A: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 10,
                },
              },
            },
            B: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 5,
                },
              },
            },
          },
        },
        {
          type: 'math_random_int',
          kind: 'block',
          inputs: {
            FROM: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
            TO: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 400,
                },
              },
            },
          },
        },
        {
          type: 'math_constrain',
          kind: 'block',
          inputs: {
            VALUE: {
              shadow: {
                type: 'mouse_x',
              },
            },
            LOW: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
            HIGH: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 400,
                },
              },
            },
          },
        },
        {
          type: 'distance_between',
          kind: 'block',
          inputs: {
            X1: {
              shadow: {
                type: 'mouse_x',
              },
            },
            Y1: {
              shadow: {
                type: 'mouse_y',
              },
            },
            X2: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 200,
                },
              },
            },
            Y2: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 200,
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Conditions',
      categorystyle: 'logic_category',
      cssConfig: {
        icon: 'icon-conditions',
      },
      contents: [
        {
          type: 'logic_compare',
          kind: 'block',
          fields: {
            OP: 'GT',
          },
        },
        {
          type: 'mouse_moved',
          kind: 'block',
        },
        {
          type: 'mouse_moved_distance',
          kind: 'block',
          inputs: {
            DISTANCE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 20,
                },
              },
            },
          },
        },
        {
          type: 'mouse_moved_less_than',
          kind: 'block',
          inputs: {
            DISTANCE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 20,
                },
              },
            },
          },
        },
        {
          type: 'mouse_in_zone',
          kind: 'block',
          inputs: {
            X: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
            Y: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
            WIDTH: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 200,
                },
              },
            },
            HEIGHT: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 200,
                },
              },
            },
          },
        },
        {
          type: 'mouse_inside_canvas',
          kind: 'block',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Input Values',
      categorystyle: 'math_category',
      cssConfig: {
        icon: 'icon-input',
      },
      contents: [
        {
          kind: 'label',
          text: 'Mouse/Gaze Position',
        },
        {
          type: 'mouse_x',
          kind: 'block',
        },
        {
          type: 'mouse_y',
          kind: 'block',
        },
        {
          type: 'mouse_speed',
          kind: 'block',
        },
        {
          kind: 'label',
          text: 'Random Values',
        },
        {
          type: 'colour_random',
          kind: 'block',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Draw faces',
      colour: '20',
      cssConfig: {
        icon: 'icon-faces',
      },
      contents: [
        {
          type: 'draw_face_shape',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#CD853F',
                },
              },
            },
          },
        },
        {
          type: 'draw_eyes',
          kind: 'block',
        },
        {
          type: 'draw_nose',
          kind: 'block',
        },
        {
          type: 'draw_mouth',
          kind: 'block',
        },
        {
          type: 'draw_hair',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#654321',
                },
              },
            },
          },
        },
        {
          type: 'draw_accessories',
          kind: 'block',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Draw landscape',
      colour: '140',
      cssConfig: {
        icon: 'icon-landscape',
      },
      contents: [
        {
          type: 'draw_sky',
          kind: 'block',
        },
        {
          type: 'draw_weather',
          kind: 'block',
        },
        {
          type: 'draw_terrain',
          kind: 'block',
        },
        {
          type: 'draw_foreground',
          kind: 'block',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Draw effects',
      categorystyle: 'procedure_category',
      cssConfig: {
        icon: 'icon-effects',
      },
      contents: [
        {
          kind: 'label',
          text: 'Canvas Setup',
        },
        {
          type: 'p5_background_color',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#000033',
                },
              },
            },
          },
        },
        {
          kind: 'label',
          text: 'Basic Shapes',
        },
        {
          type: 'configurable_circle',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#ff6600',
                },
              },
            },
            X: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 200,
                },
              },
            },
            Y: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 200,
                },
              },
            },
            DIAMETER: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 80,
                },
              },
            },
          },
        },
        {
          type: 'draw_rectangle',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#00ff88',
                },
              },
            },
            X: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 150,
                },
              },
            },
            Y: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 150,
                },
              },
            },
            WIDTH: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 100,
                },
              },
            },
            HEIGHT: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 60,
                },
              },
            },
          },
        },
        {
          kind: 'label',
          text: 'Interactive Effects',
        },
        {
          type: 'draw_sparkle',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#ffff00',
                },
              },
            },
            X: {
              shadow: {
                type: 'mouse_x',
              },
            },
            Y: {
              shadow: {
                type: 'mouse_y',
              },
            },
            SIZE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 15,
                },
              },
            },
          },
        },
        {
          type: 'draw_trail_circle',
          kind: 'block',
          inputs: {
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#ff00ff',
                },
              },
            },
            X: {
              shadow: {
                type: 'mouse_x',
              },
            },
            Y: {
              shadow: {
                type: 'mouse_y',
              },
            },
            SIZE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 25,
                },
              },
            },
          },
        },
        {
          type: 'draw_particle_burst',
          kind: 'block',
          inputs: {
            COUNT: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 8,
                },
              },
            },
            COLOR: {
              shadow: {
                type: 'colour_picker',
                fields: {
                  COLOUR: '#00ffff',
                },
              },
            },
            X: {
              shadow: {
                type: 'mouse_x',
              },
            },
            Y: {
              shadow: {
                type: 'mouse_y',
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',
      cssConfig: {
        icon: 'icon-variables',
      },
    },
  ],
};
