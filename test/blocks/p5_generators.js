/* eslint-disable camelcase */
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Order} from 'blockly/javascript';

// Export all the code generators for our custom blocks,
// but don't register them with Blockly yet.
// This file has no side effects!
export const forBlock = Object.create(null);

forBlock['text_print'] = function (block, generator) {
  const msg = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
  return `sketch.text(${msg}, 20, 20);\n`;
};

forBlock['p5_setup'] = function (block, generator) {
  const statements = generator.statementToCode(block, 'STATEMENTS');
  const code = `sketch.setup = function() {
  ${statements}
  // Call drawOnce after setup if it exists
  if (typeof sketch.drawOnce === 'function') {
    sketch.drawOnce();
  }
};
`;
  return code;
};

forBlock['p5_draw_once'] = function (block, generator) {
  const statements = generator.statementToCode(block, 'STATEMENTS');
  const code = `sketch.drawOnce = function() {
${statements}};\n`;
  return code;
};

forBlock['p5_animate'] = function (block, generator) {
  const statements = generator.statementToCode(block, 'STATEMENTS');
  const code = `sketch.draw = function() {
${statements}};\n`;
  return code;
};

// Legacy p5_draw generator (same as p5_animate for backwards compatibility)
forBlock['p5_draw'] = function (block, generator) {
  const statements = generator.statementToCode(block, 'STATEMENTS');
  const code = `sketch.draw = function() {
${statements}};\n`;
  return code;
};

forBlock['p5_canvas'] = function (block) {
  const width = block.getFieldValue('WIDTH') || 400;
  const height = block.getFieldValue('HEIGHT') || 400;
  return `sketch.createCanvas(${width}, ${height});\n`;
};

forBlock['p5_background_color'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#fff'`;
  const code = `sketch.background(${color});\n`;
  return code;
};

forBlock['p5_stroke'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#fff'`;
  const code = `sketch.stroke(${color});\n`;
  return code;
};

forBlock['p5_fill'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#fff'`;
  const code = `sketch.fill(${color});\n`;
  return code;
};

forBlock['p5_ellipse'] = function (block, generator) {
  const x = generator.valueToCode(block, 'X', Order.NONE) || 0;
  const y = generator.valueToCode(block, 'Y', Order.NONE) || 0;
  const width = generator.valueToCode(block, 'WIDTH', Order.NONE) || 0;
  const height = generator.valueToCode(block, 'HEIGHT', Order.NONE) || 0;
  return `sketch.ellipse(${x}, ${y}, ${width}, ${height});\n`;
};

forBlock['draw_emoji'] = function (block) {
  const dropdown_emoji = block.getFieldValue('emoji');
  const code = `sketch.textSize(100);
sketch.text('${dropdown_emoji}', 150, 200);\n`;
  return code;
};

forBlock['simple_circle'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#fff'`;
  const code = `sketch.fill(${color});
sketch.stroke(${color});
sketch.ellipse(150, 150, 50, 50);`;
  return code;
};

forBlock['text_only'] = function (block, generator) {
  const code = generator.quote_(block.getFieldValue('TEXT'));
  return [code, Order.ATOMIC];
};

forBlock['write_text_with_shadow'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.ATOMIC) || `''`;
  const code = `\nsketch.stroke(0x000000);
sketch.fill(0x000000);
sketch.textSize(100);
sketch.text(${text}, 50, 350);\n`;
  return code;
};

forBlock['write_text_without_shadow'] = function (block, generator) {
  const text = generator.quote_(block.getFieldValue('TEXT'));
  const code = `\nsketch.stroke(0x000000);
sketch.fill(0x000000);
sketch.textSize(100);
sketch.text(${text}, 50, 350);\n`;
  return code;
};

// New drawing block generators

forBlock['configurable_circle'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#ff0000'`;
  const x = generator.valueToCode(block, 'X', Order.NONE) || '100';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '100';
  const diameter = generator.valueToCode(block, 'DIAMETER', Order.NONE) || '50';
  return `sketch.fill(${color});
sketch.stroke(${color});
sketch.circle(${x}, ${y}, ${diameter});\n`;
};

