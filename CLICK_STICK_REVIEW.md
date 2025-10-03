# Click and Stick Implementation Review

**Date**: 2025-09-30
**Commit**: 3f41122 "Click and stick strategy"
**Changes**: 30 files, 9842 insertions, 701 deletions

---

## Executive Summary

### What's Good:
1. ✅ Core concept is solid - sticky mode fills a real accessibility need
2. ✅ Extends core `BlockDragStrategy` appropriately
3. ✅ Tests are comprehensive (click_stick_test.ts, touch_click_stick_test.ts)
4. ✅ Shares code between mouse and touch modalities
5. ✅ Performance throttling implemented

### Critical Issues:
1. 🔴 **Coordinate system bug** (line 1003-1010 in index.ts) - mixing workspace and screen coords
2. 🔴 **Excessive console logging** - 30+ production logs
3. 🔴 **Poor encapsulation** - 12+ `@ts-expect-error` accessing private properties
4. 🟡 **Duplicated ConnectionCandidate** interface from core
5. 🟡 **Large class** - index.ts is ~2000 lines, violates SRP

### Architectural Concerns:
1. ⚠️ **ConnectionHighlighter** (1100 lines) - may duplicate core's ConnectionPreviewer functionality
2. ⚠️ **Bypassing gesture system** - manual click detection instead of using core's gesture system
3. ⚠️ **Emergency cleanup** - suggests incomplete lifecycle management

### Priority Actions:
1. **Fix coordinate bug** (breaks distance detection)
2. **Extract sticky mode to separate class**
3. **Remove debug logging**
4. **Investigate core's connection preview system** - determine if custom highlighter is necessary
5. **Add proper error boundaries** and remove emergency cleanup hacks
6. **Unify touch/mouse code paths** completely

### Estimated Effort:
- Phase 1 (Critical): 2-3 days
- Phase 2 (Core Integration): 1 week
- Phase 3 (Robustness): 1 week
- Phase 4-5 (Quality/Performance): 3-5 days

---

## 1. ARCHITECTURE & CONSISTENCY WITH EXISTING CODEBASE

### ✅ Strengths:
- **Good separation of concerns**: `KeyboardDragStrategy` extends core's `BlockDragStrategy`, `ConnectionHighlighter` is separate, and sticky mode logic lives in `index.ts`
- **Follows plugin patterns**: Integration through `NavigationController` and `Mover` is consistent with existing keyboard navigation architecture
- **Event-driven design**: Properly uses event listeners for double-click, touch, and pointer events

### ⚠️ Issues:

#### 1.1. Tight coupling in `index.ts` (lines 812-1200+)
- The `KeyboardNavigation` class has grown to ~2000 lines with sticky mode logic embedded
- **Problem**: Violates single responsibility principle; mixing plugin initialization with feature-specific logic
- **Impact**: Makes the code harder to maintain and test

#### 1.2. Direct property access instead of encapsulation
```typescript
// src/index.ts:850, 891, 986, 1049, 1129
const mover = (this.navigationController as any).mover;
const dragStrategy = (block as any).dragStrategy;
```
- **Problem**: Breaking encapsulation with `as any` casts suggests missing proper APIs
- **Impact**: Fragile code that could break with internal changes

#### 1.3. Inconsistent state management
- Multiple state flags: `isInStickyMode`, `stickyBlock`, `stickyOffset`, `lastTargetPosition`
- **Problem**: State scattered across class, no clear state machine
- **Impact**: Hard to reason about which states are valid together

---

## 2. INTEGRATION WITH CORE BLOCKLY

### ✅ Strengths:
- **Extends core properly**: `KeyboardDragStrategy extends dragging.BlockDragStrategy` correctly inherits core behavior (keyboard_drag_strategy.ts:33)
- **Uses core APIs appropriately**: `block.moveDuringDrag()`, `workspace.connectionChecker`, connection types

### ⚠️ Issues:

#### 2.1. Duplicated ConnectionCandidate interface
```typescript
// keyboard_drag_strategy.ts:21-30
interface ConnectionCandidate {
  local: RenderedConnection;
  neighbour: RenderedConnection;
  distance: number;
}
```
- **Problem**: Core already defines this (blockly/core/dragging/block_drag_strategy.ts:28-37)
- **Solution**: Should import from core if exposed, or reference core's type

