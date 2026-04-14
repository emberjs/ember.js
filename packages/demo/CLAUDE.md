# GXT (Glimmer-Next) Integration for Ember.js

This document describes the GXT integration layer that allows Ember.js to use the GXT rendering engine instead of the traditional Glimmer VM.

## Overview

GXT (glimmer-next) is a lightweight alternative rendering engine for Glimmer templates. This integration layer provides compatibility shims that allow Ember.js applications and tests to run using GXT for template rendering.

## Running Tests

### Quick Start

```bash
# Run demo tests with GXT
cd packages/demo
GXT_MODE=true pnpm vite --port 5173

# Open http://localhost:5173/tests.html in browser
```

### Running Full Ember Test Suite

```bash
# From repo root
GXT_MODE=true pnpm vite --port 5173

# Open http://localhost:5173/tests.html
# Or use playwright for headless testing:
node run-qunit-tests.mjs
```

### Build for Production

```bash
cd packages/demo
GXT_MODE=true pnpm vite build
```

## Directory Structure

```
packages/demo/
├── compat/                 # GXT compatibility layer
│   ├── manager.ts          # Core component/helper/modifier managers
│   ├── compile.ts          # GXT runtime template compiler
│   ├── ember-template-compiler.ts  # Ember template compiler shim
│   ├── validator.ts        # Glimmer validator compatibility
│   ├── destroyable.ts      # Destroyable API compatibility
│   └── ...                 # Other compatibility modules
├── src/
│   ├── components/         # Demo application components
│   ├── tests/              # GXT integration tests
│   └── ...                 # Demo application code
├── index.html              # Demo application entry
└── tests.html              # Test runner entry
```

## Compatibility Layer Files

### Core Files

| File | Purpose |
|------|---------|
| `manager.ts` | Implements `$_MANAGERS` for GXT component/helper/modifier handling. This is the heart of the integration - it resolves Ember components from the registry and renders them using GXT. |
| `compile.ts` | GXT runtime template compiler using `@lifeart/gxt/runtime-compiler`. Transforms HBS templates into GXT `$_c`/`$_tag` calls. |
| `ember-template-compiler.ts` | Shim for `ember-template-compiler`. Delegates to `compile.ts` for actual compilation. |
| `gxt-template-compiler-plugin.mjs` | Vite plugin for build-time template compilation. Transforms `.gts`/`.gjs` files and HBS templates. |

### Glimmer API Shims

| File | Purpose |
|------|---------|
| `validator.ts` | Implements `@glimmer/validator` API (tracking, caching, tags). |
| `destroyable.ts` | Implements `@glimmer/destroyable` API (registerDestructor, destroy). |
| `reference.ts` | Implements `@glimmer/reference` API (references, values). |
| `helper-manager.ts` | Custom helper manager implementation. |

### Runtime Support

| File | Purpose |
|------|---------|
| `runtime-hbs.ts` | Runtime HBS template support using `hbs` tagged template literal. |
| `gxt-with-runtime-hbs.ts` | Wrapper around `@lifeart/gxt` that adds runtime HBS support. |
| `outlet.gts` | Custom `<ember-outlet>` element for routing support. |
| `link-to.gts` | GXT-compatible `<LinkTo>` component. |

### Utility Files

| File | Purpose |
|------|---------|
| `debug.ts` | Debug logging utilities (enable with `globalThis.GXT_DEBUG = true`). |
| `deprecate.ts` | Deprecation warning stubs. |
| `glimmer-application.ts` | Minimal `@glimmer/application` shim. |
| `glimmer-syntax.ts` | Minimal `@glimmer/syntax` shim. |
| `glimmer-util.ts` | Minimal `@glimmer/util` shim. |
| `ember-routing.ts` | Routing compatibility exports. |
| `test-compile.ts` | Test helper compile shim. |

## How It Works

### Module Aliasing

When `GXT_MODE=true`, Vite aliases Glimmer packages to the compat layer:

```javascript
// vite.config.mjs aliases (when GXT_MODE=true):
'@glimmer/manager'     → 'packages/demo/compat/manager.ts'
'@glimmer/validator'   → 'packages/demo/compat/validator.ts'
'@glimmer/destroyable' → 'packages/demo/compat/destroyable.ts'
'ember-template-compiler' → 'packages/demo/compat/ember-template-compiler.ts'
'@lifeart/gxt'         → 'packages/demo/compat/gxt-with-runtime-hbs.ts'
// ... and more
```

### Template Compilation Flow

1. **Build Time** (`gxt-template-compiler-plugin.mjs`):
   - Transforms `.gts`/`.gjs` files using GXT compiler
   - Converts component invocations to string-based lookups
   - Wraps templates as factory functions

2. **Runtime** (`compile.ts` / `ember-template-compiler.ts`):
   - Compiles HBS strings using `@lifeart/gxt/runtime-compiler`
   - Returns template factories compatible with Ember's expectations

### Component Resolution Flow

1. Template contains `<MyComponent />` or `{{my-component}}`
2. GXT calls `$_MANAGERS.component.handle('my-component', args, ...)`
3. `manager.ts` resolves component from Ember's registry via `owner.factoryFor()`
4. Component instance is created and template is rendered
5. DOM nodes are returned to GXT for insertion

## Current Test Status

- **Demo tests**: 81 passing, 34 failing
- **Double-init errors**: Fixed (was causing "already registered" errors)
- **Build**: Working (`GXT_MODE=true vite build`)

### Known Limitations

The 34 failing tests are due to GXT compiler limitations with:
- Block params (`as |value|`)
- Yield values
- Some edge cases in component invocation

These are GXT compiler issues, not integration layer issues.

## Debugging

### Enable Debug Logging

```javascript
// In browser console or test setup:
globalThis.GXT_DEBUG = true;

// Filter to specific categories:
globalThis.GXT_DEBUG_CATEGORIES = ['manager', 'compile', 'template'];
```

### Debug Categories

- `manager` - Component/helper/modifier resolution
- `compile` - Template compilation
- `template` - Template rendering
- `factory` - Factory creation
- `context` - Context/scope handling

### Common Issues

1. **"Component not found"**: Check that the component is registered in the owner's registry.

2. **"Cannot use string as WeakMap key"**: The component manager should handle this - if you see it, there's a bug in `canHandle()`.

3. **"Template has no render method"**: The template wasn't properly compiled. Check that the GXT compiler plugin is running.

## Architecture Decisions

### Why String-Based Component Names?

GXT uses WeakMaps internally for context tracking. Strings can't be WeakMap keys, so we intercept all string component names in `$_MANAGERS.component.canHandle()` and resolve them to actual components in `handle()`.

### Why Custom Elements for Outlet?

GXT treats `{{outlet}}` like `{{yield}}`. We transform it to `<ember-outlet>` which is a custom element that reads from `globalThis.__currentOutletState` and renders the appropriate route template.

### Why Delegate to GXT Runtime Compiler?

The original `ember-template-compiler.ts` had a simple parser that treated all elements as HTML. This caused components to be rendered as `<my-component>` HTML elements instead of invoking the component manager. Delegating to the GXT runtime compiler ensures proper `$_c()` calls for component invocation.

## Contributing

When modifying the compat layer:

1. Run tests: `GXT_MODE=true pnpm vite` then open `/tests.html`
2. Check for regressions in passing tests
3. Keep the compat layer minimal - only shim what's necessary
4. Document any new limitations or workarounds

## Related Documentation

See also:
- `/GXT_COMPATIBILITY_PLAN.md` - Full compatibility plan with test running instructions and progress tracking
- `/GXT_MIGRATION_PLAN.md` - Original migration planning document
