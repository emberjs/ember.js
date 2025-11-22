# Fix for Private Properties in Template Region (#21007)

## Summary

This fix enables access to private class properties (fields and methods) from within the `<template>` region of Glimmer components.

## Problem

Previously, when trying to use private properties in templates like this:

```javascript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export default class HelloWorld extends Component {
  @tracked count = 0;

  #increment = () => this.count += 1;

  <template>
    <p>You have clicked the button {{this.count}} times.</p>
    <button type="button" {{on "click" this.#increment}}>Click</button>
  </template>
}
```

The compiler would:
1. Replace `this.#increment` with `undefined` silently
2. When used with modifiers, cause runtime errors: `can't access property "bind", userProvidedCallback is undefined`
3. When used in interpolation (`{{this.#foo}}`), render `undefined` without any warning

## Root Cause

The issue was in `/packages/@ember/template-compiler/lib/compile-options.ts` in the `inScope()` function:

1. The regex `IDENT` checked if a variable name was a valid JavaScript identifier
2. Private fields (starting with `#`) are not considered regular identifiers by this regex
3. The function tried to evaluate `typeof #fieldName`, which is invalid JavaScript syntax for private fields
4. This caused the compiler to treat private fields as "not in scope" and replace them with `undefined`

## Solution

The fix adds support for private field identifiers in the template compiler:

### 1. Added Private Identifier Regex

```typescript
// https://tc39.es/ecma262/#prod-PrivateIdentifier
const PRIVATE_IDENT = /^#[\p{ID_Start}$_][\p{ID_Continue}$_\u200C\u200D]*$/u;
```

### 2. Updated `inScope()` Function

```typescript
function inScope(variable: string, evaluator: Evaluator): boolean {
  // Check if it's a private field syntax
  if (PRIVATE_IDENT.exec(variable)) {
    // Private fields are always considered "in scope" when referenced in a template
    // since they are class members, not lexical variables. The actual access check
    // will happen at runtime when the template accesses `this.#fieldName`.
    return true;
  }
  
  // ... rest of the function
}
```

### 3. Updated Documentation

Updated the documentation in `/packages/@ember/template-compiler/lib/template.ts` to:
- Indicate that private fields are now supported
- Provide examples of using private fields in templates
- Clarify that the `eval` option can handle private field identifiers

## Changes Made

### Files Modified:

1. **`/packages/@ember/template-compiler/lib/compile-options.ts`**
   - Added `PRIVATE_IDENT` regex constant
   - Modified `inScope()` function to recognize and handle private fields
   - Private fields are now treated as always in scope (as they're class members)

2. **`/packages/@ember/template-compiler/lib/template.ts`**
   - Updated documentation for `ImplicitClassOptions` to show private field support
   - Added example code demonstrating private field usage
   - Updated technical requirements section to mention private field identifiers

3. **`/packages/@ember/-internals/glimmer/tests/integration/components/runtime-template-compiler-implicit-test.ts`**
   - Added test: `@test Can access private fields in templates`
   - Added test: `@test Private field methods work with on modifier`

## How It Works

Private fields in JavaScript are class members, not lexical variables. When the template compiler encounters a private field reference like `this.#increment`:

1. The compiler recognizes it as a private field using the `PRIVATE_IDENT` regex
2. It treats the field as "in scope" (returns `true` from `inScope()`)
3. The field reference is passed through to the compiled template
4. At runtime, the template accesses the private field on the component instance
5. Normal JavaScript private field access rules apply (TypeError if accessed from wrong context)

## Testing

Added two new test cases to verify:
1. Private fields can be accessed in template interpolations
2. Private methods work correctly with modifiers like `{{on}}`

## Impact

This fix:
- ✅ Enables use of private fields in templates (resolves #21007)
- ✅ Maintains backward compatibility (no breaking changes)
- ✅ Follows JavaScript private field semantics
- ✅ Works with both the implicit `eval()` form and explicit `scope()` form
- ✅ Provides better encapsulation for component internals

## Example Usage

### Private Field
```javascript
class MyComponent extends Component {
  #message = "Hello";
  
  <template>
    <p>{{this.#message}}</p>
  </template>
}
```

### Private Method with Modifier
```javascript
class MyComponent extends Component {
  @tracked count = 0;
  
  #increment = () => this.count++;
  
  <template>
    <button {{on "click" this.#increment}}>
      Count: {{this.count}}
    </button>
  </template>
}
```

### Private Tracked Field
```javascript
class MyComponent extends Component {
  @tracked #internalState = false;
  
  #toggle = () => {
    this.#internalState = !this.#internalState;
  };
  
  <template>
    <button {{on "click" this.#toggle}}>
      {{if this.#internalState "ON" "OFF"}}
    </button>
  </template>
}
```

## Future Considerations

- The Handlebars/Glimmer parser already supports the `#` character in paths
- Runtime access control is handled by JavaScript's built-in private field mechanism
- No additional runtime overhead is introduced
- The fix is forward-compatible with future ECMAScript changes to private fields