#### 2.2. Excessive use of @ts-expect-error
- Found 12+ instances accessing private properties: `connectionCandidate`, `startParentConn`, `workspace`, `block.dragStrategy`
- **Problem**: Working against core's encapsulation; fragile to core changes
- **Better approach**:
  - Request core to expose needed APIs
  - Use public methods where available
  - Consider if the design needs adjustment to work with public APIs

#### 2.3. Connection highlighting reimplements core functionality
```typescript
// connection_highlighter.ts:338-468 (createCoreBasedNotchHighlight)
```
- Attempts to use core's `addConnectionHighlight` but includes substantial fallback logic
- **Problem**: 1100+ lines of connection visualization that may overlap with core
- **Question**: Could core's existing connection preview system be leveraged more?

---

## 3. CODE REUSE & NOT REINVENTING

### ⚠️ Major Issues:

#### 3.1. ConnectionHighlighter duplicates core dragging visuals
- Core `BlockDragStrategy` already has `connectionPreviewer` and connection candidate system
- **Your implementation**: Separate `ConnectionHighlighter` with own visualization (connection_highlighter.ts:1-1125)
- **Problem**: Reimplements connection visualization, notch creation, bounds calculation
- **Evidence**: Methods like `createStatementNotch()`, `createValueOutline()`, `getActualSocketBounds()`
- **Core equivalent**: `ConnectionPreviewer` interface and implementations

#### 3.2. Parallel click handling systems
```typescript
// index.ts:974-1038 handleStickyModeClick
// - Checks bin/trashcan manually
// - Finds connections at point
// - Manages connection candidates
```
- Core already has gesture system for clicks, drag detection, connection snapping
- **Problem**: Bypassing core's gesture system could cause conflicts
- **Evidence**: Line 796-800 tries to detect fields using `workspace.currentGesture_`

#### 3.3. Custom coordinate transformations
```typescript
// connection_highlighter.ts:759-771
private transformCoordinates(x: number, y: number, workspace: WorkspaceSvg)
```
- Core has `utils.svgMath.wsToScreenCoordinates` and inverse
- **Check**: Are you using core's coordinate utilities consistently?

---

## 4. ROBUSTNESS & CODE SHARING BETWEEN INPUT MODALITIES

### ✅ Strengths:
- **Good**: Mouse and touch share `handlePointerMove()` (index.ts:913-969)
- **Good**: Throttling implemented for performance (16ms, ~60fps)
- **Good**: Touch events create synthetic mouse events for consistency

### ⚠️ Issues:

#### 4.1. Inconsistent event handling paths
```typescript
// Touch creates synthetic MouseEvent (index.ts:732-745)
// But also has separate handleTouchEnd (index.ts:718-747)
// Both eventually call handleStickyModeClick but through different paths
```
- **Problem**: Touch and mouse don't fully share code path
- **Risk**: Behavior drift between modalities

#### 4.2. Race conditions and state cleanup
```typescript
// keyboard_drag_strategy.ts:161-175 endDrag()
if (this.highlightingEnabled && !this.isClickAndStick) {
  this.connectionHighlighter.clearHighlights();
} else if (this.isClickAndStick) {
  console.log('Preserving connection highlights during click and stick');
}
```
- **Problem**: `isClickAndStick` flag must be manually managed
- **Risk**: If cleanup fails, highlights persist (noted with emergency cleanup at line 72-86)

#### 4.3. Failsafe cleanup suggests reliability concerns
```typescript
// connection_highlighter.ts:71-86
// Global cleanup function as emergency backup
window.clearAllConnectionHighlights = () => { ... }

// connection_highlighter.ts:129-132
// 15-second auto-cleanup timeout
this.autoCleanupTimeout = window.setTimeout(() => {
  this.clearHighlights();
}, 15000);
```
- **Problem**: Need for emergency escape hatches indicates incomplete lifecycle management
- **Solution**: Fix root cause of highlight cleanup failures

#### 4.4. Missing error boundaries
- Most try-catch blocks just log and continue
- Example: `enterStickyMode()` has try-catch (index.ts:832) but partial state changes before the try
- **Risk**: Could leave workspace in inconsistent state

---

## 5. LOGGING & COMMENTS

### ✅ Good practices:
- License headers present
- Public methods have JSDoc
- Some inline comments explain complex logic

