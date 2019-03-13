import { OwnedTemplateMeta } from '@ember/-internals/views';
import { EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS } from '@ember/canary-features';
import { Option } from '@glimmer/interfaces';
import { OpcodeBuilder } from '@glimmer/opcode-compiler';
import * as WireFormat from '@glimmer/wire-format';
import { wrapComponentClassAttribute } from '../utils/bindings';
import { hashToArgs } from './utils';

export function textAreaMacro(
  _name: string,
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  builder: OpcodeBuilder<OwnedTemplateMeta>
) {
  let definition = builder.compiler['resolver'].lookupComponentDefinition(
    EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS ? 'textarea' : '-text-area',
    builder.referrer
  );
  wrapComponentClassAttribute(hash);
  builder.component.static(definition!, [params || [], hashToArgs(hash), null, null]);
  return true;
}
