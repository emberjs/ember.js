// Ambient declarations for @lifeart/gxt subpath imports used by the GXT
// integration layer. The published package's `types` entry points at
// ./dist/src/utils/index.d.ts which does not exist in the shipped tarball,
// so tsc cannot resolve named members. Treat everything as any here so
// individual callers don't need per-import `// @ts-ignore` hacks.

// Cluster E (pilot): `__GXT_MODE__` is a build-time constant. The vite test
// build replaces it with `true`/`false` via `define:` (see vite.config.mjs);
// the rollup classic build replaces it with `false` (see rollup.config.mjs).
// At runtime the identifier never survives in either bundle. Sites that read
// it use the bare identifier `__GXT_MODE__` (not `globalThis.__GXT_MODE__`)
// so the substitution can const-fold and DCE drops the dead branch.
declare const __GXT_MODE__: boolean;

// Build-time constant that toggles the CLASSIC @ember/component emulation in
// the gxt-backend manager. Default TRUE (the compat build keeps full classic
// curly + custom-manager + LinkTo + custom-element support, byte-unchanged).
// A NATIVE/Polaris GXT build flips it FALSE (trigger: GXT_NATIVE=1 or
// EMBER_GXT_CLASSIC=0; see rollup.config.mjs / vite.config.mjs) so terser/DCE
// strips the classic component subtree out of `manager.ts`. Read as the bare
// identifier so the substitution const-folds and the dead branch is dropped.
declare const __GXT_CLASSIC_COMPONENTS__: boolean;

declare module '@lifeart/gxt' {
  const value: any;
  export = value;
}
declare module '@lifeart/gxt/glimmer-compatibility' {
  const value: any;
  export = value;
}
declare module '@lifeart/gxt/compiler' {
  const value: any;
  export = value;
}
declare module '@lifeart/gxt/runtime-compiler' {
  const value: any;
  export = value;
}
declare module '@lifeart/gxt/ember-inspector' {
  const value: any;
  export = value;
}
