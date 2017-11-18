import { OpcodeBuilderDSL } from '@glimmer/runtime';
import * as WireFormat from '@glimmer/wire-format';
import { wrapComponentClassAttribute } from '../utils/bindings';
import { hashToArgs } from './utils';

export function textAreaMacro(_name: string, params: WireFormat.Core.Params, hash: WireFormat.Core.Hash, builder: OpcodeBuilderDSL) {
  let definition = builder.env.getComponentDefinition('-text-area', builder.meta.templateMeta);
  wrapComponentClassAttribute(hash);
  builder.component.static(definition, [params, hashToArgs(hash), null, null]);
  return true;
}