forBlock['draw_line'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#000000'`;
  const x1 = generator.valueToCode(block, 'X1', Order.NONE) || '0';
  const y1 = generator.valueToCode(block, 'Y1', Order.NONE) || '0';
  const x2 = generator.valueToCode(block, 'X2', Order.NONE) || '100';
  const y2 = generator.valueToCode(block, 'Y2', Order.NONE) || '100';
  return `sketch.stroke(${color});
sketch.line(${x1}, ${y1}, ${x2}, ${y2});\n`;
};

forBlock['draw_rectangle'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#0000ff'`;
  const x = generator.valueToCode(block, 'X', Order.NONE) || '50';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '50';
  const width = generator.valueToCode(block, 'WIDTH', Order.NONE) || '100';
  const height = generator.valueToCode(block, 'HEIGHT', Order.NONE) || '100';
  return `sketch.fill(${color});
sketch.stroke(${color});
sketch.rect(${x}, ${y}, ${width}, ${height});\n`;
};

// Mouse/Gaze Input Generators

forBlock['mouse_x'] = function (block, generator) {
  return ['sketch.mouseX', Order.ATOMIC];
};

forBlock['mouse_y'] = function (block, generator) {
  return ['sketch.mouseY', Order.ATOMIC];
};

forBlock['previous_mouse_x'] = function (block, generator) {
  return ['sketch.pmouseX', Order.ATOMIC];
};

forBlock['previous_mouse_y'] = function (block, generator) {
  return ['sketch.pmouseY', Order.ATOMIC];
};

forBlock['mouse_speed'] = function (block, generator) {
  return ['sketch.dist(sketch.mouseX, sketch.mouseY, sketch.pmouseX, sketch.pmouseY)', Order.FUNCTION_CALL];
};

// Sparkle and Effect Generators

forBlock['draw_sparkle'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#ffff00'`;
  const x = generator.valueToCode(block, 'X', Order.NONE) || '100';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '100';
  const size = generator.valueToCode(block, 'SIZE', Order.NONE) || '10';
  return `sketch.push();
sketch.fill(${color});
sketch.stroke(${color});
sketch.translate(${x}, ${y});
sketch.scale(${size} / 10);
// Draw a star shape
sketch.beginShape();
for (let i = 0; i < 10; i++) {
  let angle = sketch.map(i, 0, 10, 0, sketch.TWO_PI);
  let r = (i % 2 === 0) ? 5 : 2.5;
  let px = sketch.cos(angle) * r;
  let py = sketch.sin(angle) * r;
  sketch.vertex(px, py);
}
sketch.endShape(sketch.CLOSE);
sketch.pop();\n`;
};

forBlock['draw_trail_circle'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#ff00ff'`;
  const x = generator.valueToCode(block, 'X', Order.NONE) || '100';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '100';
  const size = generator.valueToCode(block, 'SIZE', Order.NONE) || '20';
  return `sketch.push();
let trailColor = sketch.color(${color});
trailColor.setAlpha(50); // Semi-transparent for trail effect (faster fade)
sketch.fill(trailColor);
sketch.noStroke();
sketch.circle(${x}, ${y}, ${size});
sketch.pop();\n`;
};

forBlock['draw_particle_burst'] = function (block, generator) {
  const count = generator.valueToCode(block, 'COUNT', Order.NONE) || '10';
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#00ffff'`;
  const x = generator.valueToCode(block, 'X', Order.NONE) || '100';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '100';
  return `sketch.push();
sketch.fill(${color});
sketch.noStroke();
for (let i = 0; i < ${count}; i++) {
  let angle = sketch.random(sketch.TWO_PI);
  let distance = sketch.random(10, 30);
  let px = ${x} + sketch.cos(angle) * distance;
  let py = ${y} + sketch.sin(angle) * distance;
  let size = sketch.random(2, 6);
  sketch.circle(px, py, size);
}
sketch.pop();\n`;
};

