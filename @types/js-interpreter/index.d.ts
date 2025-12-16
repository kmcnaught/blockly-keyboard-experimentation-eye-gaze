/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TypeScript type declarations for js-interpreter
 * See https://github.com/NeilFraser/JS-Interpreter
 */

declare module 'js-interpreter' {
  export default class Interpreter {
    /**
     * Create a new JavaScript interpreter.
     * @param code JavaScript code to execute.
     * @param initFunc Optional initialization function that is called with
     *     (interpreter, globalObject) to initialize the interpreter's scope.
     */
    constructor(
      code: string,
      initFunc?: (interpreter: Interpreter, globalObject: any) => void
    );

    /**
     * Execute one step of the interpreter.
     * @returns True if there are more steps to execute, false if complete.
     */
    step(): boolean;

    /**
     * Execute the interpreter to completion, subject to `step` limits.
     * @returns True if the program completed successfully, false if it timed out.
     */
    run(): boolean;

    /**
     * Create a native function wrapper for use in the interpreter.
     * @param fn The native function to wrap.
     * @param isConstructor Optional flag indicating if this is a constructor.
     * @returns A pseudo-function that can be used in the interpreter.
     */
    createNativeFunction(fn: Function, isConstructor?: boolean): any;

    /**
     * Set a property on an object in the interpreter's scope.
     * @param object The object to set the property on.
     * @param name The name of the property.
     * @param value The value to set.
     */
    setProperty(object: any, name: string, value: any): void;

    /**
     * Get a property from an object in the interpreter's scope.
     * @param object The object to get the property from.
     * @param name The name of the property.
     * @returns The value of the property.
     */
    getProperty(object: any, name: string): any;
  }
}
