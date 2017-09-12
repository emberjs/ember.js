import { RuntimeResolver } from '@glimmer/interfaces';
import { Option, assert } from '@glimmer/util';

import { ComponentDefinition } from './interfaces';

export function resolveComponent<Specifier>(resolver: RuntimeResolver<Specifier>, name: string, meta: Specifier): Option<ComponentDefinition> {
  let definition = resolver.lookupComponent(name, meta);
  assert(definition, `Could not find a component named "${name}"`);
  return definition as ComponentDefinition;
}