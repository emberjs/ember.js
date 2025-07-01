# Build Constraints and Transformations

This document explains the comprehensive build constraints, transformations, and code management strategies in Glimmer VM. It serves as a reference for understanding how code is transformed from development to production and as a starting point for further analysis of the build system.

## Overview

Glimmer VM uses several categories of code that have different constraints on where they can appear:

1. **Production Code** - Ships to end users in production builds
2. **Development Code** - Available in development builds for end users  
3. **Local Development Code** - Only for Glimmer VM developers, never ships
4. **Build-Time Code** - Used during compilation but not at runtime

## Code Categories and Constraints

### 1. import.meta.env

**What it is**: A de facto standard created by Vite for build-time environment variables.

**Usage in Glimmer VM**:
- `import.meta.env.DEV` - `true` in development builds, `false` in production
- `import.meta.env.PROD` - `true` in production builds, `false` in development
- `import.meta.env.VM_LOCAL_DEV` - `false` in published builds, `true` in Vite dev server

**Constraint**: These references are replaced at build time with actual values. The string `import.meta.env` never appears in published builds.

### 2. VM_LOCAL Flag

**What it is**: A build-time flag for code that should only run during local Glimmer VM development.

**Purpose**: Enables expensive debugging features when working on the VM itself. These features never reach published packages (not even development builds).

**Example Usage**:
```typescript
if (VM_LOCAL) {
  // Expensive validation that helps VM developers
  validateOpcodeSequence(opcodes);
}
```

**Constraint**: Code blocks guarded by `VM_LOCAL` are completely removed from all published builds. The condition and its contents are stripped out.

### 3. Debug Assertion Functions

**What they are**: Runtime type checking and validation functions from `@glimmer/debug`:

- `check(value, checker)` - Validates a value against a type checker
- `expect(value, message)` - Asserts a condition is truthy
- `localAssert(condition, message)` - Development-only assertion
- `unwrap(value)` - Unwraps optional values, throwing if null/undefined

**Purpose**: Catch bugs during Glimmer VM development by validating assumptions about types and state.

**Example Usage**:
```typescript
import { check } from '@glimmer/debug';
import { CheckReference } from './-debug-strip';

let definition = check(stack.pop(), CheckReference);
let capturedArgs = check(stack.pop(), CheckCapturedArguments);
```

**Constraint**: These function calls are stripped from ALL published builds (both development and production) using a Babel plugin during the build process.

### 4. Type Checker Functions

**What they are**: Functions that create runtime type validators:

- `CheckInterface` - Validates object shape
- `CheckOr` - Union type validation
- `CheckFunction` - Function type validation  
- `CheckObject` - Object/WeakMap key validation

**Purpose**: Define the type constraints used by `check()` calls.

**Example Usage**:
```typescript
export const CheckReference: Checker<Reference> = CheckInterface({
  [REFERENCE]: CheckFunction,
});

export const CheckArguments = CheckOr(CheckObject, CheckFunction);
```

**Constraint**: These should never appear in published builds as they're only used by the stripped `check()` calls.

### 5. Debug-Only Packages

Three private packages contain development-only utilities:

- **@glimmer/debug** - Type checkers, validation utilities, debugging tools
- **@glimmer/constants** - VM opcodes, DOM constants (inlined during build)
- **@glimmer/debug-util** - Debug assertions, platform-specific logging

**Constraint**: These packages are never published to npm. Import statements for them should never appear in published builds - their contents are either inlined or stripped during compilation.

## Build Process and Transformations

### Debug Code Stripping

The build process uses a Babel plugin (`@glimmer/local-debug-babel-plugin`) that:

1. Identifies imports from `@glimmer/debug`
2. Tracks which debug functions are imported
3. Strips or transforms the function calls:
   - `check(value, checker)` → `value`
   - `expect(...)` → removed entirely
   - `CheckInterface(...)` → `() => true`
   - `recordStackSize()` → removed entirely

### Environment Variable Replacements

The Rollup replace plugin performs these build-time replacements:

**Production builds:**
- `import.meta.env.MODE` → `"production"`
- `import.meta.env.DEV` → `false`
- `import.meta.env.PROD` → `true`
- `import.meta.env.VM_LOCAL_DEV` → `false`

**Development builds:**
- `import.meta.env.MODE` → `"development"`
- `import.meta.env.DEV` → `DEBUG` (with `import { DEBUG } from '@glimmer/env'` injected)
- `import.meta.env.PROD` → `!DEBUG`
- `import.meta.env.VM_LOCAL_DEV` → `false` (becomes `true` only in Vite dev server)

### Module Resolution and Bundling

The build system has specific rules for what gets inlined vs treated as external:

**Always Inlined:**
- `@glimmer/local-debug-flags`
- `@glimmer/constants`
- `@glimmer/debug`
- `@glimmer/debug-util`
- Relative imports (`.`, `/`, `#`)
- TypeScript helper library (`tslib`)

