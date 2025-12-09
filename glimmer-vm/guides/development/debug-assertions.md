# Debug Assertions in Glimmer VM

## Overview

Glimmer VM uses debug assertion functions to validate assumptions and catch errors during development. These functions are essential for maintaining code quality but must never appear in published packages.

## Debug Functions

The following functions from `@glimmer/debug` are for local development only:

- `check(value, checker)` - Validates a value against a type checker (e.g., `CheckReference`, `CheckString`)
- `expect(value, message)` - Throws with message if value is falsy
- `localAssert(condition, message)` - Throws with message if condition is false
- `unwrap(value)` - Returns value if truthy, throws if null/undefined
- `recordStackSize()` - Records stack size for debugging (completely removed in builds)

## Usage Example

```typescript
import { check } from '@glimmer/debug';
import { CheckReference, CheckCapturedArguments } from './-debug-strip';

// In your VM opcode implementation:
let definition = check(stack.pop(), CheckReference);
let capturedArgs = check(stack.pop(), CheckCapturedArguments);

// Type checkers validate specific shapes:
// CheckReference - validates the value is a Glimmer Reference
// CheckCapturedArguments - validates captured arguments structure
```

## Build Process

These debug calls are automatically stripped from all builds using a Babel plugin. The transformation works as follows:

### Source Code (what you write):
```typescript
let value = check(stack.pop(), CheckReference);
```

### Published Build (what gets shipped):
```typescript
let value = stack.pop();
```

## Important Notes

1. **Write debug assertions freely** - They help catch bugs during development
2. **Don't wrap in conditions** - The build process handles removal automatically
3. **Never in published code** - Debug stripping ensures this
4. **For VM developers only** - These are not part of the public API

## How It Works

The build system automatically removes all debug assertions:

1. The Babel plugin (`@glimmer/local-debug-babel-plugin`) runs during build
2. It identifies all imports from `@glimmer/debug`
3. It strips or transforms the function calls appropriately
4. Both development and production builds have debug code removed

This ensures that while developers can use these assertions freely during development, end users never pay the cost of these checks in any published builds.