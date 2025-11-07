Click stick summary

Sticky Move Mode Feature Summary

  Overview

  Sticky move mode (also called "click-and-stick") is a new interaction mode for moving blocks in Blockly that bridges traditional
  mouse-based drag-and-drop with keyboard-based navigation. It was added in commit 38f77bb.

  What Problem Does It Solve?

  The feature addresses limitations in traditional drag-and-drop that affect several user groups:

  1. Motor-impaired users who can click or tap but struggle to maintain pressure while dragging
  2. Touch device users where dragging can be imprecise and blocks may drop unintentionally
  3. Anyone needing precise placement who would benefit from seeing all valid connection points simultaneously

  How It Works

  Basic Flow:

  1. Trigger: User activates sticky mode on a block (default: double-click)
  2. Sticky state: The block enters a special mode where it "sticks" to the cursor
  3. Visual feedback: All valid connection points across the workspace are highlighted with colored outlines
  4. Placement: User chooses where to drop the block using one of several methods:
    - Click on a highlighted connection → Connects directly to that specific point
    - Click anywhere else → Uses Blockly's standard preview connection (if available)
    - Click on the trashcan → Deletes the block
    - Press Enter → Confirms the current position

  Key Features:

  Multiple Trigger Modes (5 options):
  - DOUBLE_CLICK (default) - Double-click a block to enter sticky mode
  - SHIFT_CLICK - Hold Shift and click a block
  - FOCUSED_CLICK - Click on an already-focused block
  - GRIP_CLICK - Click on a visual grip handle that appears on focused blocks
  - MODE_TOGGLE - For external toggle control

  Connection Highlighting:
  - Shows up to 50 valid connection points simultaneously (performance-limited)
  - Statement connections (previous/next): Yellow highlighted notches with fatter click targets
  - Value connections (input/output): Blue highlighted puzzle tabs or rounded rectangles
  - Highlights update dynamically as the workspace changes

  Optional Cursor Following:
  - By default, the block follows the mouse cursor in real-time
  - Can be disabled with setKeepBlockOnMouse(false) for users who prefer the block to stay at the click position

  Visual Grip Handle (when using GRIP_CLICK mode):
  - A small handle with dots (⋮⋮) appears on the left edge of focused blocks
  - Provides a clear affordance for "where to click to move"
  - Adapts to block size (compact for narrow blocks)