### ⚠️ Issues:

#### 5.1. Excessive console.log statements (30+ instances)
```typescript
// keyboard_drag_strategy.ts:105-125
console.log('KeyboardDragStrategy startDrag - highlighting enabled:', ...);
console.log('All connections found:', this.allConnections.length);
console.log('Local connections on moving block:', ...);
console.log('Valid connections to highlight:', ...);
```
- **Problem**: Production logging left in; no log levels; performance impact
- **Comparison**: Core Blockly uses minimal console logging
- **Action**: Replace with debug flag or remove entirely

#### 5.2. Debug comments not removed
```typescript
// connection_highlighter.ts:1151
console.log('KM --- findConnectionAtPoint ---');
console.log('KM Screen coords:', clientX, clientY);
```
- **Problem**: Developer initials in code; debug markers left in
- **Action**: Remove debug artifacts

#### 5.3. Outdated/redundant comments
```typescript
// keyboard_drag_strategy.ts:20
// Copied in from core because it is not exported.
interface ConnectionCandidate { ... }
```
- **Comment**: Explains duplication but doesn't suggest it should be fixed
- **Better**: File issue to export from core, add TODO with issue number

#### 5.4. Missing critical documentation
- `ConnectionHighlighter` class (1100+ lines) lacks overview of its role vs core's connection previewer
- Sticky mode state transitions undocumented
- No explanation of why separate connection highlighting is needed

---

## 6. SPECIFIC CODE ISSUES

### 6.1. Performance concerns
```typescript
// index.ts:756-785 getBlockFromEvent
const blocks = this.workspace.getAllBlocks(); // Gets ALL blocks on every event
```
- **Problem**: O(n) search through all blocks on every click/touch
- **Solution**: Use core's gesture system or block lookup by ID

### 6.2. Brittle DOM queries
```typescript
// index.ts:1104
const trashcanElement = document.querySelector('.blocklyTrash');
```
- **Problem**: Depends on core's CSS classes; could break
- **Better**: Use workspace.trashcan API if available

### 6.3. Magic numbers
```typescript
const isDeliberateTap = distanceFromMouse > 50; // index.ts:1009
const UNCONSTRAINED_MOVE_DISTANCE = 20; // mover.ts:38
```
- **Problem**: Not explained; not configurable
- **Solution**: Make constants with explanatory names, document why these values

### 6.4. Inconsistent coordinate systems (CRITICAL BUG)
```typescript
// index.ts:1003-1010
// Compares screen coordinates (clientX/Y) with workspace coordinates (lastTargetPosition)
const lastMousePos = this.lastTargetPosition; // workspace coords stored
const clickPos = {x: event.clientX, y: event.clientY}; // screen coords
const distanceFromMouse = Math.sqrt(...); // comparing apples to oranges!
```
- **Problem**: Coordinate system mismatch will give wrong distances
- **Impact**: isDeliberateTap logic is broken

---

## CONCRETE IMPROVEMENT PLAN

### Phase 1: Critical Fixes (High Priority)

#### 1.1. Fix coordinate system bug (index.ts:1003-1010)
```typescript
// BEFORE (BROKEN):
const lastMousePos = this.lastTargetPosition; // workspace coords
const clickPos = {x: event.clientX, y: event.clientY}; // screen coords
const distanceFromMouse = Math.sqrt(...); // WRONG!

// AFTER (FIXED):
const rect = this.workspace.getParentSvg().getBoundingClientRect();
const clickWorkspacePos = {
  x: (event.clientX - rect.left) / this.workspace.scale,
  y: (event.clientY - rect.top) / this.workspace.scale
};
const distanceFromMouse = Math.sqrt(
  Math.pow(clickWorkspacePos.x - this.lastTargetPosition.x, 2) +
  Math.pow(clickWorkspacePos.y - this.lastTargetPosition.y, 2)
);
```

#### 1.2. Remove all console.log statements
- Add a debug flag if needed: `private DEBUG = false;`
- Replace all `console.log` with conditional: `if (this.DEBUG) console.log(...)`
- Or remove entirely for production