**Always External:**
- `@handlebars/parser`
- `simple-html-tokenizer`
- `babel-plugin-debug-macros`
- Other `@glimmer/*` packages (to avoid duplication)
- `@simple-dom/*` packages
- `@babel/*` packages
- Node.js built-ins (`node:*`)

### Build Output Structure

Every package produces multiple build artifacts:

1. **Development Build** (`dist/dev/`)
   - Readable, formatted code
   - Preserves comments
   - No variable name mangling
   - Includes source maps

2. **Production Build** (`dist/prod/`)
   - Minified with Terser (3 passes)
   - Aggressive optimizations
   - Preserves `debugger` statements (for `{{debugger}}` helper)
   - Includes source maps

3. **Type Definitions** (`dist/{dev,prod}/*.d.ts`)
   - Generated from TypeScript source
   - Rolled up into single files per entry point

4. **CommonJS Build** (optional, `*.cjs`)
   - Only generated if package.json includes CommonJS exports
   - Follows same dev/prod split

## TypeScript Configuration and Strictness

Glimmer VM uses a multi-tiered TypeScript configuration system:

### Configuration Files
- `tsconfig.base.json` - Shared base configuration
- `tsconfig.json` - Development configuration (looser for better DX)
- `tsconfig.dist.json` - Distribution configuration (stricter for published code)

### Per-Package Strictness Levels

Packages can declare their strictness level in `package.json`:
```json
{
  "repo-meta": {
    "strictness": "strict" | "loose"
  }
}
```

This affects which TypeScript compiler options are applied during type checking.

### Key Compiler Constraints
- **Target**: ES2022
- **Module Resolution**: "bundler" mode
- **Isolated Modules**: Required for build performance
- **Exact Optional Properties**: Enforced in distribution builds
- **No Unchecked Indexed Access**: Enforced in distribution builds

## Build Orchestration

### Turbo Pipeline

The build system uses Turbo for orchestration with these key relationships:
- `prepack` must complete before any builds
- Type checking runs in parallel with builds
- Cache keys include TypeScript configs, source files, and lock files

### Build Commands
- `pnpm repo:prepack` - Build all packages via Turbo (recommended)
- `pnpm repo:lint:types` - Type check all packages
- `pnpm clean` - Clean build artifacts

### Package Publishing

**Published Package Structure**:
- Only `dist/` directory is included in npm packages
- Conditional exports for dev/prod builds
- `publint` validates package structure before publishing

**Export Configuration**:
```json
{
  "exports": {
    ".": {
      "development": "./dist/dev/index.js",
      "default": "./dist/prod/index.js"
    }
  }
}
```

Note: Private packages (`@glimmer/debug`, `@glimmer/constants`, `@glimmer/debug-util`, and all `@glimmer-workspace/*`) are never published to npm.

## Continuous Integration Constraints

### Bundle Size Monitoring
- Automated size tracking via GitHub Actions
- Compares dev/prod sizes against main branch
- Reports size changes in PR comments
- Uses `dust` utility for accurate measurements

### Test Environment Constraints
- **Browser Tests**: Puppeteer with specific Chrome flags
- **Smoke Tests**: 300s timeout (vs 30s for regular tests)
- **BrowserStack**: Cross-browser testing for releases
- **Floating Dependencies**: Special CI job tests against latest deps

### Validation Steps
1. Type checking (`tsc`)
2. Linting (`eslint`)
3. Unit tests (QUnit/Vitest)
4. Smoke tests
5. Bundle size analysis
6. Package structure validation (`publint`)

## Development Environment

### Vite Development Server
- Transforms `import.meta.env.VM_LOCAL_DEV` → `true` for local development
- Pre-bundles test dependencies for performance
- Custom extension resolution order

### ESLint Configuration
- Environment-aware rules (console vs non-console packages)
- Strictness based on package metadata
- Test-specific rules for QUnit
- Custom rules for Glimmer-specific patterns

### Automated Code Fixes
Tools in `bin/fixes/`:
- `apply-eslint-suggestions.js` - Apply ESLint auto-fixes
- `apply-ts-codefixes.js` - Apply TypeScript code fixes
- `apply-suggestions.js` - Apply both types of fixes

## Guidelines for Developers

1. **Use debug assertions liberally** - They help catch bugs and document assumptions
2. **Don't wrap debug code in conditions** - The build process handles removal
3. **Import from the right place** - Use `@glimmer/debug` imports in VM code
4. **Trust the build process** - Write clear development code; the build makes it production-ready
5. **Respect package boundaries** - Don't import from private packages in public ones
6. **Follow strictness levels** - Adhere to the TypeScript strictness of your package

## Summary

The Glimmer VM build system enables developers to write defensive, well-instrumented code during development while shipping minimal, performant code to production. Through multiple layers of transformations, validations, and constraints, it ensures debug code never reaches users while maintaining a fast and helpful development experience.