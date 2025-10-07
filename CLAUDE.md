# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the @blockly/keyboard-navigation plugin for Blockly, enabling keyboard navigation for visual programming environments. The plugin supports accessibility features by allowing users to navigate Blockly workspaces using keyboard shortcuts and arrow keys, which is particularly important for visually impaired and motor-impaired users.

The plugin extends Blockly's core functionality with a comprehensive keyboard navigation system that includes:

- Cursor-based navigation through blocks, connections, and fields
- Context-aware keyboard shortcuts
- Intelligent block insertion and movement
- Integration with Blockly's toolbox and flyout systems
- Visual focus indicators and accessibility styling

## Development Commands

### Building and Development

```bash
# Build the plugin
npm run build

# Start development server (for testing)
npm start

# Clean build artifacts
npm run clean

# Format code
npm run format

# Check formatting
npm run format:check
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only (Mocha)
npm run test:mocha

# Run browser integration tests only (WebdriverIO)
npm run test:wdio

# Build and run WebdriverIO tests manually
npm run wdio:build
npm run wdio:run

# Clean WebdriverIO test builds
npm run wdio:clean
```

### Linting

```bash
# Lint code
npm run lint

# Lint and auto-fix issues
npm run lint:fix
```

### Deployment

```bash
# Deploy to GitHub Pages
npm run ghpages

# Prepare for deployment
npm run predeploy
```

## Architecture Overview

### Core Components

- **KeyboardNavigation** (`src/index.ts`): Main plugin class that coordinates all keyboard navigation functionality
- **NavigationController** (`src/navigation_controller.ts`): Central controller that registers shortcuts and manages navigation state
- **Navigation** (`src/navigation.ts`): Core navigation logic including cursor management, block connection, and workspace state
- **Actions** (`src/actions/`): Modular action system for different keyboard operations:
  - `arrow_navigation.ts`: Arrow key navigation
  - `clipboard.ts`: Copy/cut/paste operations
  - `delete.ts`: Block deletion
  - `edit.ts`: Field editing
  - `move.ts`: Block movement and dragging
  - `enter.ts`: Enter key actions
  - `exit.ts`: Exit/escape actions
  - `duplicate.ts`: Block duplication
  - `disconnect.ts`: Block disconnection
  - `action_menu.ts`: Context menu actions
  - `stack_navigation.ts`: Navigating through block stacks
  - `ws_movement.ts`: Workspace-level movement

### Key Architecture Patterns

1. **Action System**: Each keyboard operation is encapsulated in an action class that can be installed/uninstalled and handles its own shortcuts and context menus.

2. **Navigation States**: The system tracks different navigation states (WORKSPACE, TOOLBOX, FLYOUT, NOWHERE) to provide context-appropriate behavior.

3. **Cursor Management**: Uses Blockly's cursor system with custom extensions for flyout navigation and intelligent positioning.

4. **Monkey Patching**: Strategically overrides core Blockly methods (particularly toolbox keyboard handling) to integrate navigation seamlessly.

5. **Focus Management**: Integrates with Blockly's focus manager to handle focus transitions between workspace, toolbox, and flyout.

### Styling and Visual Indicators

The plugin registers extensive CSS for visual focus indicators:

- Active focus (solid yellow outline): Current navigation target
- Passive focus (dashed yellow outline): Secondary focus indicators
- Tree focus (blue outline): Indicates which major area (workspace/toolbox/flyout) is active
- Workspace rings: Visual boundaries for workspace focus

### Integration Points

- **Blockly Core**: Extends workspace, cursor, and focus management systems
- **Toolbox**: Custom toolbox implementation that defers keyboard handling
- **Flyout**: Special cursor implementation for flyout navigation
- **Cross-tab Copy/Paste**: Compatible with the @blockly/plugin-cross-tab-copy-paste plugin

## Testing Strategy

The project uses a two-tier testing approach:

### Unit Tests (Mocha)

- Located in `test/controller_test.mocha.js`
- Test core navigation logic and action functionality
- Run with `npm run test:mocha`

### Integration Tests (WebdriverIO)

- Located in `test/webdriverio/test/`
- Browser-based tests that simulate real user interactions
- Test files cover specific functionality:
  - `basic_test.ts`: Basic navigation and setup
  - `actions_test.ts`: Action system functionality
  - `clipboard_test.ts`: Copy/paste operations
  - `delete_test.ts`: Block deletion
  - `move_test.ts`: Block movement and dragging
  - `flyout_test.ts`: Flyout navigation
  - `keyboard_mode_test.ts`: Keyboard mode activation
  - And more specific test suites for different features

### Test Architecture

- Tests use a custom test setup (`test_setup.ts`) that provides helper functions
- Hooks (`hooks.ts`) handle test environment setup and cleanup
- Tests build a webpack bundle for the browser environment
- TypeScript configuration specific to tests in `test/webdriverio/test/tsconfig.json`

## Working with the Plugin

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run format` to format code
3. Run `npm run lint` to check for issues
4. Run `npm test` to verify functionality
5. Use `npm start` to test in the browser
6. Build with `npm run build` before committing

### Adding New Actions

1. Create new action class in `src/actions/`
2. Implement `install()` and `uninstall()` methods
3. Register shortcuts and context menu items
4. Add to NavigationController's initialization
5. Add corresponding tests in appropriate test files

### Debugging Navigation Issues

- Use browser developer tools to inspect focus states
- Check for `.blocklyActiveFocus` and `.blocklyPassiveFocus` classes
- Monitor keyboard events and shortcut registration
- Use the shortcut dialog (`/` key) to see available shortcuts

## Plugin Usage Notes

### Initialization Requirements

1. Call `KeyboardNavigation.registerKeyboardNavigationStyles()` before `Blockly.inject()`
2. Call `KeyboardNavigation.registerNavigationDeferringToolbox()` if using default toolbox
3. Create KeyboardNavigation instance after workspace injection
4. Add empty `<div id="shortcuts"></div>` to page for help dialog

### Custom Toolbox Integration

If using a custom toolbox, override the `onKeyDown_` method to be a no-op to prevent conflicts with the plugin's navigation system.

### Cross-tab Copy/Paste Compatibility

When integrating with @blockly/plugin-cross-tab-copy-paste:

1. Initialize the cross-tab plugin first with `contextMenu: false`
2. Initialize KeyboardNavigation with `allowCrossWorkspacePaste: true`
