import { RuntimeResolver } from '@glimmer/interfaces';
import { Option, assert } from '@glimmer/util';

import { ComponentDefinition } from './interfaces';

export function resolveComponent<TemplateMeta>(resolver: RuntimeResolver<TemplateMeta>, name: string, meta: TemplateMeta): Option<ComponentDefinition> {
  let definition = resolver.lookupComponent(name, meta);
  assert(definition, `Could not find a component named "${name}"`);
  return definition as ComponentDefinition;
}
