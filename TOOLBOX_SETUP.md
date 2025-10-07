# Demo App Toolbox Setup Guide

This document explains how the toolbox is configured in the Blockly keyboard navigation demo app, how blocks are chosen and categorized, and how to modify the toolbox structure.

## Overview

The demo app supports two toolbox modes:

1. **Category Toolbox** (`toolboxCategories.js`) - Traditional toolbox with collapsible categories
2. **Flyout Toolbox** (`test/blocks/toolbox.js`) - Simple flyout with p5.js blocks only

The toolbox mode is controlled by URL parameters (e.g., `?toolbox=flyout` vs `?toolbox=toolbox`).

## File Structure

```
test/
├── index.ts                    # Main demo entry point
├── toolboxCategories.js        # Category toolbox configuration
├── loadTestBlocks.js          # Predefined workspace scenarios
├── blocks/
│   ├── toolbox.js             # Flyout toolbox configuration
│   ├── p5_blocks.js           # Custom p5.js block definitions
│   └── p5_generators.js       # JavaScript code generators for p5 blocks
└── index.html                 # Demo HTML page
```

## Toolbox Configuration Files

### 1. Category Toolbox (`test/toolboxCategories.js`)

This is the main toolbox configuration that includes both standard Blockly blocks and custom p5.js blocks organized into categories.

**Structure:**

```javascript
export default {
  kind: 'categoryToolbox',
  contents: [
    // Standard Blockly categories
    { kind: 'category', name: 'Logic', ... },
    { kind: 'category', name: 'Loops', ... },
    { kind: 'category', name: 'Math', ... },
    { kind: 'category', name: 'Text', ... },
    { kind: 'category', name: 'Lists', ... },
    { kind: 'sep' },  // Separator
    // Dynamic categories
    { kind: 'category', name: 'Variables', custom: 'VARIABLE' },
    { kind: 'category', name: 'Functions', custom: 'PROCEDURE' },
    // Custom p5.js category
    { kind: 'category', name: 'p5 blocks', contents: p5CategoryContents },
    // Misc category with subcategories
    { kind: 'category', name: 'Misc', ... }
  ]
}
```

### 2. Flyout Toolbox (`test/blocks/toolbox.js`)

A simplified toolbox that displays only p5.js blocks in a single flyout.

**Structure:**

```javascript
export const toolbox = {
  kind: 'flyoutToolbox',
  contents: p5CategoryContents,
};
```

### 3. P5.js Category Contents (`test/blocks/toolbox.js`)

Defines the specific p5.js blocks available in the toolbox:

```javascript
export const p5CategoryContents = [
  { kind: 'block', type: 'p5_background_color', ... },
  { kind: 'block', type: 'colour_random' },
  { kind: 'block', type: 'draw_emoji' },
  { kind: 'block', type: 'simple_circle', ... },
  { kind: 'label', text: 'Writing text' },  // Label separator
  { kind: 'block', type: 'write_text_with_shadow', ... },
  { kind: 'block', type: 'write_text_without_shadow' }
]
```

## Block Categories Explained

### Standard Blockly Categories

1. **Logic** - Conditional statements, boolean operations, comparisons
2. **Loops** - Repeat blocks, while/until loops, for loops
3. **Math** - Numbers, arithmetic, trigonometry, constants
4. **Text** - String operations, text manipulation, printing
5. **Lists** - Array operations, list manipulation

### Dynamic Categories

- **Variables** (`custom: 'VARIABLE'`) - Automatically populated with user-created variables
- **Functions** (`custom: 'PROCEDURE'`) - Automatically populated with user-defined functions

### Custom P5.js Category

Contains demo-specific blocks for creative coding:

- `p5_background_color` - Set canvas background color
- `colour_random` - Generate random colors
- `draw_emoji` - Draw emoji characters
- `simple_circle` - Draw colored circles
- `write_text_with_shadow` / `write_text_without_shadow` - Text rendering blocks

### Misc Category

Demonstrates advanced toolbox features:

- Labels for organization
- Subcategories
- Buttons with click handlers
- Disabled blocks

## Custom Block Definitions

### Location: `test/blocks/p5_blocks.js`

This file defines the visual appearance and behavior of custom blocks.

**Block Definition Structure:**

```javascript
const blockDefinition = {
  type: 'block_name',
  message0: 'Display text %1 %2',  // Block text with placeholder %1, %2
  args0: [
    {
      type: 'input_value',        // Input types: input_value, input_statement, field_*
      name: 'INPUT_NAME',
      check: 'String'             // Type checking (optional)
    },
    {
      type: 'field_dropdown',     // Field types: field_dropdown, field_number, etc.
      name: 'FIELD_NAME',
      options: [['Label', 'VALUE'], ...]
    }
  ],
  previousStatement: null,        // Can connect to previous block
  nextStatement: null,           // Can connect to next block
  output: 'String',              // Or null for statement blocks
  colour: 230,                   // Block color (hue)
  tooltip: 'Description',
  helpUrl: 'https://...'
}
```

### Code Generation: `test/blocks/p5_generators.js`

Defines how blocks generate JavaScript code:

```javascript
forBlock['block_name'] = function (block, generator) {
  const input =
    generator.valueToCode(block, 'INPUT_NAME', Order.ATOMIC) || 'default';
  const field = block.getFieldValue('FIELD_NAME');
  return `sketch.someFunction(${input}, '${field}');\n`;
};
```

