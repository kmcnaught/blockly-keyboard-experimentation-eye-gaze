/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Hooks to run before the first test and after the last test.
 * These create a shared chromedriver instance, so we don't have to fire up
 * a new one for every suite.
 */
import {RootHookObject} from 'mocha';
import {driverSetup, driverTeardown} from './test_setup.js';
import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';

export const mochaHooks: RootHookObject = {
  async beforeAll(this: Mocha.Context) {
    // Set a long timeout for startup.
    this.timeout(60000);
    return await driverSetup(this.timeout());
  },
  async afterAll() {
    await driverTeardown();

    // Rename the mochawesome report to include the git commit SHA and timestamp
    try {
      const commitSha = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const reportDir = path.join(__dirname, 'mochawesome-report');
      const oldPath = path.join(reportDir, 'mochawesome.html');
      const newPath = path.join(
        reportDir,
        `mochawesome-${commitSha}-${timestamp}.html`,
      );

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`\nReport saved to: ${newPath}`);
      }
    } catch (err) {
      console.warn('Failed to rename report with commit SHA:', err);
    }
  },
};
