# Move Mode Implementation Notes

This document describes how the keyboard-based move mode is implemented in the @blockly/keyboard-navigation plugin.

## Overview

Move mode allows users to pick up blocks and comments using keyboard shortcuts (M key) and then move them around the workspace using arrow keys. The system provides both constrained movement (snapping to connection points) and unconstrained movement (free positioning).

## Core Architecture

### Key Classes

1. **MoveActions** (`src/actions/move.ts`)

   - Handles keyboard shortcuts and context menu items for move operations
   - Manages the high-level move lifecycle (start, finish, abort)
   - Works with the `Mover` class to perform actual movement operations

2. **Mover** (`src/actions/mover.ts`)

   - Core logic for moving draggable elements (blocks and comments)
   - Manages move state tracking across workspaces
   - Handles both constrained and unconstrained movement
   - Integrates with Blockly's drag system

3. **KeyboardDragStrategy** (`src/keyboard_drag_strategy.ts`)

   - Custom drag strategy that replaces the default block drag behavior during moves
   - Implements intelligent connection finding and traversal
   - Provides visual feedback through connection highlighting
   - Handles click-to-complete functionality

4. **ConnectionHighlighter** (`src/connection_highlighter.ts`)
   - Creates visual indicators showing all valid connection points
   - Supports clicking on connection points to complete moves
   - Renders different highlight styles for different connection types

## Move Lifecycle

### 1. Starting a Move (`M` key)

**Trigger**: User presses `M` key or selects "Move Block" from context menu

**Process**:

1. `MoveActions.start_move` shortcut triggered
2. Calls `Mover.startMove()` with current draggable element
3. For blocks: patches drag strategy to `KeyboardDragStrategy`
4. For comments: creates `MoveIndicatorBubble`
5. Creates Blockly dragger and calls `onDragStart()`
6. Registers temporary shortcut to auto-commit move on other key presses
7. Sets up blur listener to finish move if focus is lost
8. Updates workspace state (`setKeyboardMoveInProgress(true)`)

**Key Code**:

```typescript
startMove(workspace, draggable, moveType, startPoint) {
  // Patch drag strategy for blocks
  if (draggable instanceof BlockSvg) {
    this.patchDragStrategy(draggable, moveType, startPoint);
  }

  // Begin dragging
  const dragger = new DraggerClass(draggable, workspace);
  dragger.onDragStart(fakePointerEvent);

  // Track move state
  this.moves.set(workspace, new MoveInfo(...));
}
```

### 2. Moving Elements

**Constrained Movement** (Arrow Keys):

- Uses `moveConstrained()` which calls `dragger.onDrag()`
- Direction encoded in fake PointerEvent's `tiltX/tiltY` properties
- `KeyboardDragStrategy` interprets direction and finds next valid connection
- Block positioned near target connection with visual feedback

**Unconstrained Movement** (Alt/Ctrl + Arrow Keys):

- Uses `moveUnconstrained()` which updates `totalDelta` directly
- Moves in fixed increments (20 workspace units)
- No connection snapping - free positioning

**Key Code**:

```typescript
moveConstrained(workspace, direction) {
  const info = this.moves.get(workspace);
  info.dragger.onDrag(
    info.fakePointerEvent('pointermove', direction),
    info.totalDelta.clone().scale(workspace.scale)
  );
}
```

### 3. Connection Highlighting

**Visual Feedback**:

- `ConnectionHighlighter` finds all valid connections for moving block
- Creates different SVG elements based on connection type:
  - Statement connections: Notch-shaped paths
  - Value connections: Rounded rectangles matching socket size
  - Fallback: Simple circles

**Click-to-Complete**:

- Each highlight has click handler that calls `handleConnectionClick()`
- Sets connection candidate and positions block at clicked location
- Automatically completes the move

### 4. Finishing a Move

**Triggers**:

- Enter/Space key (`finish_move` shortcut)
- Escape key (`abort_move` shortcut)
- Clicking on connection highlight
- Any other keyboard shortcut (auto-commit)
- Losing focus (blur event)

