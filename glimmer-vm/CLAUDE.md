# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Building

- `pnpm build` - Build all packages via Turbo (recommended)
- `pnpm clean` - Clean build artifacts

### Testing

- `pnpm test` - Run all tests
- `pnpm dev` - Start Vite dev server for browser testing
- `pnpm test:node` - Run Node.js tests via Turbo

To run a single test or test module, use the browser test interface with `pnpm dev` and filter tests using the QUnit UI.

### Linting & Type Checking

- `pnpm lint` - Run ESLint quietly
- `pnpm lint:fix` - Auto-fix linting issues and format with Prettier (required before commits)
- `pnpm lint:check` - Check Prettier formatting
- `pnpm lint:types` - Type check all packages via Turbo
- `pnpm lint:all` - Run all linting checks
- `pnpm lint:published` - Lint published packages

### CI Preparation

These commands MUST be run before pushing to ensure CI passes:

- `pnpm lint:fix` - Fix formatting and linting
- `pnpm repo:update:conventions` - Update package conventions
- `pnpm repo:update:metadata` - Update package metadata

The CI "Verify" job will fail if these commands produce uncommitted changes.

## Architecture

Glimmer VM is a **compiler-based rendering engine** that compiles Handlebars templates into bytecode for efficient execution and updates.

### Core Flow

1. **Templates** (Handlebars) → **Compiler** → **Bytecode** (Wire Format)
2. **Bytecode** → **Runtime VM** → **DOM Operations**
3. **State Changes** → **Validator System** → **Targeted Updates**

### Key Packages

**Compilation Pipeline**:

- `@glimmer/syntax` - Template parser and AST (uses visitor pattern for traversal)
- `@glimmer/compiler` - Compiles templates to bytecode
- `@glimmer/wire-format` - Bytecode format definitions
- `@glimmer/opcode-compiler` - Bytecode generation

**Runtime Engine**:

- `@glimmer/runtime` - VM that executes bytecode
- `@glimmer/vm` - Core VM implementation
- `@glimmer/reference` - Reactive reference system for state tracking
- `@glimmer/validator` - Change detection and invalidation

**Extension Points**:

- `@glimmer/manager` - Component/helper/modifier manager APIs
- `@glimmer/interfaces` - TypeScript interfaces and contracts

### Monorepo Structure

- Uses pnpm workspaces with Turbo for orchestration
- Packages in `packages/@glimmer/*` are published to npm
- Packages in `packages/@glimmer-workspace/*` are internal tools
- Each package has its own tsconfig with varying strictness levels
- Node version requirement: >= 22.12.0

### TypeScript Patterns

- "Friend" properties use bracket notation: `object['_privateProperty']`
- This allows cross-package internal access while maintaining type safety
- Different packages have different strictness levels in their tsconfig

### Testing Strategy

- Integration tests in `@glimmer-workspace/integration-tests`
- Unit tests colocated with packages
- Browser tests use QUnit + Vite
- Node tests use Vitest
- Smoke tests verify package compatibility

### Debug Infrastructure

The codebase includes sophisticated debug tooling:

- `check()` function for runtime type checking (stripped in production by babel plugin)
- `@glimmer/debug` package for development-time debugging
- Stack checking and validation in development builds

## Common Development Tasks

### Running a specific test file

```bash
# For Node tests (Vitest)
cd packages/@glimmer/[package-name]
pnpm test:node -- path/to/test.ts

# For browser tests
pnpm dev
# Then navigate to the browser and use the QUnit filter
```

### After making AST changes

If you modify the AST structure in `@glimmer/syntax`:

1. Run smoke tests: `cd smoke-tests/node && pnpm test:node`
2. Update snapshots if needed: `pnpm vitest run -u`
3. Document why changes are not breaking (visitor pattern protection)

### Before pushing changes

Always run these commands to avoid CI failures:

```bash
pnpm lint:fix
pnpm repo:update:conventions
pnpm repo:update:metadata
git add -A && git commit
```

## Contribution Guidelines

### Commit Messages

- Write clear, concise commit messages that explain the change
- Do not include Claude attribution or automated generation notices
- Focus on the "why" and "what" of the change, not implementation details

### Git Workflow

- Squashing commits is often preferred for complex PRs
- When rebasing, be prepared to resolve conflicts in package.json, eslint.config.js, and build configs
- The babel debug plugin pattern requires `check()` calls to be inline (not inside if blocks) for proper type narrowing

## Turbo Configuration

### Script Naming Conventions

- Use `turbo <task>` directly (without `run`) for consistency
- Common aliases added for better DX:
  - `pnpm build` → builds all packages
  - `pnpm dev` → starts development server

### Performance Optimizations

- Caching enabled for deterministic tasks (lint, test:node, prepack)
- Proper input/output declarations for better cache hits
- Environment variables tracked: NODE_ENV, CI
- TUI enabled for better progress visualization

### Task Dependencies

- `prepack` depends on upstream packages (`^prepack`)
- `test:publint` depends on `prepack` to validate built packages
- Type checking depends on all packages being built first
