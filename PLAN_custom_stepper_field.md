# Plan: Create Custom Field with +/- Increment/Decrement Buttons

## Overview
Create a custom `FieldStepper` that extends Blockly's `FieldNumber` and adds +/- buttons for incrementing and decrementing the value. This provides an intuitive UI alternative to typing numbers.

## Goals
- Visual +/- buttons that increment/decrement by the precision value
- Maintain all FieldNumber functionality (min, max, precision constraints)
- Clean, accessible UI that matches Blockly's design language
- Reusable field that can be used in any block

## Architecture

### File Structure
```
test/
  fields/
    field_stepper.js        # Main custom field implementation
    field_stepper.css       # Styling for the stepper buttons
  blocks/
    p5_blocks.js           # Update to use field_stepper
  index.html               # Import field_stepper files
```

## Implementation Steps

### Step 1: Create the FieldStepper Class

**File: `test/fields/field_stepper.js`**

```javascript
/**
 * Custom field that extends FieldNumber with +/- stepper buttons
 */
class FieldStepper extends Blockly.FieldNumber {
  /**
   * Constructor - same signature as FieldNumber
   */
  constructor(value, min, max, precision, validator, config) {
    super(value, min, max, precision, validator, config);
  }

  /**
   * Override showEditor_ to show our custom stepper UI instead of text input
   */
  showEditor_() {
    // Create the editor container
    const editor = this.createStepperEditor_();

    // Show in DropDownDiv (like dropdowns/color pickers)
    Blockly.DropDownDiv.clearContent();
    Blockly.DropDownDiv.getContentDiv().appendChild(editor);

    // Position and show the dropdown
    Blockly.DropDownDiv.showPositionedByField(
      this,
      this.dropdownDispose_.bind(this)
    );
  }

  /**
   * Create the stepper editor UI with +/- buttons and value display
   */
  createStepperEditor_() {
    const container = document.createElement('div');
    container.className = 'fieldStepperContainer';

    // Decrement button (-)
    const decrementBtn = document.createElement('button');
    decrementBtn.className = 'fieldStepperButton fieldStepperDecrement';
    decrementBtn.textContent = '−'; // minus sign (U+2212)
    decrementBtn.addEventListener('click', () => this.decrement_());

    // Value display
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'fieldStepperValue';
    valueDisplay.textContent = this.getValue();
    this.valueDisplay_ = valueDisplay;

    // Increment button (+)
    const incrementBtn = document.createElement('button');
    incrementBtn.className = 'fieldStepperButton fieldStepperIncrement';
    incrementBtn.textContent = '+';
    incrementBtn.addEventListener('click', () => this.increment_());

    // Assemble UI
    container.appendChild(decrementBtn);
    container.appendChild(valueDisplay);
    container.appendChild(incrementBtn);

    return container;
  }

  /**
   * Increment the value by precision amount
   */
  increment_() {
    const currentValue = this.getValue();
    const precision = this.getPrecision() || 1;
    const newValue = currentValue + precision;

    // setValue automatically applies min/max constraints
    this.setValue(newValue);

    // Update display
    if (this.valueDisplay_) {
      this.valueDisplay_.textContent = this.getValue();
    }
  }

  /**
   * Decrement the value by precision amount
   */
  decrement_() {
    const currentValue = this.getValue();
    const precision = this.getPrecision() || 1;
    const newValue = currentValue - precision;

    // setValue automatically applies min/max constraints
    this.setValue(newValue);

    // Update display
    if (this.valueDisplay_) {
      this.valueDisplay_.textContent = this.getValue();
    }
  }

  /**
   * Clean up when editor is disposed
   */
  dropdownDispose_() {
    this.valueDisplay_ = null;
  }

  /**
   * Register this field type with Blockly
   */
  static fromJson(options) {
    return new FieldStepper(
      options.value,
      undefined,
      undefined,
      undefined,
      undefined,
      options
    );
  }
}

// Register the field type
Blockly.fieldRegistry.register('field_stepper', FieldStepper);
```

### Step 2: Create CSS Styling

**File: `test/fields/field_stepper.css`**

```css
/* Stepper container */
.fieldStepperContainer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Stepper buttons */
.fieldStepperButton {
  width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.fieldStepperButton:hover {
  background: #e8e8e8;
  border-color: #999;
}

.fieldStepperButton:active {
  background: #ddd;
  transform: scale(0.95);
}

.fieldStepperButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
}

/* Value display */
.fieldStepperValue {
  min-width: 50px;
  padding: 4px 12px;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
}

/* Keyboard focus indicators */
.fieldStepperButton:focus {
  outline: 2px solid #4285f4;
  outline-offset: 2px;
}
```

