/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const execSync = require('child_process').execSync;
const fs = require('fs');

console.log(`Preparing test page for gh-pages deployment.`);

execSync(`npm run build && npm run predeploy`, {stdio: 'pipe'});

// Copy test/index.html to build/ directory.
// Update the path at which the test_bundle can be found.
let testPage = fs.readFileSync('./test/index.html').toString();
testPage = testPage.replace('../build/test_bundle.js', 'test_bundle.js');
fs.writeFileSync('build/index.html', testPage, 'utf-8');

// Copy test/minimal-demo.html to build/ directory.
// Update the paths for the bundle and image.
let minimalDemo = fs.readFileSync('./test/minimal-demo.html').toString();
minimalDemo = minimalDemo.replace(
  '../build/minimal_demo_bundle.js',
  'minimal_demo_bundle.js',
);
minimalDemo = minimalDemo.replace(
  '../head_shoulders_knees_toes.png',
  'head_shoulders_knees_toes.png',
);
fs.writeFileSync('build/minimal-demo.html', minimalDemo, 'utf-8');

// Copy the image used by minimal demo.
fs.copyFileSync(
  './head_shoulders_knees_toes.png',
  'build/head_shoulders_knees_toes.png',
);

console.log(
  `Open 'build/index.html' or 'build/minimal-demo.html' in a browser to see results, or upload the 'build' directory to ghpages.`,
);