**Process**:

1. `preDragEndCleanup()`: Remove listeners, clear hints
2. Call `dragger.onDragEnd()` with final position
3. `postDragEndCleanup()`: Restore drag strategy, clean up state
4. Update focus to moved element
5. Scroll moved element into view

## State Management

### MoveInfo Class

Tracks active move state per workspace:

```typescript
class MoveInfo {
  totalDelta: Coordinate; // Cumulative movement
  draggable: IDraggable; // Element being moved
  dragger: IDragger; // Blockly dragger instance
  startLocation: Coordinate; // Original position
  blurListener: EventListener; // Focus loss handler
}
```

### Workspace Integration

- `workspace.setKeyboardMoveInProgress(true)` disables normal navigation
- Move state stored in `Map<WorkspaceSvg, MoveInfo>`
- Only one move allowed per workspace at a time

## Drag Strategy Patching

### Purpose

Blockly's default `BlockDragStrategy` isn't designed for keyboard navigation, so it gets replaced:

```typescript
patchDragStrategy(block, moveType, startPoint) {
  this.oldDragStrategy = block.dragStrategy;
  block.setDragStrategy(new KeyboardDragStrategy(
    block, moveType, startPoint, highlightConnections, onMoveComplete
  ));
}
```

### KeyboardDragStrategy Features

**Connection Traversal**:

- Maintains sorted list of all workspace connections
- Implements directional traversal based on arrow key direction
- Falls back to distance-based search when no traversal context

**Preview Management**:

- Forces immediate preview display (insertion markers)
- Positions blocks near target connections for visual feedback
- Handles both insertion and replacement previews

**Direction Handling**:

```typescript
drag(newLoc, e) {
  this.currentDragDirection = getDirectionFromXY({x: e.tiltX, y: e.tiltY});
  // Direction determines traversal behavior
}
```

## Move Types

### MoveType.Move

- Moving existing blocks/comments
- On abort: returns to original position via `revertDrag()`
- Preserves existing connections and relationships

### MoveType.Insert

- Used when inserting new blocks from toolbox/flyout
- On abort: deletes the block entirely via `wouldDeleteDraggable()`
- Allows trying different positions before committing

## Error Handling & Edge Cases

### Auto-Commit Safety

Temporary shortcut registered for all other keyboard shortcuts:

```typescript
const commitMoveShortcut = {
  name: COMMIT_MOVE_SHORTCUT,
  callback: (workspace) => {
    this.finishMove(workspace);
    return false; // Allow original shortcut to proceed
  },
  keyCodes: shortcutKeys, // All registered shortcuts except movement keys
  allowCollision: true,
};
```

### Focus Management

- Blur listener ensures moves complete if user clicks away
- Focus restored to moved element after completion
- Handles both block and comment focus appropriately

### Connection Validation

- `connectionChecker.canConnect()` validates all potential connections
- Filters out self-connections and invalid combinations
- Limits highlight count (50) for performance

## Integration Points

### With Core Blockly

- Uses Blockly's drag system (`IDragger`, `IDragStrategy`)
- Integrates with connection system and previewing
- Respects workspace editing permissions

### With Navigation System

- Requires `STATE.WORKSPACE` navigation state
- Disables cursor movement during moves
- Updates cursor position after moves complete

### With Other Plugins

- Compatible with cross-tab copy/paste
- Works with custom toolboxes and renderers
- Respects workspace-level move permissions

## Performance Considerations

- Connection highlighting limited to 50 closest connections
- Highlights use efficient SVG elements with minimal DOM manipulation
- Auto-cleanup timeout prevents memory leaks from stuck highlights
- Scroll listeners update highlight positions efficiently

## Accessibility Features

- Full keyboard navigation without mouse required
- Visual feedback through connection highlighting
- Screen reader compatible focus management
- Consistent with Blockly's accessibility patterns
