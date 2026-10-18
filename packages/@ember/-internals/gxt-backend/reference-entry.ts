// `@glimmer/reference` PACKAGE-ENTRY facade (full surface).
//
// The file the `@glimmer/reference` package entry is emitted from in the rollup
// GXT build, and the vite alias target for `@glimmer/reference`. Re-exports the
// runtime shim (`./reference`) plus the test-only IterableReference port
// (`./reference-vm-compat`).
//
// The app's own `@glimmer/reference` imports (bare + `…/lib/*`) resolve to the
// runtime shim `./reference` directly in the rollup build (see
// `scripts/gxt-alias-map.mjs`: `shim` vs `entryShim`), so this facade is its
// own entry chunk and the iterable-port bytes stay out of the app closure.
export * from './reference';
export * from './reference-vm-compat';
