import { wrapComponentClassAttribute } from '../utils/bindings';
import { hashToArgs } from './utils';

export function textAreaMacro(_name, params, hash, builder) {
  let definition = builder.env.getComponentDefinition('-text-area', builder.meta.templateMeta);
  wrapComponentClassAttribute(hash);
  builder.component.static(definition, [params, hashToArgs(hash), null, null]);
  return true;
}
