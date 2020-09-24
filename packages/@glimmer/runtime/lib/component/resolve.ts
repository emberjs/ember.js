import { ComponentDefinition, Option, Owner, RuntimeResolver } from '@glimmer/interfaces';
import { assert, expect } from '@glimmer/util';

export function resolveComponent(
  resolver: RuntimeResolver,
  name: string,
  owner: Owner | null
): Option<ComponentDefinition> {
  let definition = resolver.lookupComponent(
    name,
    expect(owner, 'BUG: expected owner when looking up component')
  );
  assert(definition, `Could not find a component named "${name}"`);
  return definition;
}
