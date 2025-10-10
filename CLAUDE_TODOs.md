

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
  - **IMPLEMENTED**: Auto-run feature successfully implemented with 300ms debounce. Code now re-runs automatically when blocks are changed, created, deleted, or reconnected.
- [x] GO: the crescent moon strategy doesn't work unless the sky is the same colour
as the second 'circle' - find a better way
  - Fixed by using p5.js erase() mode instead of drawing a colored circle on top. The erase() function cuts out pixels regardless of background color.
- [x] PLAN: add a block that lets you load a picture as a background. The field for loading
should launch a file picker.
  - Plan created using button field with FileReader API to load images as data URLs. See "Plans for later implementation" section below.
  - **IMPLEMENTED**: Background image loading block successfully created with file picker, size validation (5MB max), and p5.js image rendering. Block added to Events toolbox category. 
- [x] GO: make it so that the "landscape" scenario includes some orphaned blocks, like in the
"face" scenario to allow users to rebuild it.
  - Added three orphaned blocks to landscape scenario: draw_weather (clouds), draw_foreground (trees), and draw_weather (rainbow). Positioned similarly to face scenario orphaned blocks. 
- [x] make the green colour of the trees different to any of the greens of the landscapes
- [ ] Make the 'conditions' category colour the same as (most of) the conditional blocks are


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

---

### Plan: Add block to load picture as background with file picker

**Requirements:**
1. New Blockly block with field that launches file picker
2. Select image file from local filesystem
3. Load and display image as background in p5.js canvas

**Proposed Block Design:**

Block name: `load_background_image`
Category: Add to "Events" or create new "Media" category
Block appearance: "📷 load background image [Select File]"
Visual: Show thumbnail preview and filename when image selected

**Technical Approach:**

**Field Implementation Options:**
1. **Button field with custom handler** (Recommended)
   - Use Blockly button field that triggers file picker
   - Simpler than creating fully custom field
   - Add hidden field to store image data URL

2. **Custom field class** (Alternative)
   - More flexible but more complex
   - Would allow better integration with Blockly UI

**Recommendation: Start with button field approach for simplicity**

**Image Storage Strategy:**

Store as Data URL (base64) in block's data property:
- Pros: Persists across page reloads, works offline, serializes with workspace
- Cons: Large size (~33% overhead from base64), can bloat workspace JSON
- Mitigation: Add size warnings/limits (warn if >1MB, reject if >5MB)

Alternative considered but rejected:
- Object URL: Would be lost on page reload
- File path: Not accessible in browser environment

**Implementation Steps:**

1. **Create block definition** (test/blocks/p5_blocks.js):
   ```javascript
   const loadBackgroundImage = {
     'type': 'load_background_image',
     'message0': '📷 load background image %1 %2',
     'args0': [
       {
         'type': 'field_button',
         'name': 'SELECT_BTN',
         'text': 'Select File'
       },
       {
         'type': 'field_label',
         'name': 'FILENAME',
         'text': '(no file)'
       }
     ],
     'previousStatement': null,
     'nextStatement': null,
     'colour': 195
   };
   ```

2. **Add file picker logic** in block init:
   - Create hidden `<input type="file" accept="image/*">` element
   - On button click, trigger file input
   - On file select:
     - Read file as Data URL using FileReader
     - Validate size (warn if >1MB, reject if >5MB)
     - Store data URL in block.data property
     - Update filename label field
     - Optional: Add thumbnail preview

3. **Create generator** (test/blocks/p5_generators.js):
   ```javascript
   forBlock['load_background_image'] = function (block) {
     const imageData = block.data;
     if (!imageData) {
       return '// No background image selected\n';
     }

     // Option A: Use loadImage (async, may cause timing issues)
     const code = `let bgImg = sketch.loadImage('${imageData}');
   sketch.image(bgImg, 0, 0, sketch.width, sketch.height);\n`;

     // Option B: Use createImg then copy to canvas (more reliable)
     // Will need to test which works better

     return code;
   };
   ```

4. **Add to toolbox** (test/toolboxCategories.js or test/blocks/toolbox.js):
   - Add to appropriate category (suggest creating "Media" category)
   - Or add to "Events" category if creating new category is too complex

5. **Handle workspace serialization:**
   - Test that image data persists in workspace save/load
   - May need custom serialization hooks if using block.data

**Technical Challenges & Solutions:**

1. **Async Image Loading in p5:**
   - Challenge: p5.loadImage() is async, may not load before draw
   - Solution: Use preload pattern or check if image loaded before drawing
   - Alternative: Use sketch.loadImage() callback

2. **Large File Sizes:**
   - Challenge: Base64 images bloat workspace JSON
   - Solution: Add validation (max 5MB), show size warning
   - User guidance: Recommend compressing images before loading

3. **Image Timing:**
   - Challenge: Image might not be loaded when draw code runs
   - Solution: Either use p5 preload(), or check img.width > 0 before drawing
   - Or use imageMode/setup pattern

4. **Custom Button Field:**
   - Challenge: Button field doesn't have onClick handler by default
   - Solution: Use setOnClickHandler() in block init (see buttonsBlock example in p5_blocks.js lines 194-204)

**Questions/Decisions:**

1. **Image Preview in Block?**
   - Option A: Show small thumbnail (32x32) in block
   - Option B: Just show filename
   - **Recommend:** Start with filename only, add thumbnail in future iteration

2. **Size Limits:**
   - **Recommend:** Warn at 1MB, reject at 5MB
   - Show user-friendly message explaining size limits

3. **Toolbox Category:**
   - Option A: Add to existing "Events" category
   - Option B: Create new "Media" category
   - **Recommend:** Add to "Events" for now, can reorganize later

4. **Generator Pattern:**
   - Option A: Generate loadImage + callback
   - Option B: Generate direct drawing (simpler but may have timing issues)
   - **Recommend:** Start with Option B, test, switch to Option A if needed

5. **Clear Image Action:**
   - Should there be a way to clear/remove selected image?
   - **Recommend:** Yes - add "Clear" button that appears after file selected
   - Or: Right-click block → "Clear Image" context menu

**Code Structure Example:**

```javascript
// In block init function:
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

this.getField('SELECT_BTN').setOnClickHandler(() => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Size check
  if (file.size > 5 * 1024 * 1024) {
    alert('Image too large (max 5MB)');
    return;
  }
  if (file.size > 1 * 1024 * 1024) {
    console.warn('Large image file, may impact performance');
  }

  // Read as data URL
  const reader = new FileReader();
  reader.onload = (event) => {
    this.data = event.target.result;
    this.getField('FILENAME').setValue(file.name);
  };
  reader.readAsDataURL(file);
});
```

**Testing Plan:**

1. Test file picker opens and can select images
2. Test various image formats (PNG, JPG, GIF)
3. Test size limits work (1MB warning, 5MB rejection)
4. Test image displays correctly in p5 canvas
5. Test workspace save/load preserves image
6. Test with various sky/background colors
7. Test performance with large images
8. Test error handling (invalid files, etc.)

**Future Enhancements** (not in initial implementation):

- Thumbnail preview in block
- Image positioning controls (stretch, center, tile)
- Multiple image support
- Image opacity/blend modes
- Drag-and-drop image loading