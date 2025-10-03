# Potential Next Steps - Click-and-Stick Touch Interaction Fixes

## Current Status

**Test Results: 173 passing, 10 pending, 11 failing** (down from 21 failing)

### Successfully Fixed ✅
- Bin clicks (delete on bin, no delete near bin)
- Cursor-following (blocks follow mouse movement)
- Single click releases (drop on workspace, drop at position, connect to highlights)
- Connection highlight cleanup (workspace clicks, connection clicks, touch interactions)
- Mouse-based click-and-stick fully functional

### Refactoring Complete ✅
- Refactored to use **PointerEvents** (following Blockly core pattern)
- Restored **cursor-following** with `handlePointerMove()`
- Restored **click handling** with `handleStickyModeClick()`
- Code now follows Blockly core event handling patterns

---

## Analysis of Remaining 11 Failures

### Root Cause Identified: Sticky Mode Not Exiting

**Issues 1 & 3: Enter/Escape don't exit sticky mode**
- Test: "Enter key returns block to original position when no move made"
- Test: "Double-click block, move mouse, Esc cancels and returns to original position"
- Error: `isInStickyMode` stays `true` after Enter/Escape keypress
- **Root cause**: The Mover's `onMoveFinished` callback isn't being triggered
- The callback passed to `mover.startMove()` never fires, so `resetStickyState()` never runs
- This causes **test contamination** - sticky mode bleeds into subsequent tests

**Issues 6-11: Touch interactions fail**
- All tests show "expected true to be false" - tests expect NOT to be in sticky mode initially
- **Root cause**: Same as above - previous test's sticky mode contaminates the next test
- Tests expect clean slate but sticky mode is already active from previous test
- This explains why highlights don't clear (issues 9-10) - sticky mode never properly exited
- Specific failing tests:
  - Test 6: "Double-tap block enters move mode" (expected false, got true for isInStickyMode)
  - Test 7: "Double-tap block, tap connection to move block there" (should exit move mode)
  - Test 8: "Tapping invalid connection does not exit move mode" (contaminated initial state)
  - Test 9: "Connection highlights are cleared after tap-to-connect" (12 highlights remain)
  - Test 10: "Connection highlights are cleared after tap-to-release on workspace" (12 highlights remain)
  - Test 11: "Double-tap to enter move mode, use arrow keys, tap to confirm" (contaminated state)

**Issue 4: Copy/paste creates 5 blocks instead of 2**
- Test: "Copy and paste while block selected"
- Expected 2 blocks total, got 5 blocks
- Likely related - sticky mode contamination affecting clipboard operations

**Issue 5: Stack navigation timeout**
- Test: "before each" hook for "Next"
- Error: "Timeout of 2000ms exceeded"
- Likely related - sticky mode contamination blocking test setup

### Other Issues

**Issue 2: Click on connection selector not found**
- Test: "Click on connection point moves block there"
- Error: `Can't call click on element with selector "[data-id="draw_circle_1"] .blocklyConnection"`
- **Root cause**: Test bug - uses `.blocklyConnection` selector but should use `.blocklyPotentialConnection`
- Not a code issue - this is a test-side fix needed
- Can skip for now or fix test to use correct selector

---

## Fix Plan

### Priority 1: Fix Enter/Escape Exit (Root Cause) ⭐

**Problem**: Mover's callback mechanism doesn't work - `onMoveFinished` never fires

**Why the callback doesn't work**:
- The Mover's finish/abort keyboard shortcuts are handling Enter/Escape
- But they're not calling our callback properly
- Our `onMoveFinished` callback passed to `mover.startMove()` isn't being invoked

**Solution Option A**: Register our own keyboard handler to reset sticky state

```typescript
// In setupClickAndStick(), replace the empty keydown handler with:
document.addEventListener('keydown', (event) => {
  if (this.isInStickyMode) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      // Immediately reset sticky state when Enter/Escape pressed
      // Don't prevent default - let Mover handle the move too
      this.resetStickyState();
    }
  }
});
```

**Solution Option B**: Register a Blockly shortcut that runs BEFORE the Mover's shortcuts

```typescript
// Register shortcut with higher priority
ShortcutRegistry.registry.register({
  name: 'exit_sticky_mode',
  preconditionFn: (workspace) => this.isInStickyMode,
  callback: (workspace) => {
    this.resetStickyState();
    return false; // Don't prevent other shortcuts from running
  },
  keyCodes: [KeyCodes.ENTER, KeyCodes.ESC],
  allowCollision: true,
});
```

**Recommended**: Option A is simpler and doesn't interfere with shortcut system

**File to modify**: `src/index.ts` around line 591

### Priority 2: Verify Touch Issues Resolved

After fixing Priority 1, re-run WDIO tests.

**Expected**: Issues 6-11 should automatically resolve because:
- Tests will start with clean state (not in sticky mode)
- Sticky mode will properly exit between tests
- Highlights will properly clear on exit
- No more test contamination

### Priority 3: Address Remaining Issues

**Issue 2 - Test selector bug**:
- Update test to use `.blocklyPotentialConnection` instead of `.blocklyConnection`
- Or investigate if connection highlights should have `.blocklyConnection` class
- File: `test/webdriverio/test/click_stick_test.ts`

**Issues 4 & 5 - Copy/paste and stack navigation**:
- Re-evaluate after fixing root cause
- Likely will auto-resolve with proper sticky mode cleanup
- If still failing, investigate separately

---

## Implementation Steps

1. **Fix Enter/Escape exit handler**
   - Edit `src/index.ts` line ~591 in `setupClickAndStick()`
   - Replace empty keydown handler with call to `resetStickyState()`
   - Build: `npm run build`

2. **Run full test suite**
   - Command: `npm run test:wdio`
   - Expected: 9-11 tests should now pass

3. **Fix test selector (if needed)**
   - Edit `test/webdriverio/test/click_stick_test.ts`
   - Update `.blocklyConnection` to `.blocklyPotentialConnection`
   - Or investigate connection highlight CSS classes

4. **Investigate any remaining failures**
   - Copy/paste test (if still failing)
   - Stack navigation test (if still failing)

---

## Expected Outcome

**After Priority 1 fix**:
- ✅ Issues 1, 3: Enter/Escape will properly exit sticky mode
- ✅ Issues 6-11: Touch tests will start with clean state (no contamination)
- ✅ Possibly 4, 5: May auto-resolve with proper cleanup
- ❓ Issue 2: Test selector bug - separate fix needed

**Final expected results**:
- **180-182 passing** (up from 173)
- **10 pending** (unchanged)
- **1-3 failing** (down from 11)
  - At minimum, only issue 2 (test selector) will remain

---

## Notes

- The root cause is NOT in the pointer event refactoring - that's working correctly
- The issue is in the sticky mode lifecycle management
- The Mover's callback system isn't reliable for our use case
- We need to hook into the keyboard events directly to ensure cleanup happens
- This is a clean, minimal fix that doesn't require major refactoring

## References

- Test output: `/tmp/wdio-test-output-final.log`
- Main implementation: `src/index.ts` lines 560-596 (setupClickAndStick)
- Sticky mode exit: `src/index.ts` lines 986-1010 (resetStickyState)
- Mover integration: `src/index.ts` lines 761-808 (enterStickyMode)
