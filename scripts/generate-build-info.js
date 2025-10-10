#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generates build information including git SHA, dirty status, and build timestamp.
 * Creates a TypeScript file that can be imported by the plugin.
 */
function generateBuildInfo() {
  try {
    // Get git SHA (short version)
    const gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

    // Check if working directory is dirty
    let isDirty = false;
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      isDirty = gitStatus.length > 0;
    } catch (error) {
      console.warn('Warning: Could not check git status:', error.message);
    }

    // Create build timestamp
    const buildTime = new Date().toISOString();

    // Format the version label
    const versionLabel = `${gitSha}${isDirty ? '*' : ''}`;

    // Create the TypeScript content
    const buildInfoContent = `/**
 * Auto-generated build information.
 * This file is generated at build time and should not be edited manually.
 */

export interface BuildInfo {
  gitSha: string;
  isDirty: boolean;
  buildTime: string;
  versionLabel: string;
}

export const BUILD_INFO: BuildInfo = {
  gitSha: '${gitSha}',
  isDirty: ${isDirty},
  buildTime: '${buildTime}',
  versionLabel: '${versionLabel}',
};

// Hot reload integration: expose build info globally for development
// This allows the UI to detect when build info has been updated
if (typeof window !== 'undefined') {
  (window as any).__BUILD_INFO__ = BUILD_INFO;

  // Also notify any existing build info components of the update
  if (typeof window.dispatchEvent === 'function') {
    setTimeout(() => {
      const event = new CustomEvent('buildInfoUpdated', {
        detail: BUILD_INFO
      });
      window.dispatchEvent(event);
    }, 100);
  }
}
`;

    // Write to src directory
    const outputPath = path.join(__dirname, '..', 'src', 'build_info.ts');
    fs.writeFileSync(outputPath, buildInfoContent);

    console.log(`✓ Generated build info: ${versionLabel} (${buildTime})`);

  } catch (error) {
    console.error('Error generating build info:', error.message);

    // Create fallback build info
    const fallbackContent = `/**
 * Auto-generated build information.
 * This file is generated at build time and should not be edited manually.
 */

export interface BuildInfo {
  gitSha: string;
  isDirty: boolean;
  buildTime: string;
  versionLabel: string;
}

export const BUILD_INFO: BuildInfo = {
  gitSha: 'unknown',
  isDirty: false,
  buildTime: '${new Date().toISOString()}',
  versionLabel: 'unknown',
};
`;

    const outputPath = path.join(__dirname, '..', 'src', 'build_info.ts');
    fs.writeFileSync(outputPath, fallbackContent);

    console.log('✓ Generated fallback build info');
  }
}

// Run if called directly
if (require.main === module) {
  generateBuildInfo();
}

module.exports = { generateBuildInfo };