forBlock['add_glow_effect'] = function (block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#ffffff'`;
  const x = generator.valueToCode(block, 'X', Order.NONE) || '100';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '100';
  const radius = generator.valueToCode(block, 'RADIUS', Order.NONE) || '50';
  return `sketch.push();
sketch.drawingContext.shadowColor = ${color};
sketch.drawingContext.shadowBlur = 20;
sketch.noFill();
sketch.stroke(${color});
sketch.strokeWeight(3);
sketch.circle(${x}, ${y}, ${radius} * 2);
sketch.pop();\n`;
};

// Helper Condition Generators

forBlock['distance_between'] = function (block, generator) {
  const x1 = generator.valueToCode(block, 'X1', Order.NONE) || '0';
  const y1 = generator.valueToCode(block, 'Y1', Order.NONE) || '0';
  const x2 = generator.valueToCode(block, 'X2', Order.NONE) || '0';
  const y2 = generator.valueToCode(block, 'Y2', Order.NONE) || '0';
  return [`sketch.dist(${x1}, ${y1}, ${x2}, ${y2})`, Order.FUNCTION_CALL];
};

forBlock['mouse_in_zone'] = function (block, generator) {
  const x = generator.valueToCode(block, 'X', Order.NONE) || '0';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  const width = generator.valueToCode(block, 'WIDTH', Order.NONE) || '100';
  const height = generator.valueToCode(block, 'HEIGHT', Order.NONE) || '100';
  return [`(sketch.mouseX >= ${x} && sketch.mouseX <= ${x} + ${width} && sketch.mouseY >= ${y} && sketch.mouseY <= ${y} + ${height})`, Order.LOGICAL_AND];
};

forBlock['mouse_moved'] = function (block, generator) {
  return ['(sketch.mouseX !== sketch.pmouseX || sketch.mouseY !== sketch.pmouseY)', Order.LOGICAL_OR];
};

forBlock['mouse_moved_distance'] = function (block, generator) {
  const distance = generator.valueToCode(block, 'DISTANCE', Order.NONE) || '10';
  return [`(sketch.dist(sketch.mouseX, sketch.mouseY, sketch.pmouseX, sketch.pmouseY) > ${distance})`, Order.RELATIONAL];
};

forBlock['mouse_moved_less_than'] = function (block, generator) {
  const distance = generator.valueToCode(block, 'DISTANCE', Order.NONE) || '10';
  return [`(sketch.dist(sketch.mouseX, sketch.mouseY, sketch.pmouseX, sketch.pmouseY) < ${distance})`, Order.RELATIONAL];
};

forBlock['mouse_inside_canvas'] = function (block, generator) {
  return ['(sketch.mouseX >= 0 && sketch.mouseX <= sketch.width && sketch.mouseY >= 0 && sketch.mouseY <= sketch.height)', Order.LOGICAL_AND];
};

forBlock['mouse_speed_greater_than'] = function (block, generator) {
  const speed = generator.valueToCode(block, 'SPEED', Order.NONE) || '10';
  return [`(sketch.dist(sketch.mouseX, sketch.mouseY, sketch.pmouseX, sketch.pmouseY) > ${speed})`, Order.RELATIONAL];
};

// Complete Scene Generators (adding them early)

forBlock['draw_complete_face'] = function (block, generator) {
  const faceShape = block.getFieldValue('FACE_SHAPE');
  const eyes = block.getFieldValue('EYES');
  const nose = block.getFieldValue('NOSE');
  const mouth = block.getFieldValue('MOUTH');
  const hair = block.getFieldValue('HAIR');

  let code = '// Complete Face\n';

  // Face shape
  code += `sketch.fill('#FFDBAC');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(200, 200, 120);
`;

  // Eyes
  code += `sketch.fill('#FFFFFF');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(180, 180, 20, 15);
sketch.ellipse(220, 180, 20, 15);
sketch.fill('#000000');
sketch.noStroke();
sketch.circle(180, 180, 8);
sketch.circle(220, 180, 8);
`;

  // Nose
  code += `sketch.fill('#FFDBAC');
sketch.stroke('#000000');
sketch.strokeWeight(1);
sketch.ellipse(200, 200, 8, 12);
`;

  // Mouth
  code += `sketch.noFill();
sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.arc(200, 220, 40, 30, 0, sketch.PI);
`;

  return code;
};

