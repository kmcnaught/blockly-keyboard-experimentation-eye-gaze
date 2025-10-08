# Plan: Implement Slider Field for Terrain Height Parameter

## Overview
Replace the number field with a slider field for the terrain height parameter to provide a more intuitive visual control using +/- or dragging instead of typing numbers.

## Steps

### 1. Install the `@blockly/field-slider` package
```bash
npm install @blockly/field-slider
```

### 2. Update `test/blocks/p5_blocks.js`
Change the height field in the `drawTerrain` block definition from `field_number` to `field_slider`:

**Before:**
```javascript
{
  'type': 'field_number',
  'name': 'HEIGHT',
  'value': 100,
  'min': 10,
  'max': 200,
  'precision': 1,
}
```

**After:**
```javascript
{
  'type': 'field_slider',
  'name': 'HEIGHT',
  'value': 100,
  'min': 10,
  'max': 200,
  'precision': 1,
}
```

### 3. Update the test page setup
Find where blocks are loaded in the test setup (likely in `test/index.html` or similar) and import/register the field-slider plugin:

```javascript
import '@blockly/field-slider';
```

Or if using script tags:
```html
<script src="path/to/field-slider/dist/index.js"></script>
```

The plugin must be registered **before** blocks are defined.

### 4. Test the implementation
- Run `npm start` to launch the test environment
- Open the browser
- Verify that the terrain block now shows a slider control instead of a number input
- Test that the slider:
  - Can be dragged to change values
  - Respects min (10) and max (200) bounds
  - Updates the terrain rendering correctly
  - Works with all terrain types (hills, mountains, seaside, fields, desert, forest)

## Files to Modify

1. `package.json` - Add `@blockly/field-slider` dependency
2. `test/blocks/p5_blocks.js` - Change field type for HEIGHT parameter
3. Test setup file (e.g., `test/index.html`, `test/loadTestBlocks.js`, or similar) - Import and register the slider field plugin

## Files NOT Modified

- `test/blocks/p5_generators.js` - No changes needed! The slider field returns the same numeric value as field_number, so the generator code will continue to work without modification.

## Benefits

- **Better UX**: Visual slider is more intuitive than typing numbers
- **Professional**: Uses official Blockly plugin
- **Maintained**: Plugin is actively maintained by the Blockly team
- **Compatible**: Works exactly like field_number but with better UI

## Alternative Options Considered

1. **@blockly/field-angle**: Circular dial control (better for angles than percentages)
2. **Custom field with +/- buttons**: Would require 2-4 hours of custom development
3. **Keep field_number**: Less user-friendly

**Recommendation**: Use `@blockly/field-slider` (this plan) as it's the best fit.