### Step 3: Update Block Definition

**File: `test/blocks/p5_blocks.js`**

Change the terrain block's height field from `field_number` to `field_stepper`:

```javascript
const drawTerrain = {
  'type': 'draw_terrain',
  'tooltip': 'Draw terrain without needing coordinates',
  'helpUrl': '',
  'message0': '⛰️ draw %1 terrain with %2 % height',
  'args0': [
    {
      'type': 'field_dropdown',
      'name': 'STYLE',
      'options': [
        ['hills', 'hills'],
        ['mountains', 'mountains'],
        ['seaside', 'seaside'],
        ['fields', 'fields'],
        ['desert', 'desert'],
        ['forest', 'forest'],
      ],
    },
    {
      'type': 'field_stepper',  // ← Changed from field_number
      'name': 'HEIGHT',
      'value': 100,
      'min': 10,
      'max': 200,
      'precision': 1,
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 140,
};
```

### Step 4: Update HTML to Load the Field

**File: `test/index.html` (or wherever blocks are loaded)**

Add script and style tags to load the custom field:

```html
<!-- Add in <head> section -->
<link rel="stylesheet" href="fields/field_stepper.css">

<!-- Add before blocks are defined -->
<script src="fields/field_stepper.js"></script>
```

### Step 5: Test the Implementation

**Testing checklist:**
- [ ] Stepper UI appears when clicking the height value
- [ ] + button increments value by precision (1)
- [ ] - button decrements value by precision (1)
- [ ] Values respect min (10) and max (200) constraints
- [ ] Disabled state when at min/max (optional enhancement)
- [ ] Value updates in real-time on the block
- [ ] Terrain rendering updates correctly
- [ ] Works with all terrain types
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Accessible (screen reader support)

## Enhancement Options

### Optional Enhancement 1: Disable Buttons at Limits
Add logic to disable +/- buttons when at min/max:

```javascript
createStepperEditor_() {
  // ... existing code ...

  // Update button states
  this.updateButtonStates_(decrementBtn, incrementBtn);

  return container;
}

updateButtonStates_(decrementBtn, incrementBtn) {
  const value = this.getValue();
  const min = this.getMin();
  const max = this.getMax();

  decrementBtn.disabled = (value <= min);
  incrementBtn.disabled = (value >= max);
}

increment_() {
  // ... existing code ...
  this.updateButtonStates_(/* pass buttons */);
}
```

### Optional Enhancement 2: Hold to Repeat
Add continuous increment/decrement when holding button:

```javascript
createStepperEditor_() {
  // ... existing code ...

  // Add mousedown/mouseup for hold-to-repeat
  let repeatInterval;

  incrementBtn.addEventListener('mousedown', () => {
    this.increment_();
    repeatInterval = setInterval(() => this.increment_(), 150);
  });

  incrementBtn.addEventListener('mouseup', () => {
    clearInterval(repeatInterval);
  });

  // Same for decrement button
}
```

### Optional Enhancement 3: Custom Step Size
Add a separate `step` parameter independent of `precision`:

```javascript
constructor(value, min, max, precision, validator, config) {
  super(value, min, max, precision, validator, config);
  this.stepSize_ = config?.step || precision || 1;
}

increment_() {
  const newValue = this.getValue() + this.stepSize_;
  this.setValue(newValue);
}
```

## Estimated Effort

- **Basic implementation**: 1-2 hours
- **With button disable at limits**: +30 minutes
- **With hold-to-repeat**: +45 minutes
- **With custom step size**: +15 minutes
- **Testing and polish**: 1 hour

**Total: 2-4 hours** depending on enhancement level

## Files to Create/Modify

**New files:**
- `test/fields/field_stepper.js` (~100-150 lines)
- `test/fields/field_stepper.css` (~50 lines)

**Modified files:**
- `test/blocks/p5_blocks.js` (1 line change: field type)
- `test/index.html` (2 lines: script/style includes)

**No changes needed:**
- `test/blocks/p5_generators.js` (stepper returns same value type as number field)

## Benefits

✅ Intuitive UI - visual buttons easier than typing
✅ Maintains all FieldNumber functionality
✅ Reusable - can use in other blocks
✅ Clean design that matches Blockly aesthetics
✅ Accessible with keyboard navigation
✅ No external dependencies

## Next Steps

After plan approval:
1. Create the field_stepper.js file with basic implementation
2. Create the field_stepper.css file with styling
3. Update p5_blocks.js to use field_stepper
4. Update HTML to load the new files
5. Test in browser
6. Add enhancements if desired
7. Document usage for future blocks