## How to Modify the Toolbox

### Adding a New Block

1. **Define the block** in `test/blocks/p5_blocks.js`:

```javascript
const myNewBlock = {
  type: 'my_new_block',
  message0: 'do something with %1',
  args0: [{type: 'input_value', name: 'INPUT'}],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: 'Does something cool',
};
```

2. **Add to block registry** in the same file:

```javascript
const jsonBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  // ... existing blocks
  myNewBlock,
]);
```

3. **Create code generator** in `test/blocks/p5_generators.js`:

```javascript
forBlock['my_new_block'] = function (block, generator) {
  const input = generator.valueToCode(block, 'INPUT', Order.ATOMIC) || '0';
  return `sketch.doSomething(${input});\n`;
};
```

4. **Add to toolbox** in `test/blocks/toolbox.js`:

```javascript
export const p5CategoryContents = [
  // ... existing blocks
  {
    kind: 'block',
    type: 'my_new_block',
  },
];
```

### Moving Blocks Between Categories

**To move a block from one category to another:**

1. **Remove from source category** - Delete the block entry from the current category's `contents` array
2. **Add to target category** - Add the block entry to the new category's `contents` array

Example - Moving `colour_random` from p5 category to Logic category:

```javascript
// In toolboxCategories.js, Logic category:
{
  kind: 'category',
  name: 'Logic',
  contents: [
    // ... existing logic blocks
    {
      kind: 'block',
      type: 'colour_random'  // Add here
    }
  ]
}
```

### Removing Blocks

**To remove a block entirely:**

1. **Remove from toolbox** - Delete from all category `contents` arrays
2. **Remove block definition** (optional) - Remove from `p5_blocks.js` if no longer needed
3. **Remove code generator** (optional) - Remove from `p5_generators.js` if no longer needed

**To temporarily disable a block:**

```javascript
{
  kind: 'block',
  type: 'block_name',
  enabled: false  // Block appears grayed out
}
```

### Creating New Categories

```javascript
{
  kind: 'category',
  name: 'My Category',
  categorystyle: 'math_category',  // Reuse existing style or create new
  contents: [
    {
      kind: 'block',
      type: 'my_block_1'
    },
    {
      kind: 'block',
      type: 'my_block_2'
    }
  ]
}
```

### Adding Subcategories

```javascript
{
  kind: 'category',
  name: 'Parent Category',
  contents: [
    {
      kind: 'category',
      name: 'Subcategory',
      contents: [
        { kind: 'block', type: 'sub_block_1' },
        { kind: 'block', type: 'sub_block_2' }
      ]
    }
  ]
}
```

### Adding Labels and Buttons

```javascript
{
  kind: 'category',
  name: 'Enhanced Category',
  contents: [
    {
      kind: 'label',
      text: 'Section: Basic Blocks'
    },
    { kind: 'block', type: 'basic_block' },
    {
      kind: 'button',
      text: 'Create Variable',
      callbackKey: 'CREATE_VARIABLE'  // Must register callback separately
    }
  ]
}
```

## Block Configuration Options

### Input Types

- `input_value` - Accepts value blocks (expressions)
- `input_statement` - Accepts statement blocks (commands)
- `input_dummy` - No input, just spacing

### Field Types

- `field_input` - Text input
- `field_number` - Number input with optional constraints
- `field_dropdown` - Dropdown selection
- `field_checkbox` - Boolean checkbox
- `field_colour` - Color picker (requires `@blockly/field-colour`)
- `field_image` - Image display

### Block Properties

- `previousStatement` - Can connect above another block
- `nextStatement` - Can connect below another block
- `output` - Returns a value (specify type or `null`)
- `colour` - Block color (0-360 hue value)
- `tooltip` - Help text on hover
- `helpUrl` - Documentation link

## Testing Your Changes

1. **Rebuild the demo:**

   ```bash
   npm run build
   npm start
   ```

2. **Test different scenarios:**

   - Navigate to `http://localhost:3000`
   - Try different URL parameters:
     - `?toolbox=flyout` - Test flyout mode
     - `?toolbox=toolbox` - Test category mode
     - `?scenario=simpleCircle` - Test with different workspace content

3. **Verify keyboard navigation:**
   - Use `Tab` to navigate between toolbox and workspace
   - Use `T` to focus toolbox
   - Use arrow keys to navigate through categories and blocks
   - Test block insertion and manipulation

## Integration Points

The toolbox integrates with several systems:

1. **Keyboard Navigation Plugin** - All toolbox interactions work with keyboard navigation
2. **Block Registry** - Custom blocks must be registered via `Blockly.common.defineBlocks()`
3. **Code Generators** - Block generators must be assigned to `javascriptGenerator.forBlock`
4. **Scenario Loading** - Predefined workspaces in `loadTestBlocks.js` reference block types

## Best Practices

1. **Consistent Naming** - Use clear, descriptive block type names
2. **Logical Grouping** - Group related blocks in the same category
3. **Proper Dependencies** - Ensure shadow blocks and default values make sense
4. **Type Safety** - Use `check` properties to enforce proper connections
5. **User Experience** - Consider the logical flow from toolbox to workspace
6. **Testing** - Always test both mouse and keyboard interactions

This documentation provides a complete guide to understanding and modifying the demo app's toolbox configuration. The modular structure allows for easy customization while maintaining compatibility with the keyboard navigation plugin.
