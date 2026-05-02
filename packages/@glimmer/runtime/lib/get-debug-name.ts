import type { ComponentDefinition } from '@glimmer/interfaces';

// Tiny helper extracted from `./debug-render-tree` so opcodes that need a
// debug name don't have to import the whole `DebugRenderTreeImpl` class
// just to reach this 4-line function. Keeps `./debug-render-tree` out of
// bundles that aren't doing render-tree introspection (the class itself
// is only pulled in when `debug-render-tree-register` is imported).
export function getDebugName(
  definition: ComponentDefinition,
  manager = definition.manager
): string {
  return definition.resolvedName ?? definition.debugName ?? manager.getDebugName(definition.state);
}
