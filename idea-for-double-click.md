# Idea: Fix Double-Click on Different Block During Sticky Mode

## Current Problem

When double-clicking a different block while in sticky mode:
1. **First click** of double-click → `handleClick()` fires → calls `handleStickyModeClick()` → **completes the move** ("Dropping block at clicked position")
2. **Second click** of double-click → `handleDoubleClick()` fires → but sticky mode is already gone (finished in step 1)

Result: The first move is **completed** instead of **aborted**, then a new move starts with the second block.

**Desired behavior**: First move should be **aborted** (block returns to original position), then new move starts with the second block.

## Root Cause

Click events fire before dblclick events. The browser sequence is:
1. mousedown → mouseup → **click**
2. mousedown → mouseup → **click** → **dblclick**

So by the time `dblclick` fires, the first `click` has already processed and completed the move.

## Proposed Solution: Delay Click Processing

Add a timeout to delay single-click processing, giving the double-click event time to cancel it.

### Implementation:

1. **Add instance variable**:
   ```typescript
   private pendingClickTimeout: number | null = null;
   ```

2. **Update `handleClick()`**:
   ```typescript
   private handleClick(event: MouseEvent) {
     if (!this.stickyBlock) return;

     const clickedBlock = this.getBlockFromEvent(event);
     console.log('ABC handleClick:', {
       hasStickyBlock: !!this.stickyBlock,
       stickyBlockId: this.stickyBlock?.id,
       clickedBlockId: clickedBlock?.id,
       isSameBlock: clickedBlock === this.stickyBlock,
       target: (event.target as Element)?.className
     });

     // Clear any existing pending click
     if (this.pendingClickTimeout !== null) {
       window.clearTimeout(this.pendingClickTimeout);
     }

     // Delay click processing to allow double-click to cancel it
     this.pendingClickTimeout = window.setTimeout(() => {
       this.pendingClickTimeout = null;
       this.handleStickyModeClick(event);
     }, 250); // 250ms is typical double-click threshold
   }
   ```

3. **Update `handleDoubleClick()`**:
   ```typescript
   private handleDoubleClick(event: MouseEvent) {
     if (event.defaultPrevented) return;

     // Cancel any pending single-click action
     if (this.pendingClickTimeout !== null) {
       console.log('ABC handleDoubleClick: Canceling pending click');
       window.clearTimeout(this.pendingClickTimeout);
       this.pendingClickTimeout = null;
     }

     const target = event.target as Element;
     const clickedBlock = this.getBlockFromEvent(event);
     const block = getNonShadowBlock(clickedBlock);

     console.log('ABC handleDoubleClick ENTRY:', {
       hasStickyBlock: !!this.stickyBlock,
       stickyBlockId: this.stickyBlock?.id,
       clickedBlockId: clickedBlock?.id,
       finalBlockId: block?.id,
       isSameBlock: block === this.stickyBlock,
       isMovable: block?.isMovable(),
       targetClassName: target?.className
     });

     // If already in sticky mode and clicking a different block
     if (this.stickyBlock && block && block !== this.stickyBlock) {
       console.log('ABC handleDoubleClick: Already in sticky mode, clicking different block - aborting current move');
       this.cleanupStickyMode('abort');
       // Continue to start new move below
     }
     // If already in sticky mode and clicking same block (or workspace), ignore
     else if (this.stickyBlock && (!block || block === this.stickyBlock)) {
       console.log('ABC handleDoubleClick: Already in sticky mode, same block or workspace - ignoring');
       event.preventDefault();
       event.stopPropagation();
       return;
     }

     // Don't handle double-click on fields
     if (target && this.isDoubleClickOnField(target)) {
       console.log('ABC handleDoubleClick: Double-click on field, returning');
       return;
     }

     // Start sticky mode with new block
     if (block && block.isMovable()) {
       console.log('ABC handleDoubleClick: Calling enterStickyMode for block', block.id);
       if (this.enterStickyMode(block, event.clientX, event.clientY)) {
         event.preventDefault();
         event.stopPropagation();
       }
     }
   }
   ```

4. **Update `enterStickyMode()`** (line 886):
   ```typescript
   // Exit if already in sticky mode
   if (this.stickyBlock) {
     console.log('ABC enterStickyMode: Already in sticky mode, calling cleanupStickyMode(abort)');
     this.cleanupStickyMode('abort'); // Changed from exitStickyModeAndDrop()
   }
   ```

## Behavior with This Solution

### Single Click:
1. Click → starts 250ms timeout
2. After 250ms → processes click (drop/connect/etc.)

### Double Click:
1. First click → starts 250ms timeout
2. Second click → cancels timeout, processes double-click
3. If already in sticky mode with different block → aborts current move, starts new move
4. If not in sticky mode → starts sticky mode

## Trade-offs

**Pros:**
- Solves the double-click problem cleanly
- Works for all scenarios (different block, same block, workspace)
- Relatively simple implementation

**Cons:**
- Adds 250ms delay to single-click actions (drop, connect, delete)
- May feel slightly less responsive for single-click operations
- Standard double-click time varies by OS (typically 200-500ms)

## Alternative: Simpler Approach

Keep it simple - just fix the double-click early return:

```typescript
// In handleDoubleClick, replace early return logic:
if (this.stickyBlock) {
  // If clicking a different block, abort current move and start new one
  if (block && block !== this.stickyBlock && block.isMovable()) {
    console.log('ABC handleDoubleClick: Different block, aborting and starting new move');
    this.cleanupStickyMode('abort');
    // Continue below to start new move
  } else {
    // Same block or workspace - ignore
    console.log('ABC handleDoubleClick: Same block/workspace - ignoring');
    event.preventDefault();
    event.stopPropagation();
    return;
  }
}
```

This is simpler but won't fix the issue that the first click already completed the move. The move will finish, then abort, then start again - which may look glitchy.

## Recommendation

Start with the **simpler approach** - see if it's acceptable that the move briefly finishes before being restarted. If the glitchiness is too noticeable, implement the **timeout delay** approach.
