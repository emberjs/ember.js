// Allow the contents of `debugCallback` without extra annotations
/* eslint-disable @typescript-eslint/no-unused-expressions */

// The `{{debugger}}` callback, apart from the VM opcode that calls it
// (compiled/opcodes/debugger.ts), so a renderer without the VM (the GXT
// backend) calls the same callback without importing the opcode registry.

export type DebugGet = (path: string) => unknown;

export type DebugCallback = (context: unknown, get: DebugGet) => void;

function debugCallback(context: unknown, get: DebugGet): void {
  if (context !== null && context !== undefined) {
    // eslint-disable-next-line no-console
    console.info(
      "Use `context`, and `get(<path>)` to debug this template. For named arguments, use `get('@argName')`."
    );

    // for example...
    context === get('this');
  } else {
    // eslint-disable-next-line no-console
    console.info(
      "Use `get(<path>)` to debug this template. For named arguments, use `get('@argName')`."
    );
  }

  // eslint-disable-next-line no-debugger
  debugger;
}

let callback = debugCallback;

// For testing purposes
export function setDebuggerCallback(cb: DebugCallback) {
  callback = cb;
}

export function resetDebuggerCallback() {
  callback = debugCallback;
}

/** The current `{{debugger}}` callback. */
export function getDebuggerCallback(): DebugCallback {
  return callback;
}
