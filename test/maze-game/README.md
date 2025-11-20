# Maze Game - Blockly with Keyboard Navigation

A simple maze navigation game built with modern Blockly (v12.3.1) and the keyboard navigation plugin with eye gaze accessibility features.

## Overview

This is a proof-of-concept demonstrating how to integrate educational games with Blockly's keyboard navigation and eye gaze support. The game is adapted from the original [Blockly Games](https://github.com/google/blockly-games) maze game.

## Features

- ✅ **Full keyboard navigation** - Navigate blocks using arrow keys
- ✅ **Eye gaze support** - Includes sticky mode, connection highlighting, and move grip
- ✅ **Custom maze blocks** - Move forward, turn, conditionals, and loops
- ✅ **Visual feedback** - Animated player movement on canvas
- ✅ **Multiple levels** - Currently includes 2 levels (easy to add more)
- ✅ **Separate app** - Runs independently on port 8082

## Running the Game

```bash
# From the blockly-keyboard-experimentation directory
npm run start:maze
```

The game will be available at http://localhost:8082/

## Building for Production

```bash
npm run build:maze
```

Output will be in `test/maze-game/bundle.js` and `test/maze-game/index.html`

## How to Play

1. **Click on the Blockly workspace** or press Tab to focus on it
2. **Use arrow keys** to navigate available blocks in the toolbox
3. **Press Enter** to add a block to the workspace
4. **Build your program** using the maze blocks:
   - `move forward` - Move the player one space forward
   - `turn left` / `turn right` - Rotate the player 90 degrees
   - `if path ahead/left/right` - Conditional logic based on available paths
   - `repeat until finish` - Loop until the goal is reached
5. **Click "Run Program"** to execute your code
6. **Watch the blue player** navigate to the green goal

## Keyboard Navigation Features

Once the Blockly workspace has focus:

- **Arrow keys** - Navigate between blocks and connections
- **Enter** - Edit fields, connect blocks, or open toolbox
- **Escape** - Exit current mode
- **Tab** - Move between major UI elements
- **/** - Open keyboard shortcuts help

### Eye Gaze Features

- **Double-click a block** - Enters "sticky mode" where the block follows your cursor
- **Click connections** - While in sticky mode, click to connect blocks
- **Connection highlighting** - Valid connection points are highlighted in green
- **Move grip** - Visual handle appears on focused blocks

## File Structure

```
test/maze-game/
├── index.html          # Main HTML page with UI layout
├── index.ts            # App initialization and setup
├── blocks.ts           # Maze-specific Blockly block definitions
├── maze.ts             # Game engine (rendering, logic, execution)
├── webpack.config.js   # Build configuration
└── README.md           # This file
```

## Architecture

The game follows a clean separation of concerns:

1. **Blockly Core** (A) - Standard Blockly v12.3.1
2. **Keyboard Plugin** (B) - `@blockly/keyboard-navigation` with eye gaze features
3. **Game App** (C) - This maze game implementation

### Key Components

**blocks.ts**
- Registers 5 custom block types
- Implements JavaScript code generators
- Adds visual enhancements (arrows on turn directions)

**maze.ts**
- `MazeGame` class handles all game logic
- Canvas-based rendering
- Player state management
- Async execution with visual feedback
- Path detection for conditionals

**index.ts**
- Initializes Blockly workspace
- Sets up keyboard navigation plugin
- Wires up UI controls (Run, Reset buttons)
- Handles code generation and execution

## Adding More Levels

Edit `maze.ts` and add new maze layouts to the `MAZES` array:

```typescript
const MAZES = [
  // Your new level
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 0, 0, 0, 0],  // 2 = start
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 3, 0],  // 3 = finish
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
];
```

Legend:
- `0` = Wall
- `1` = Open path
- `2` = Start position
- `3` = Finish/goal

## Next Steps

Potential enhancements:
- [ ] Add level selection UI
- [ ] Implement more complex maze patterns
- [ ] Add scoring/performance metrics
- [ ] Save/load programs
- [ ] Add sound effects
- [ ] Implement hints system
- [ ] Add step-by-step debugger

## Credits

- Original game concept: [Blockly Games](https://github.com/google/blockly-games) by Neil Fraser
- Keyboard navigation plugin: [Google Blockly Team](https://github.com/google/blockly-keyboard-experimentation)
- Eye gaze enhancements: Custom additions for accessibility

## License

Apache-2.0 (same as Blockly)