#### 1.3. Extract sticky mode to separate class
```typescript
// NEW FILE: src/sticky_mode.ts
export class StickyModeController {
  constructor(
    private workspace: WorkspaceSvg,
    private mover: Mover,
    private navigationController: NavigationController
  ) {}

  enterStickyMode(block: BlockSvg, clientX: number, clientY: number): boolean {...}
  exitStickyMode(): void {...}
  handlePointerMove(clientX: number, clientY: number): void {...}
  handleClick(event: MouseEvent): void {...}
  // ... other sticky mode methods
}

// In index.ts:
private stickyModeController: StickyModeController;
```

---

### Phase 2: Improve Core Integration (Medium Priority)

#### 2.1. Reduce @ts-expect-error usage
**Strategy**: Add proper getters to classes you control

```typescript
// In keyboard_drag_strategy.ts:
export class KeyboardDragStrategy extends dragging.BlockDragStrategy {
  // EXPOSE what you need rather than reaching in
  public getConnectionCandidate(): ConnectionCandidate | null {
    // @ts-expect-error accessing private from parent
    return this.connectionCandidate;
  }

  public setConnectionCandidate(candidate: ConnectionCandidate | null): void {
    // @ts-expect-error accessing private from parent
    this.connectionCandidate = candidate;
  }
}
```

**For core Blockly access**: File issues/PRs to expose needed APIs

#### 2.2. Investigate using core's ConnectionPreviewer
**Current**: Custom `ConnectionHighlighter` (1100 lines)
**Goal**: Determine if core's connection preview system can be extended

**Action items**:
1. Review core's `IConnectionPreviewer` interface
2. Check if highlighting can be achieved by extending `InsertionMarkerManager`
3. If not, document WHY custom implementation is needed
4. Consider contributing improvements to core

#### 2.3. Fix ConnectionCandidate duplication
```typescript
// BEFORE:
interface ConnectionCandidate { local: ...; neighbour: ...; distance: ...; }

// AFTER:
import type {ConnectionCandidate} from 'blockly/core/dragging/block_drag_strategy';
// OR if not exported:
// File issue #XXXX to export ConnectionCandidate from core
```

---

### Phase 3: Improve Robustness (Medium Priority)

#### 3.1. Unify touch and mouse code paths
```typescript
// BEFORE: Separate handleTouchEnd and handleStickyModeClick

// AFTER: Single unified handler
private handlePointerEnd(clientX: number, clientY: number, pointerType: 'mouse' | 'touch'): void {
  // Shared logic
  if (!this.isInStickyMode) return;

  // Handle both mouse clicks and touch ends uniformly
  this.processClickOrTap(clientX, clientY);
}

private handleTouchEnd(event: TouchEvent): void {
  const touch = event.changedTouches[0];
  if (touch) {
    this.handlePointerEnd(touch.clientX, touch.clientY, 'touch');
  }
}

private handleStickyModeClick(event: MouseEvent): void {
  this.handlePointerEnd(event.clientX, event.clientY, 'mouse');
}
```

#### 3.2. Implement proper state machine
```typescript
enum StickyModeState {
  INACTIVE = 'INACTIVE',
  DRAGGING = 'DRAGGING',
  HOVERING_CONNECTION = 'HOVERING_CONNECTION',
  COMPLETING = 'COMPLETING',
  CLEANUP = 'CLEANUP'
}

class StickyModeController {
  private state: StickyModeState = StickyModeState.INACTIVE;

  private transition(newState: StickyModeState): void {
    // Validate transitions
    // Clean up old state
    // Initialize new state
    this.state = newState;
  }
}
```

#### 3.3. Remove emergency cleanup mechanisms
**Goal**: Fix root cause so these aren't needed
- Remove `window.clearAllConnectionHighlights`
- Remove 15-second auto-cleanup timeout
- **Add**: Proper cleanup in:
  - `exitStickyMode()`
  - `dispose()`
  - Error handlers
  - Window blur/visibility change events

#### 3.4. Add comprehensive error handling
```typescript
private enterStickyMode(...): boolean {
  // Validation BEFORE any state changes
  if (!this.validateBlockForSticky(block)) {
    return false;
  }

  try {
    // Make state changes atomic
    const stickyState = this.beginStickyTransaction(block, clientX, clientY);
    const moveStarted = mover.startMove(...);

    if (!moveStarted) {
      this.rollbackStickyTransaction(stickyState);
      return false;
    }

    this.commitStickyTransaction(stickyState);
    return true;
  } catch (error) {
    this.rollbackStickyTransaction();
    console.error('Failed to enter sticky mode:', error);
    return false;
  }
}
```

