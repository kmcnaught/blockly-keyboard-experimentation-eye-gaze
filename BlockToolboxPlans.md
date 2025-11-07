# Simplified Block Coding Toolbox - Requirements

## Context

Simplifying a block coding workspace for user testing with inexperienced users. 
Current toolbox has: drawing blocks (faces, landscape, effects), logic, events, conditions, maths, input, and values.

## Goal

Create a minimal viable prototype that demonstrates:

- Basic drawing capabilities
- Meaningful logic usage (conditions/branching)
- Different input types (dropdowns, checkboxes, value fields)

## Specific Requirements

### Keep & Modify:

1. **Drawing Faces** - Already has color parameters; add a checkbox for “extra large” or similar size modifier
1. **Drawing Landscape** - Improve naming clarity (e.g., “draw terrain” not just generic labels); add either checkbox for “extreme” variant or dropdown for size options
1. **Drawing Effects/Basic Shapes** - Keep if useful for demonstrating random number usage
1. **Logic** - Reduce to: if statement, if-else statement
1. **Conditions** - Keep: mouse movement detection, boolean values
1. **Values** - Keep: random color, add random position
1. **Variables** - Preload toolbox with 2-3 sample variables

### Remove:

- Excess math operations
- Redundant drawing blocks
- Complex logic beyond if/if-else

### Clarify Naming:

- Landscape dropdown currently says “sun/moon/stars” but these are sky objects - rename to be explicit about what’s being drawn and where

## Deliverable

A streamlined toolbox where users can draw an interesting picture while applying basic conditional logic, demonstrating all input types (dropdowns, checkboxes, numeric values).