forBlock['draw_complete_landscape'] = function (block, generator) {
  const sky = block.getFieldValue('SKY');
  const terrain = block.getFieldValue('TERRAIN');
  const weather = block.getFieldValue('WEATHER');

  let code = '// Complete Landscape\n';

  // Sky
  code += `sketch.fill('#87CEEB');
sketch.noStroke();
sketch.rect(0, 0, 400, 200);
`;

  // Terrain
  code += `sketch.fill('#228B22');
sketch.noStroke();
sketch.beginShape();
sketch.vertex(0, 250);
sketch.vertex(80, 220);
sketch.vertex(160, 240);
sketch.vertex(240, 210);
sketch.vertex(320, 230);
sketch.vertex(400, 200);
sketch.vertex(400, 400);
sketch.vertex(0, 400);
sketch.endShape();
`;

  // Weather (sun if not none)
  if (weather !== 'none' && weather === 'sun') {
    code += `sketch.fill('#FFD700');
sketch.noStroke();
sketch.circle(320, 80, 50);
`;
  }

  return code;
};

// Face Drawing Generators

forBlock['draw_face_shape'] = function (block, generator) {
  const shape = block.getFieldValue('SHAPE');
  const skinColor = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#CD853F'`;
  let code = '';

  switch (shape) {
    case 'round':
      code = `sketch.fill(${skinColor});
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(200, 200, 120);\n`;
      break;
    case 'oval':
      code = `sketch.fill(${skinColor});
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(200, 200, 100, 140);\n`;
      break;
    case 'square':
      code = `sketch.fill(${skinColor});
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.rect(150, 150, 100, 100);\n`;
      break;
    case 'heart':
      code = `sketch.fill(${skinColor});
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.push();
sketch.translate(200, 180);
sketch.beginShape();
sketch.vertex(0, 30);
sketch.bezierVertex(-20, 0, -50, 0, -50, 30);
sketch.bezierVertex(-50, 60, 0, 90, 0, 120);
sketch.bezierVertex(0, 90, 50, 60, 50, 30);
sketch.bezierVertex(50, 0, 20, 0, 0, 30);
sketch.endShape();
sketch.pop();\n`;
      break;
  }
  return code;
};

forBlock['draw_eyes'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'normal':
      code = `sketch.fill('#FFFFFF');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(180, 180, 20, 15);
sketch.ellipse(220, 180, 20, 15);
sketch.fill('#000000');
sketch.noStroke();
sketch.circle(180, 180, 8);
sketch.circle(220, 180, 8);\n`;
      break;
    case 'sleepy':
      code = `sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.line(170, 180, 190, 180);
sketch.line(210, 180, 230, 180);\n`;
      break;
    case 'wide':
      code = `sketch.fill('#FFFFFF');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(180, 180, 30, 25);
sketch.ellipse(220, 180, 30, 25);
sketch.fill('#000000');
sketch.noStroke();
sketch.circle(180, 180, 12);
sketch.circle(220, 180, 12);\n`;
      break;
    case 'winking':
      code = `sketch.fill('#FFFFFF');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(220, 180, 20, 15);
sketch.fill('#000000');
sketch.noStroke();
sketch.circle(220, 180, 8);
sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.line(170, 180, 190, 180);\n`;
      break;
    case 'hearts':
      code = `sketch.fill('#FFFFFF');
sketch.stroke('#000000');
sketch.strokeWeight(1);
sketch.circle(180, 180, 22);
sketch.circle(220, 180, 22);
sketch.fill('#FF69B4');
sketch.noStroke();
sketch.textSize(20);
sketch.text('♥', 172, 187);
sketch.text('♥', 212, 187);\n`;
      break;
    case 'stars':
      code = `sketch.fill('#FFD700');
sketch.noStroke();
sketch.textSize(20);
sketch.text('★', 172, 187);
sketch.text('★', 212, 187);\n`;
      break;
  }
  return code;
};

