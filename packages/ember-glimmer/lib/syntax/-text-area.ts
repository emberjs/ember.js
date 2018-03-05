import { Option } from '@glimmer/interfaces';
import { OpcodeBuilder } from '@glimmer/opcode-compiler';
import * as WireFormat from '@glimmer/wire-format';
import { OwnedTemplateMeta } from 'ember-views';
import { wrapComponentClassAttribute } from '../utils/bindings';
import { hashToArgs } from './utils';

export function textAreaMacro(_name: string, params: Option<WireFormat.Core.Params>, hash: Option<WireFormat.Core.Hash>, builder: OpcodeBuilder<OwnedTemplateMeta>) {
  let definition = builder.compiler['resolver'].lookupComponentDefinition('-text-area', builder.referrer);
  wrapComponentClassAttribute(hash);
  builder.component.static(definition!, [params || [], hashToArgs(hash), null, null]);
  return true;
}
