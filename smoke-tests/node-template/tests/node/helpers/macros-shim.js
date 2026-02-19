/**
 * @embroider/macros shim for Node.js ESM loading.
 *
 * The Ember ESM packages in dist/packages/ contain unresolved imports from
 * '@embroider/macros' (specifically isDevelopingApp). In a real app build,
 * these are resolved at compile time by a Babel plugin. For Node.js testing
 * we provide a runtime shim.
 */
export function isDevelopingApp() {
  return true;
}