forBlock['draw_nose'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'button':
      code = `sketch.fill('#FFDBAC');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(200, 200, 12);\n`;
      break;
    case 'long':
      code = `sketch.fill('#FFDBAC');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(200, 200, 10, 25);\n`;
      break;
    case 'large':
      code = `sketch.fill('#FFDBAC');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(193, 205, 10);
sketch.circle(207, 205, 10);
sketch.ellipse(200, 200, 10, 25);\n`;
      break;
    case 'pig':
      code = `sketch.fill('#FFB6C1');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.ellipse(200, 200, 20, 15);
sketch.fill('#000000');
sketch.noStroke();
sketch.circle(195, 200, 3);
sketch.circle(205, 200, 3);\n`;
      break;
  }
  return code;
};

forBlock['draw_mouth'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'smile':
      code = `sketch.noFill();
sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.arc(200, 220, 40, 30, 0, sketch.PI);\n`;
      break;
    case 'sad':
      code = `sketch.noFill();
sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.arc(200, 235, 40, 30, sketch.PI, sketch.TWO_PI);\n`;
      break;
    case 'open':
      code = `sketch.fill('#000000');
sketch.noStroke();
sketch.ellipse(200, 225, 15, 20);\n`;
      break;
    case 'surprised':
      code = `sketch.fill('#FFFFFF');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(200, 225, 12);\n`;
      break;
    case 'tongue_out':
      code = `sketch.noFill();
sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.arc(200, 220, 30, 20, 0, sketch.PI);
sketch.fill('#FF69B4');
sketch.noStroke();
sketch.ellipse(200, 235, 8, 12);\n`;
      break;
    case 'straight':
      code = `sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.line(185, 225, 215, 225);\n`;
      break;
  }
  return code;
};

forBlock['draw_hair'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  const hairColor = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || `'#654321'`;
  let code = '';

  switch (style) {
    case 'short':
      code = `sketch.fill(${hairColor});
sketch.noStroke();
sketch.arc(200, 150, 100, 80, sketch.PI, sketch.TWO_PI);\n`;
      break;
    case 'long':
      code = `sketch.fill(${hairColor});
sketch.noStroke();
sketch.arc(200, 140, 120, 120, sketch.PI, sketch.TWO_PI);
sketch.rect(130, 140, 40, 100);
sketch.rect(170, 140, 60, 60);
sketch.rect(230, 140, 40, 100);\n`;
      break;
    case 'curly':
      code = `sketch.fill(${hairColor});
sketch.noStroke();
// Top layer - highest row, offset by half a blob
for (let i = 1; i < 7; i++) {
  let x = 147 + i * 15;
  sketch.circle(x, 125, 16);
}
// First layer - wider coverage, no end blobs
for (let i = 1; i < 8; i++) {
  let x = 140 + i * 15;
  sketch.circle(x, 140, 18);
}
// Second layer - slightly lower and offset
for (let i = 0; i < 8; i++) {
  let x = 147 + i * 15;
  sketch.circle(x, 155, 16);
}\n`;
      break;
    case 'spiky':
      code = `sketch.fill(${hairColor});
sketch.stroke('#000000');
sketch.strokeWeight(2);
// Back layer of spikes
for (let i = 0; i < 6; i++) {
  let x = 152 + i * 16;
  sketch.triangle(x, 155, x + 8, 125, x + 16, 155);
}
// Front layer of spikes
for (let i = 0; i < 5; i++) {
  let x = 160 + i * 16;
  sketch.triangle(x, 150, x + 8, 130, x + 16, 150);
}\n`;
      break;
    case 'bald':
      code = '';
      break;
    case 'hat':
      code = `sketch.fill('#4169E1');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.rect(160, 130, 80, 30);
sketch.rect(170, 120, 60, 15);\n`;
      break;
  }
  return code;
};

