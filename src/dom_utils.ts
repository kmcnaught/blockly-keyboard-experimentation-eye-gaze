/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks if a DOM element or SVG target is workspace-related.
 * Handles both regular DOM elements and SVG elements (which on touch devices
 * return SVGAnimatedString objects for className).
 *
 * @param target The element to check (can be Element, SVGAnimatedString, or null)
 * @returns True if the target is workspace-related or null/undefined
 */
export function isWorkspaceElement(target: any): boolean {
  // Null/undefined means clicked empty space → workspace
  if (!target) return true;

  // Handle SVGAnimatedString (happens with SVG elements on touch devices)
  // These have baseVal and animVal properties containing the actual class name
  if (target.baseVal !== undefined) {
    const className = target.baseVal || target.animVal || '';
    return className.includes('blocklyWorkspace') ||
           className.includes('blocklyMainBackground') ||
           className.includes('blocklySvg');
  }

  // Handle regular DOM elements with classList
  const classList = target.classList;
  if (classList) {
    return classList.contains('blocklyMainBackground') ||
           classList.contains('blocklySvg') ||
           classList.contains('blocklyWorkspace');
  }

  return false;
}
