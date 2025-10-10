/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

module.exports = {
  ui: 'tdd',
  require: __dirname + '/test/dist/hooks.js',
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'test-results',
    reportFilename: 'test-report',
    html: true,
    json: false,
    quiet: false,
    consoleReporter: 'spec',
  },
};