forBlock['draw_accessories'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'glasses':
      code = `sketch.noFill();
sketch.stroke('#000000');
sketch.strokeWeight(3);
sketch.circle(180, 180, 25);
sketch.circle(220, 180, 25);
sketch.line(192, 180, 208, 180);\n`;
      break;
    case 'sunglasses':
      code = `sketch.fill('#000000');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(180, 180, 25);
sketch.circle(220, 180, 25);
sketch.line(192, 180, 208, 180);\n`;
      break;
    case 'earrings':
      code = `sketch.fill('#FFD700');
sketch.noStroke();
sketch.circle(160, 200, 8);
sketch.circle(240, 200, 8);\n`;
      break;
    case 'bow_tie':
      code = `sketch.fill('#FF0000');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.triangle(180, 250, 200, 260, 180, 270);
sketch.triangle(220, 250, 200, 260, 220, 270);
sketch.rect(195, 255, 10, 10);\n`;
      break;
    case 'none':
      code = '';
      break;
  }
  return code;
};

// Landscape Drawing Generators

forBlock['draw_sky'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'clear_blue':
      code = `sketch.fill('#87CEEB');
sketch.noStroke();
sketch.rect(0, 0, 400, 200);\n`;
      break;
    case 'starry_night':
      code = `sketch.fill('#191970');
sketch.noStroke();
sketch.rect(0, 0, 400, 200);
sketch.fill('#FFFFFF');
for (let i = 0; i < 20; i++) {
  let x = sketch.random(0, 400);
  let y = sketch.random(0, 150);
  sketch.circle(x, y, 2);
}\n`;
      break;
    case 'sunny':
      code = `sketch.fill('#87CEEB');
sketch.noStroke();
sketch.rect(0, 0, 400, 200);
sketch.fill('#FFD700');
sketch.circle(320, 80, 60);\n`;
      break;
    case 'cloudy':
      code = `sketch.fill('#B0C4DE');
sketch.noStroke();
sketch.rect(0, 0, 400, 200);
sketch.fill('#FFFFFF');
sketch.circle(100, 80, 40);
sketch.circle(120, 70, 50);
sketch.circle(140, 80, 40);
sketch.circle(250, 60, 35);
sketch.circle(270, 55, 45);
sketch.circle(290, 60, 35);\n`;
      break;
    case 'stormy':
      code = `sketch.fill('#2F4F4F');
sketch.noStroke();
sketch.rect(0, 0, 400, 200);
sketch.fill('#696969');
sketch.circle(150, 80, 60);
sketch.circle(170, 70, 70);
sketch.circle(190, 80, 60);\n`;
      break;
    case 'sunset':
      code = `sketch.fill('#FF6347');
sketch.noStroke();
sketch.rect(0, 0, 400, 80);
sketch.fill('#FF8C00');
sketch.rect(0, 80, 400, 60);
sketch.fill('#FFD700');
sketch.rect(0, 140, 400, 60);\n`;
      break;
    case 'sunrise':
      code = `sketch.fill('#FFB6C1');
sketch.noStroke();
sketch.rect(0, 0, 400, 70);
sketch.fill('#FFA07A');
sketch.rect(0, 70, 400, 70);
sketch.fill('#FFFFE0');
sketch.rect(0, 140, 400, 60);
sketch.fill('#FFD700');
sketch.circle(350, 50, 40);\n`;
      break;
  }
  return code;
};

