

Work through these TODOs. Make a commit per TODO, or a few commits if the work 
takes multiple steps. Check them off when complete and add a brief comment if
completed with no questions, and a more detailed comment if you made a decision
that warrants noting. 

do not apply `npm format` or change anything unrelated to the TODO. Add a comment
if you see something that you recommend refactoring separately. 

If it says "PLAN" then make a plan and write it at the bottom of this document for
later implementation. Include any questions/decisions that need to be made. If it says 
"GO" then jump straight into implementation. 

## Top level TODOs

- [x] PLAN: Make it so that the block based code automatically re-runs whenever the blocks are changed, i.e. live re-rendering
  - Plan created using debounced auto-run approach (300ms delay). See "Plans for later implementation" section below.
- [ ] GO: the crescent moon strategy doesn't work unless the sky is the same colour
as the second 'circle' - find a better way
- [ ] PLAN: add a block that lets you load a picture as a background. The field for loading 
should launch a file picker. 
- [ ] GO: make it so that the "landscape" scenario includes some orphaned blocks, like in the
"face" scenario to allow users to rebuild it. 

## Plans for later implementation

### Plan: Auto-rerun code on block changes (live re-rendering)

**Current Behavior:**
- Change listener detects block modifications (lines 142-168 in test/index.ts)
- Shows an overlay with a play button requiring manual click to re-run

**Goal:**
Auto-rerun the code when blocks change (live re-rendering)

**Approach:** Debounced auto-run

**Rationale:**
- Immediate re-run could be janky during rapid changes (dragging blocks, rapid edits)
- Debouncing (300-500ms delay) provides responsive feel without jank
- Simpler than adding UI toggles or complex smart detection

**Implementation Steps:**
1. Add debounce timer variable to store timeout ID
2. In the change listener (lines 142-168), instead of calling `showOverlay()`:
   - Clear any existing debounce timer
   - Set new timer to call `runCode()` after delay (suggest 300ms)
3. Remove overlay-related code (showOverlay, hideOverlay calls)
4. Optional: Keep overlay DOM elements for future use or remove entirely
5. Test with various scenarios (dragging, field edits, block creation/deletion)

**Questions/Decisions:**
- **Debounce delay**: Recommend 300ms (fast enough to feel instant, slow enough to avoid jank during drags)
- **Overlay**: Recommend removing overlay entirely for cleaner auto-run experience
  - Alternative: Show brief "Running..." indicator that auto-dismisses
- **Disable option**: Not initially - keep it simple, add later if users request it
- **Error handling**: Current p5.js error system already handles this - no changes needed

**Code changes needed:**
- test/index.ts:
  - Add `let autoRunTimer: number | null = null;` at module level
  - In change listener, replace `showOverlay()` with debounced `runCode()` call
  - Remove `codeHasChanged` tracking (no longer needed)
  - Remove `showOverlay()` and `hideOverlay()` function calls
  - Keep overlay button handlers for backwards compatibility (or remove if overlay removed)

**Testing considerations:**
- Test with rapid block dragging
- Test with field value changes
- Test with block creation/deletion
- Verify no performance issues with complex block structures