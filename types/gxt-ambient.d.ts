// Build-time constants for the GXT rendering backend.

// `__GXT_MODE__` is replaced with a boolean literal by the vite and rollup
// builds (`scripts/replace-build-constant.mjs`), so the identifier never survives into a
// bundle. Read it as the bare identifier (not `globalThis.__GXT_MODE__`) so the
// substitution const-folds and dead-code elimination drops the unused branch.
declare const __GXT_MODE__: boolean;

// Toggles the classic `@ember/component` emulation in the compat
// gxt-backend `manager.ts`. TRUE by default; GXT_NATIVE=1 or
// EMBER_GXT_CLASSIC=0 sets it FALSE so the classic component subtree is
// dropped from the bundle. Replaced with a literal the same way as
// `__GXT_MODE__`.
declare const __GXT_CLASSIC_COMPONENTS__: boolean;