forBlock['draw_weather'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'sun':
      code = `sketch.fill('#FFD700');
sketch.stroke('#FFA500');
sketch.strokeWeight(3);
sketch.circle(320, 80, 50);
for (let i = 0; i < 8; i++) {
  let angle = i * sketch.PI / 4;
  let x1 = 320 + sketch.cos(angle) * 35;
  let y1 = 80 + sketch.sin(angle) * 35;
  let x2 = 320 + sketch.cos(angle) * 45;
  let y2 = 80 + sketch.sin(angle) * 45;
  sketch.line(x1, y1, x2, y2);
}\n`;
      break;
    case 'moon':
      code = `sketch.fill('#F5F5DC');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.circle(320, 80, 40);\n`;
      break;
    case 'stars':
      code = `sketch.fill('#FFFFFF');
sketch.noStroke();
sketch.textSize(15);
for (let i = 0; i < 15; i++) {
  let x = sketch.random(20, 380);
  let y = sketch.random(20, 150);
  sketch.text('★', x, y);
}\n`;
      break;
    case 'clouds':
      code = `sketch.fill('#FFFFFF');
sketch.noStroke();
sketch.circle(150, 60, 30);
sketch.circle(170, 55, 40);
sketch.circle(190, 60, 30);
sketch.circle(280, 80, 25);
sketch.circle(300, 75, 35);
sketch.circle(320, 80, 25);\n`;
      break;
    case 'rain':
      code = `sketch.stroke('#4169E1');
sketch.strokeWeight(2);
for (let i = 0; i < 30; i++) {
  let x = sketch.random(0, 400);
  let y = sketch.random(50, 180);
  sketch.line(x, y, x - 5, y + 15);
}\n`;
      break;
    case 'snow':
      code = `sketch.fill('#FFFFFF');
sketch.noStroke();
for (let i = 0; i < 25; i++) {
  let x = sketch.random(0, 400);
  let y = sketch.random(0, 180);
  sketch.circle(x, y, 4);
}\n`;
      break;
    case 'rainbow':
      code = `sketch.strokeWeight(8);
sketch.noFill();
sketch.stroke('#FF0000'); sketch.arc(200, 150, 200, 100, sketch.PI, 0);
sketch.stroke('#FF8C00'); sketch.arc(200, 150, 185, 85, sketch.PI, 0);
sketch.stroke('#FFD700'); sketch.arc(200, 150, 170, 70, sketch.PI, 0);
sketch.stroke('#00FF00'); sketch.arc(200, 150, 155, 55, sketch.PI, 0);
sketch.stroke('#0000FF'); sketch.arc(200, 150, 140, 40, sketch.PI, 0);
sketch.stroke('#8A2BE2'); sketch.arc(200, 150, 125, 25, sketch.PI, 0);\n`;
      break;
    case 'lightning':
      code = `sketch.stroke('#FFFF00');
sketch.strokeWeight(4);
sketch.line(180, 60, 170, 100);
sketch.line(170, 100, 180, 100);
sketch.line(180, 100, 170, 140);
sketch.line(230, 80, 220, 120);
sketch.line(220, 120, 230, 120);
sketch.line(230, 120, 220, 160);\n`;
      break;
  }
  return code;
};

forBlock['draw_terrain'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'hills':
      code = `sketch.fill('#228B22');
sketch.noStroke();
sketch.beginShape();
sketch.vertex(0, 250);
sketch.vertex(80, 220);
sketch.vertex(160, 240);
sketch.vertex(240, 210);
sketch.vertex(320, 230);
sketch.vertex(400, 200);
sketch.vertex(400, 400);
sketch.vertex(0, 400);
sketch.endShape();\n`;
      break;
    case 'mountains':
      code = `sketch.fill('#8B7355');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.triangle(0, 400, 80, 180, 160, 400);
sketch.triangle(120, 400, 200, 160, 280, 400);
sketch.triangle(240, 400, 320, 190, 400, 400);
sketch.fill('#FFFFFF');
sketch.noStroke();
sketch.triangle(185, 170, 200, 160, 215, 170);\n`;
      break;
    case 'seaside':
      code = `sketch.fill('#1E90FF');
sketch.noStroke();
sketch.rect(0, 250, 400, 150);
sketch.fill('#F5DEB3');
sketch.rect(0, 320, 400, 80);
sketch.stroke('#FFFFFF');
sketch.strokeWeight(2);
for (let i = 0; i < 5; i++) {
  let x = i * 80;
  sketch.line(x, 250, x + 40, 260);
}\n`;
      break;
    case 'fields':
      code = `sketch.fill('#32CD32');
sketch.noStroke();
sketch.rect(0, 220, 400, 80);
sketch.fill('#228B22');
sketch.rect(0, 300, 400, 100);
sketch.stroke('#654321');
sketch.strokeWeight(3);
for (let i = 1; i < 4; i++) {
  sketch.line(i * 100, 220, i * 100, 400);
}\n`;
      break;
    case 'desert':
      code = `sketch.fill('#F4A460');
sketch.noStroke();
sketch.rect(0, 200, 400, 200);
sketch.beginShape();
sketch.vertex(50, 300);
sketch.vertex(150, 250);
sketch.vertex(250, 280);
sketch.vertex(350, 240);
sketch.vertex(400, 260);
sketch.vertex(400, 400);
sketch.vertex(0, 400);
sketch.endShape();\n`;
      break;
    case 'forest':
      code = `sketch.fill('#006400');
sketch.noStroke();
sketch.rect(0, 250, 400, 150);
sketch.fill('#8B4513');
for (let i = 0; i < 8; i++) {
  let x = 50 + i * 40;
  sketch.rect(x, 200, 10, 100);
}
sketch.fill('#228B22');
for (let i = 0; i < 8; i++) {
  let x = 55 + i * 40;
  sketch.triangle(x - 15, 200, x, 150, x + 15, 200);
}\n`;
      break;
    case 'city':
      code = `sketch.fill('#696969');
sketch.stroke('#000000');
sketch.strokeWeight(2);
sketch.rect(50, 150, 40, 250);
sketch.rect(120, 100, 50, 300);
sketch.rect(200, 180, 35, 220);
sketch.rect(270, 120, 45, 280);
sketch.rect(340, 160, 40, 240);
sketch.fill('#FFFF00');
sketch.noStroke();
for (let i = 0; i < 20; i++) {
  let x = 60 + (i % 4) * 20;
  let y = 170 + Math.floor(i / 4) * 20;
  if (sketch.random() > 0.6) sketch.rect(x, y, 8, 8);
}\n`;
      break;
  }
  return code;
};

