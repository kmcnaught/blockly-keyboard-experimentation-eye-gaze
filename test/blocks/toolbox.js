/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const p5CategoryContents = [
  {
    kind: 'label',
    text: 'Program Structure',
  },
  {
    kind: 'block',
    type: 'p5_draw_once',
  },
  {
    kind: 'block',
    type: 'p5_animate',
  },
  {
    kind: 'label',
    text: 'Canvas Setup',
  },
  {
    kind: 'block',
    type: 'p5_background_color',
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
    kind: 'block',
    type: 'colour_random',
  },
  {
    kind: 'label',
    text: 'Static Drawing (draw once)',
  },
  {
    kind: 'block',
    type: 'configurable_circle',
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
    kind: 'block',
    type: 'draw_rectangle',
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
    text: 'Gaze-Responsive Effects (animate)',
  },
  {
    kind: 'block',
    type: 'draw_sparkle',
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
    kind: 'block',
    type: 'draw_trail_circle',
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
    kind: 'block',
    type: 'draw_particle_burst',
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
  {
    kind: 'label',
    text: 'Mouse/Gaze Position',
  },
  {
    kind: 'block',
    type: 'mouse_x',
  },
  {
    kind: 'block',
    type: 'mouse_y',
  },
  {
    kind: 'block',
    type: 'mouse_speed',
  },
  {
    kind: 'label',
    text: 'Conditions for Effects',
  },
  {
    kind: 'block',
    type: 'mouse_moved',
  },
  {
    kind: 'block',
    type: 'mouse_moved_distance',
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
    kind: 'block',
    type: 'mouse_in_zone',
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
    kind: 'block',
    type: 'distance_between',
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
  {
    kind: 'label',
    text: 'Face Drawing',
  },
  {
    kind: 'block',
    type: 'draw_face_shape',
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
    kind: 'block',
    type: 'draw_hair',
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
    kind: 'block',
    type: 'draw_eyes',
  },
  {
    kind: 'block',
    type: 'draw_nose',
  },
  {
    kind: 'block',
    type: 'draw_mouth',
  },
];

export const toolbox = {
  'kind': 'flyoutToolbox',
  'contents': p5CategoryContents,
};
