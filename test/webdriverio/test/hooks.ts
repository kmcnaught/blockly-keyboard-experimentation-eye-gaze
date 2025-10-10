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
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';

export const mochaHooks: RootHookObject = {
  async beforeAll(this: Mocha.Context) {
    // Set a long timeout for startup.
    this.timeout(60000);
    return await driverSetup(this.timeout());
  },
  async afterAll() {
    await driverTeardown();

    // Copy the mochawesome report to include the git commit SHA and timestamp
    try {
      const commitSha = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Navigate from dist directory up to test directory where report is saved
      const dirname = path.dirname(fileURLToPath(import.meta.url));
      const reportDir = path.join(dirname, '..', 'mochawesome-report');
      const oldPath = path.join(reportDir, 'mochawesome.html');
      const newPath = path.join(
        reportDir,
        `mochawesome-${commitSha}-${timestamp}.html`,
      );

      if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        console.log(`\nReport copied to: ${newPath}`);
      } else {
        console.warn(`\nReport file not found at: ${oldPath}`);
      }
    } catch (err) {
      console.warn('Failed to copy report with commit SHA:', err);
    }
  },
};
