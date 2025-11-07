# Input Connection Simplification - Work In Progress

## Overview

This document describes a proposed simplification to the `getCompatibleConnection` method in `navigation.ts`. The changes remove explicit connection validation checks, relying instead on Blockly's internal connection system to handle compatibility.

## Current Status

**WIP - Reverted for now** - Needs thorough testing before merging.

## Motivation

The original code performed extensive validation using `connectionChecker.canConnect()` for every potential connection. This added complexity and may have been redundant if Blockly's connection system already handles these checks during the actual connection operation.

## Changes Made

### 1. Input Connection Logic (Lines 414-430)

**Before:**
- Iterated through ALL compatible input connections
- Used `connectionChecker.canConnect()` to validate each connection
- Returned the first connection that passed validation
- Checked distance constraints (with `Infinity` parameter)

**After:**
- Takes the FIRST compatible input connection
- No explicit validation
- Returns it directly

### 2. Next Connection Logic (Lines 432-437)

**Before:**
- Walked through the chain of next connections
- Validated each connection with `connectionChecker.canConnect()`
- Skipped connections that were ineligible (e.g., in immovable stacks)
- Returned the first valid connection

**After:**
- Returns `stationaryNode.nextConnection` directly
- No validation or chain walking

## Rationale

The simplification assumes that:
1. Blockly's connection system will handle compatibility checks when the connection is actually made
2. The validation was redundant defensive programming
3. Simpler code is easier to maintain if the safety checks aren't necessary

## Concerns & Testing Needed

Before merging, we need to verify:

1. **Immovable blocks**: Does removing the `canConnect` check allow connections to blocks that shouldn't be moved?
2. **Type compatibility**: Are there edge cases where the first input isn't the right one?
3. **Connection failures**: Do connections fail silently if they're invalid, or do they throw errors?
4. **User experience**: Does this change affect how blocks connect during keyboard navigation?

## Test Cases to Verify

- [ ] Connect blocks to immovable stacks
- [ ] Connect blocks with multiple compatible inputs (which input gets used?)
- [ ] Connect statement blocks to various next connections
- [ ] Connect output blocks to value inputs
- [ ] Try connections that should be rejected (type mismatches, etc.)
- [ ] Verify behavior with custom connection checkers

## The Patch

```diff
diff --git a/src/navigation.ts b/src/navigation.ts
index b4fa4d3..ed81790 100644
--- a/src/navigation.ts
+++ b/src/navigation.ts
@@ -414,59 +414,24 @@ export class Navigation {
       const inputType = movingHasOutput
         ? Blockly.inputs.inputTypes.VALUE
         : Blockly.inputs.inputTypes.STATEMENT;
-      const compatibleConnections = stationaryNode.inputList
-        .filter((input) => input.type === inputType)
-        .map((input) => input.connection);
-      for (const connection of compatibleConnections) {
-        let targetConnection: Blockly.Connection | null | undefined =
-          connection;
+      const compatibleInputs = stationaryNode.inputList.filter(
+        (input) => input.type === inputType,
+      );
+      const input = compatibleInputs.length > 0 ? compatibleInputs[0] : null;
+      let connection = input?.connection;
+      if (connection) {
         if (inputType === Blockly.inputs.inputTypes.STATEMENT) {
-          while (targetConnection?.targetBlock()?.nextConnection) {
-            targetConnection = targetConnection?.targetBlock()?.nextConnection;
+          while (connection.targetBlock()?.nextConnection) {
+            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
+            connection = connection.targetBlock()!.nextConnection!;
           }
         }
-
-        if (
-          targetConnection &&
-          movingBlock.workspace.connectionChecker.canConnect(
-            movingHasOutput
-              ? movingBlock.outputConnection
-              : movingBlock.previousConnection,
-            targetConnection,
-            true,
-            // Since we're connecting programmatically, we don't care how
-            // close the blocks are when determining if they can be connected.
-            Infinity,
-          )
-        ) {
-          return targetConnection as Blockly.RenderedConnection;
-        }
+        return connection as Blockly.RenderedConnection;
       }

-      // 2. Connect statement blocks to next connection. Only return a next
-      // connection to which the statement block can actually connect; some
-      // may be ineligible because they are e.g. in the middle of an immovable
-      // stack.
+      // 2. Connect statement blocks to next connection.
       if (stationaryNode.nextConnection && !movingHasOutput) {
-        let nextConnection: Blockly.RenderedConnection | null =
-          stationaryNode.nextConnection;
-        while (nextConnection) {
-          if (
-            movingBlock.workspace.connectionChecker.canConnect(
-              movingBlock.previousConnection,
-              nextConnection,
-              true,
-              // Since we're connecting programmatically, we don't care how
-              // close the blocks are when determining if they can be connected.
-              Infinity,
-            )
-          ) {
-            return nextConnection;
-          }
-          nextConnection =
-            nextConnection.getSourceBlock().getNextBlock()?.nextConnection ??
-            null;
-        }
+        return stationaryNode.nextConnection;
       }

       // 3. Output connection. This will wrap around or displace.
```

## Next Steps

1. Revert the changes for now
2. Create comprehensive tests for connection scenarios
3. Run tests with both implementations
4. If tests pass with simplified version, consider merging
5. Document any behavioral changes discovered during testing

## Related Files

- `src/navigation.ts` - Contains the `getCompatibleConnection` method
- `test/webdriverio/test/move_test.ts` - Tests block movement and connections
- `test/webdriverio/test/insert_test.ts` - Tests block insertion behavior
