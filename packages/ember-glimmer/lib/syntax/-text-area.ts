import {
  LazyOpcodeBuilder,
  TemplateMeta
} from '@glimmer/opcode-compiler';
import { wrapComponentClassAttribute } from '../utils/bindings';
import { hashToArgs } from './utils';

export function textAreaMacro(_name: string, params: any[], hash: any, builder: LazyOpcodeBuilder<TemplateMeta>) {
  let definition = builder.resolver.lookupComponentDefinition('-text-area', builder.referrer);
  wrapComponentClassAttribute(hash);
  builder.component.static(definition!, [params, hashToArgs(hash), null, null]);
  return true;
}
