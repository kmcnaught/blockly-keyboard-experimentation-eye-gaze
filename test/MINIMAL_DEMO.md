# Click-Stick Minimal Demo

## Overview

This is a stripped-down demo focused exclusively on testing different click-stick (sticky move mode) dragging UX prototypes for Blockly. The demo removes all unnecessary features like code generation, output visualization, and complex toolboxes to focus solely on the block manipulation experience.

## Goals

The primary goal is to provide a simple, focused environment where users can:

1. **Test different trigger modes** for entering sticky move mode
2. **Compare UX configurations** through preset buttons
3. **Evaluate connection highlighting** and visual feedback
4. **Experience different interaction patterns** for motor-impaired users, touch device users, and precision-focused users
5. **Provide a clean testing ground** without distractions from code execution or output

## The Test Scenario

The demo presents 7 disconnected blocks that form a simple, recognizable pattern:

**Blocks provided:**
- 1 container: `play song ▼` (statement input)
- 4 statement blocks:
  - `heads`
  - `shoulders`
  - `knees [___] toes` (with value input)
  - `knees [___] toes` (with value input)
- 2 value blocks:
  - `and`
  - `and`

**Target assembly:**
```
play song ▼
  heads
  shoulders
  knees [and] toes
  knees [and] toes
```

This scenario tests:
- Statement stacking (sequential next connections)
- Container nesting (statements inside parent block)
- Value input filling (inserting "and" blocks)
- Working with duplicate similar blocks

## What's Been Implemented

### UI Structure

- **Clean top control panel** with preset buttons and expandable advanced options
- **Full-width workspace** for optimal block manipulation
- **No toolbox/flyout** - focuses on moving existing blocks
- **No code output** - no p5.js canvas or code generation
- **Persistent settings** via localStorage

### Preset Configurations

Three preset configurations optimized for different user needs:

#### Preset 1: Motor Impaired
- **Trigger Mode:** Grip handle
- **Connection highlight size:** Medium *(currently implemented as "larger" ON)*
- **Show highlights in normal mode:** OFF
- **Keep block on mouse:** OFF

*Rationale:* Provides a clear visual affordance (grip handle) for where to click, with larger targets but doesn't require holding the block on the cursor.

#### Preset 2: Touch Device
- **Trigger Mode:** Double-click
- **Connection highlight size:** Medium *(currently implemented as "larger" ON)*
- **Show highlights in normal mode:** ON
- **Keep block on mouse:** ON

*Rationale:* Optimized for touch screens where precision is difficult. Shows all connection points clearly and block follows the finger/cursor.

#### Preset 3: Precision Mode
- **Trigger Mode:** Shift+click
- **Connection highlight size:** Medium *(currently implemented as "larger" ON)*
- **Show highlights in normal mode:** ON
- **Keep block on mouse:** ON

*Rationale:* For users who want maximum control and visual feedback. Shift+click prevents accidental activation.

### Advanced Options