forBlock['draw_foreground'] = function (block, generator) {
  const style = block.getFieldValue('STYLE');
  let code = '';

  switch (style) {
    case 'grass':
      code = `sketch.stroke('#228B22');
sketch.strokeWeight(2);
for (let i = 0; i < 50; i++) {
  let x = sketch.random(0, 400);
  let y = sketch.random(350, 390);
  sketch.line(x, y, x, y - 10);
}\n`;
      break;
    case 'flowers':
      code = `sketch.fill('#FF69B4');
sketch.noStroke();
for (let i = 0; i < 12; i++) {
  let x = sketch.random(20, 380);
  let y = sketch.random(330, 380);
  sketch.circle(x, y, 8);
  sketch.circle(x + 5, y, 8);
  sketch.circle(x - 5, y, 8);
  sketch.circle(x, y + 5, 8);
  sketch.circle(x, y - 5, 8);
  sketch.fill('#FFD700');
  sketch.circle(x, y, 4);
  sketch.fill('#FF69B4');
}\n`;
      break;
    case 'trees':
      code = `sketch.fill('#8B4513');
sketch.noStroke();
sketch.rect(80, 300, 15, 100);
sketch.rect(320, 280, 20, 120);
sketch.fill('#228B22');
sketch.circle(87, 300, 40);
sketch.circle(330, 280, 60);\n`;
      break;
    case 'rocks':
      code = `sketch.fill('#696969');
sketch.stroke('#000000');
sketch.strokeWeight(1);
sketch.circle(100, 370, 25);
sketch.ellipse(180, 375, 30, 20);
sketch.circle(280, 365, 20);
sketch.ellipse(350, 380, 35, 25);\n`;
      break;
    case 'beach':
      code = `sketch.fill('#F5DEB3');
sketch.noStroke();
sketch.rect(0, 350, 400, 50);
sketch.fill('#FFFFFF');
for (let i = 0; i < 20; i++) {
  let x = sketch.random(0, 400);
  let y = sketch.random(350, 400);
  sketch.circle(x, y, 3);
}\n`;
      break;
    case 'road':
      code = `sketch.fill('#36454F');
sketch.noStroke();
sketch.rect(0, 350, 400, 50);
sketch.stroke('#FFFF00');
sketch.strokeWeight(3);
sketch.line(0, 375, 400, 375);
sketch.strokeWeight(2);
for (let i = 0; i < 8; i++) {
  sketch.line(i * 50 + 10, 365, i * 50 + 30, 365);
  sketch.line(i * 50 + 10, 385, i * 50 + 30, 385);
}\n`;
      break;
    case 'none':
      code = '';
      break;
  }
  return code;
};
