/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {BUILD_INFO} from './build_info';

/**
 * Creates and returns a build info UI component showing git SHA and build time.
 * This component displays in the bottom-right corner of the page.
 *
 * @returns The build info DOM element.
 */
export function createBuildInfoComponent(): HTMLElement {
  const buildInfo = document.createElement('div');
  buildInfo.id = 'build-info';
  buildInfo.className = 'build-info';

  // Format the build time for display
  const buildDate = new Date(BUILD_INFO.buildTime);
  const timeString = buildDate.toLocaleString();

  buildInfo.innerHTML = `
    <div class="build-info-content">
      <div class="build-version">
        <span class="build-label">Version:</span>
        <span class="build-value">${BUILD_INFO.versionLabel}</span>
      </div>
      <div class="build-time">
        <span class="build-label">Built:</span>
        <span class="build-value">${timeString}</span>
      </div>
    </div>
  `;

  return buildInfo;
}

/**
 * Registers CSS styles for the build info component.
 * Should be called before creating the component.
 */
export function registerBuildInfoStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .build-info {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.4;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      min-width: 200px;
    }

    .build-info-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .build-info .build-version,
    .build-info .build-time {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .build-info .build-label {
      color: #aaaaaa;
      margin-right: 8px;
    }

    .build-info .build-value {
      color: #ffffff;
      font-weight: bold;
    }

    /* Make build info hover-able for better UX */
    .build-info:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: scale(1.05);
      transition: all 0.2s ease;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .build-info {
        bottom: 5px;
        right: 5px;
        padding: 6px 8px;
        font-size: 10px;
        min-width: 150px;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Updates the build info component with fresh build information.
 * This can be called when hot reloading to refresh the build time.
 *
 * @param element The build info element to update.
 */
export function updateBuildInfo(element: HTMLElement): void {
  const buildDate = new Date(BUILD_INFO.buildTime);
  const timeString = buildDate.toLocaleString();

  const versionEl = element.querySelector('.build-version .build-value');
  const timeEl = element.querySelector('.build-time .build-value');

  if (versionEl) {
    versionEl.textContent = BUILD_INFO.versionLabel;
  }
  if (timeEl) {
    timeEl.textContent = timeString;
  }
}

/**
 * Gets fresh build info from the global scope (populated by webpack HMR)
 * or falls back to the static BUILD_INFO if not available.
 *
 * @returns The current build info.
 */
function getFreshBuildInfo(): typeof BUILD_INFO {
  // Check if there's a global build info (from webpack dev server hot reload)
  if (typeof window !== 'undefined' && (window as any).__BUILD_INFO__) {
    return (window as any).__BUILD_INFO__;
  }
  return BUILD_INFO;
}

/**
 * Starts auto-refresh functionality for the build info component.
 * This listens for build events from the webpack plugin and updates the UI immediately.
 *
 * @param element The build info element to update.
 * @param fallbackIntervalMs Fallback polling interval if events aren't available (default: 5000ms).
 * @returns A function to stop the auto-refresh.
 */
export function startBuildInfoAutoRefresh(
  element: HTMLElement,
  fallbackIntervalMs: number = 5000
): () => void {
  let lastBuildTime = BUILD_INFO.buildTime;

  // Function to update the UI with new build info
  const updateUI = (buildInfo: typeof BUILD_INFO) => {
    const buildDate = new Date(buildInfo.buildTime);
    const timeString = buildDate.toLocaleString();

    const versionEl = element.querySelector('.build-version .build-value');
    const timeEl = element.querySelector('.build-time .build-value');

    if (versionEl) {
      versionEl.textContent = buildInfo.versionLabel;
    }
    if (timeEl) {
      timeEl.textContent = timeString;
    }

    // Add a brief visual indication of the update
    element.style.transform = 'scale(1.05)';
    element.style.transition = 'transform 0.2s ease';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 200);

    console.log(`🔄 Build info updated: ${buildInfo.versionLabel} (${timeString})`);
  };

  // Primary method: listen for custom events from webpack plugin
  const eventListener = (event: CustomEvent) => {
    const freshBuildInfo = event.detail;
    if (freshBuildInfo && freshBuildInfo.buildTime !== lastBuildTime) {
      lastBuildTime = freshBuildInfo.buildTime;
      updateUI(freshBuildInfo);
    }
  };

  // Add event listener for webpack-triggered updates
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('buildInfoUpdated', eventListener as EventListener);
  }

  // Fallback method: periodic polling (for cases where webpack integration isn't available)
  const intervalId = setInterval(() => {
    const freshBuildInfo = getFreshBuildInfo();

    if (freshBuildInfo && freshBuildInfo.buildTime !== lastBuildTime) {
      lastBuildTime = freshBuildInfo.buildTime;
      updateUI(freshBuildInfo);
    }
  }, fallbackIntervalMs);

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('buildInfoUpdated', eventListener as EventListener);
    }
    clearInterval(intervalId);
  };
}