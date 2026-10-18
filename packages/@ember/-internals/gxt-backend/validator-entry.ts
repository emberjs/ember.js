// `@glimmer/validator` PACKAGE-ENTRY facade (full surface).
//
// This is the file the `@glimmer/validator` package entry
// (`dist/.../@glimmer/validator/index.js`) is emitted from in the rollup GXT
// build, and the file the vite test harness aliases `@glimmer/validator` to.
// It re-exports BOTH the runtime shim (`./validator`) and the test-only
// VM-compat surface (`./validator-vm-compat`) so published-package consumers
// and the test suites see the complete classic `@glimmer/validator` API.
//
// Crucially, the app's OWN imports of `@glimmer/validator` (bare and the deep
// `…/lib/*` paths) do NOT resolve here in the rollup build — they resolve to
// the runtime shim `./validator` directly (see `scripts/gxt-alias-map.mjs`:
// `shim` vs `entryShim`). So this facade is its own entry chunk, separate from
// the shared validator chunk the app pulls, which is what keeps the test-only
// VM-compat bytes out of the precompiled-app closure.
export * from './validator';
export * from './validator-vm-compat';
