import type {
  ClassicResolver,
  ComponentDefinition,
  Nullable,
  Owner,
  ResolutionTimeConstants,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util';

export function resolveComponent(
  resolver: Nullable<ClassicResolver>,
  constants: ResolutionTimeConstants,
  name: string,
  owner: Owner | null
): Nullable<ComponentDefinition> {
  let definition =
    resolver?.lookupComponent?.(
      name,
      expect(owner, 'BUG: expected owner when looking up component')
    ) ?? null;

  if (import.meta.env.DEV && !definition) {
    throw new Error(
      `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
    );
  }

  return constants.resolvedComponent(definition!, name);
}