---

### Phase 4: Code Quality (Lower Priority)

#### 4.1. Document architecture decisions
Add `STICKY_MODE_ARCHITECTURE.md`:
```markdown
# Sticky Mode Architecture

## Why not use core's gesture system?
[Explain decision]

## Why separate ConnectionHighlighter?
Core's ConnectionPreviewer is designed for [X], but sticky mode needs [Y]
because [Z].

## Interaction with keyboard navigation
[Explain integration points]
```

#### 4.2. Add TypeScript strict checks
```typescript
// Enable in tsconfig.json:
"strictNullChecks": true,
"noImplicitAny": true,

// Fix resulting errors - will catch:
// - Unhandled null cases
// - Missing type annotations
// - Implicit any types
```

#### 4.3. Extract magic numbers to constants
```typescript
// NEW FILE: src/sticky_mode_constants.ts
export const STICKY_MODE_CONSTANTS = {
  /** Minimum distance (px) to consider tap/click as deliberate repositioning */
  DELIBERATE_TAP_THRESHOLD: 50,

  /** Throttle interval for pointer move events (ms) for ~60fps */
  POINTER_MOVE_THROTTLE: 16,

  /** Maximum time between taps to recognize as double-tap (ms) */
  DOUBLE_TAP_TIMEOUT: 300,

  /** Offset added to block position during connection preview (workspace units) */
  CONNECTION_PREVIEW_OFFSET: 10,

  /** Distance for unconstrained moves (workspace units) */
  UNCONSTRAINED_MOVE_DISTANCE: 20,
} as const;
```

#### 4.4. Add unit tests
```typescript
// test/sticky_mode_test.mocha.js
describe('StickyModeController', () => {
  describe('coordinate transformations', () => {
    it('converts screen to workspace coordinates correctly', () => {...});
    it('detects deliberate tap with correct coordinate system', () => {...});
  });

  describe('state transitions', () => {
    it('prevents invalid state transitions', () => {...});
    it('cleans up on error during entry', () => {...});
  });
});
```

---

### Phase 5: Performance Optimization

#### 5.1. Cache block lookups
```typescript
// BEFORE:
private getBlockFromEvent(event): BlockSvg | null {
  const blocks = this.workspace.getAllBlocks(); // Every event!
  // ...
}

// AFTER:
private getBlockFromElement(element: Element): BlockSvg | null {
  // Use Blockly's internal lookup if available, or:
  const blockId = element.getAttribute('data-id');
  if (blockId) {
    return this.workspace.getBlockById(blockId);
  }
  // Fallback to parent traversal only if needed
}
```

#### 5.2. Debounce connection candidate updates
```typescript
private scheduleConnectionUpdate = debounce(() => {
  this.updateConnectionCandidates();
}, 32); // Update at most every 2 frames

private handlePointerMove(clientX: number, clientY: number): void {
  // Update position immediately
  this.moveBlockToPosition(clientX, clientY);

  // Update connection candidates less frequently
  this.scheduleConnectionUpdate();
}
```

---

## Testing Checklist

Before considering improvements complete:

- [ ] All WebDriverIO tests pass
- [ ] Manual testing on:
  - [ ] Desktop (mouse)
  - [ ] Tablet (touch)
  - [ ] Different block types (value, statement, output)
  - [ ] Nested blocks
  - [ ] Shadow blocks
  - [ ] Connection to occupied connections (replacement)
  - [ ] Drag to trashcan
  - [ ] Escape during drag
  - [ ] Enter during drag
  - [ ] Window blur during drag
- [ ] No console errors
- [ ] No memory leaks (check highlight cleanup with dev tools)
- [ ] Performance: 60fps during drag on reference device
- [ ] No conflicts with keyboard navigation
- [ ] No conflicts with standard mouse drag

---

## Conclusion

The implementation shows good ambition and comprehensive test coverage, but needs refinement to match Blockly's quality standards and avoid maintenance issues. The biggest wins will come from:

1. **Fixing the coordinate bug** (critical for correct behavior)
2. **Cleaning up logging** (professionalism)
3. **Better integrating with core's existing systems** rather than reimplementing them

The click-and-stick feature is valuable for accessibility, and with these improvements, it will be a robust addition to the keyboard navigation plugin.