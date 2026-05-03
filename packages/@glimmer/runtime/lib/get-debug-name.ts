import type { ComponentDefinition } from '@glimmer/interfaces';

export function getDebugName(
  definition: ComponentDefinition,
  manager = definition.manager
): string {
  return definition.resolvedName ?? definition.debugName ?? manager.getDebugName(definition.state);
}
