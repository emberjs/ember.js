// Ambient declarations for @lifeart/gxt subpath imports used by the GXT
// integration layer. The published package's `types` entry points at
// ./dist/src/utils/index.d.ts which does not exist in the shipped tarball,
// so tsc cannot resolve named members. Treat everything as any here so
// individual callers don't need per-import `// @ts-ignore` hacks.

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
