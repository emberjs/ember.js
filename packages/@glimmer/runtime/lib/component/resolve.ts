import { RuntimeResolverDelegate, ComponentDefinition, TemplateMeta } from '@glimmer/interfaces';
import { Option, assert } from '@glimmer/util';

export function resolveComponent<L extends TemplateMeta>(
  resolver: RuntimeResolverDelegate<L>,
  name: string,
  meta?: L
): Option<ComponentDefinition> {
  let definition = resolver.lookupComponentDefinition(name, meta);
  assert(definition, `Could not find a component named "${name}"`);
  return definition;
}
