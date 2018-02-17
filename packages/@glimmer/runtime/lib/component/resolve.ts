import { RuntimeResolver } from '@glimmer/interfaces';
import { Option, assert } from '@glimmer/util';

import { ComponentDefinition } from './interfaces';

export function resolveComponent<Locator>(resolver: RuntimeResolver<Locator>, name: string, meta: Locator): Option<ComponentDefinition> {
  let definition = resolver.lookupComponentDefinition(name, meta);
  assert(definition, `Could not find a component named "${name}"`);
  return definition as ComponentDefinition;
}
