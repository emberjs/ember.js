import {
  type ComponentDefinition,
  type Option,
  type Owner,
  type ResolutionTimeConstants,
  type RuntimeResolver,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/util';

export function resolveComponent(
  resolver: RuntimeResolver,
  constants: ResolutionTimeConstants,
  name: string,
  owner: Owner | null
): Option<ComponentDefinition> {
  let definition = resolver.lookupComponent(
    name,
    expect(owner, 'BUG: expected owner when looking up component')
  );

  if (import.meta.env.DEV && !definition) {
    throw new Error(
      `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
    );
  }

  return constants.resolvedComponent(definition!, name);
}