Expandable section that exposes individual settings:
- **Trigger Mode dropdown:** Double-click, Shift+click, Click focused block, Grip handle
- **Use larger connection highlights** checkbox *(Note: Will be replaced with Small/Medium/Large selector - see TODO #6)*
- **Show connection highlights in normal mode** checkbox
- **Keep block on mouse during sticky move** checkbox

Changing any advanced option deselects the active preset.

### Features

- **Reset Workspace button:** Reloads the initial 7-block scattered configuration
- **Preset persistence:** Remembers the last selected preset across page reloads
- **Visual feedback:** Active preset button highlighted in blue
- **Keyboard navigation:** Full keyboard navigation support via the plugin

## Build & Run

### Build the minimal demo:
```bash
npm run build:minimal
```

### Build and serve:
```bash
npm run start:minimal
```

Then open: http://localhost:8000/test/minimal-demo.html

## Roadmap / TODO List

### High Priority

1. **Remove/Hide Toolbox**
   - Since we're only moving existing blocks, the toolbox/flyout serves no purpose
   - Consider removing it entirely or hiding it to maximize workspace space
   - Alternative: Make it collapsible if we want to keep it for reference

2. **Success Indicator**
   - Add visual feedback when all blocks are correctly assembled
   - Ideas:
     - Green checkmark overlay
     - Celebration animation
     - Border highlight on the assembled structure
     - Success message in the control panel

3. **Improve Grip Handle Visibility**
   - Current grip handle is small and may be hard to see
   - Make it larger and more prominent
   - Consider different colors or animations on hover
   - Possibly add a tooltip or label

4. **Better Initial Block Layout**
   - Current blocks are stacked too closely in a column
   - Spread them out across the workspace with more spacing
   - Mix up the positioning (not just a neat column)
   - Ensure there's visual space "behind" blocks for easier selection
   - Consider a more organic, scattered layout

5. **Instructions Pane**
   - Add a left sidebar or panel with instructions
   - Explain the goal: "Assemble the song!"
   - Describe how to use the current preset/trigger mode
   - Show keyboard shortcuts
   - Provide hints about where blocks should connect
   - Consider making it collapsible

6. **Connection Highlight Size Options**
   - Replace binary checkbox with three-way selector: Small / Medium / Large
   - Small = current "off" or minimal size
   - Medium = current "larger" size (should be the default)
   - Large = new even bigger size for maximum visibility
   - Update presets to use Medium by default
   - Allows more granular testing of connection target sizes

### Medium Priority

7. **Preset Descriptions**
   - Add tooltips or info icons explaining each preset's use case
   - Show the preset rationale in the UI

8. **Visual Connection Previews**
   - When hovering near a valid connection, show preview outline
   - Make it clearer where the block will snap

9. **Undo/Redo Support**
   - Add undo/redo buttons for easy recovery from mistakes

10. **Tutorial Mode**
    - Optional step-by-step walkthrough for first-time users
   - Highlight which block to move next
   - Show where it should connect

### Lower Priority

11. **Multiple Scenarios**
    - Create additional test scenarios with different complexity levels
    - Scenario selector dropdown
    - Examples: simple (3 blocks), medium (7 blocks - current), complex (15+ blocks)

12. **Analytics/Telemetry**
    - Track which presets users prefer
    - Measure time-to-completion
    - Count errors/disconnections
    - Identify pain points

13. **Accessibility Improvements**
    - Ensure screen reader compatibility
    - High contrast mode
    - Larger text options

14. **Mobile Optimization**
    - Test on actual touch devices
    - Adjust button sizes for mobile
    - Consider gesture controls

## Technical Details

### Files
- **test/minimal-demo.html** - Minimal HTML page
- **test/minimal-demo.ts** - TypeScript entry point with block definitions and logic
- **test/webpack.minimal.config.js** - Build configuration
- **build/minimal_demo_bundle.js** - Compiled output bundle (generated)

### Custom Blocks Defined
All blocks are defined inline in `minimal-demo.ts`:
- `song_container` - Container block with statement input
- `lyric_heads` - Simple statement block
- `lyric_shoulders` - Simple statement block
- `lyric_knees_toes` - Statement with value input
- `connector_and` - Value/output block

### Dependencies
- Blockly 12.3.0
- @blockly/keyboard-navigation plugin (this project)
- Standard webpack build tools

## Design Principles

1. **Focus:** Only features directly related to testing click-stick UX
2. **Simplicity:** No code execution, no output visualization, no complex toolboxes
3. **Clarity:** Clear visual feedback and obvious goals
4. **Accessibility:** Support for different user needs through presets
5. **Speed:** Fast iteration - reset and try different configurations quickly

## Success Metrics

A successful minimal demo will:
- Allow users to quickly understand the goal
- Make it easy to test all trigger modes
- Provide clear feedback on connections
- Feel responsive and smooth
- Identify the best UX configuration for different user groups
