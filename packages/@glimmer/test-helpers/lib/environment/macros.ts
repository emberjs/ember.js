
import { Macros } from "@glimmer/opcode-compiler";
import { Option } from "@glimmer/interfaces";
import * as WireFormat from '@glimmer/wire-format';

export default class TestMacros extends Macros {
  constructor() {
    super();

    let { blocks, inlines} = this;

    blocks.add('identity', (_params, _hash, template, _inverse, builder) => {
      builder.invokeStaticBlock(template!);
    });

    blocks.add('render-inverse', (_params, _hash, _template, inverse, builder) => {
      builder.invokeStaticBlock(inverse!);
    });

    blocks.addMissing((name, params, hash, template, inverse, builder) => {
      if (!params) {
        params = [];
      }

      let lookup = builder.resolver;

      let handle = lookup.lookupComponentDefinition(name, builder.referrer);

      if (handle !== null) {
        builder.component.static(handle, [params, hashToArgs(hash), template, inverse]);
        return true;
      }

      return false;
    });

    inlines.addMissing((name, params, hash, builder) => {
      let lookup = builder.resolver;
      let handle = lookup.lookupComponentDefinition(name, builder.referrer);

      if (handle !== null) {
        builder.component.static(handle, [params!, hashToArgs(hash), null, null]);
        return true;
      }

      return false;
    });
  }
}

function hashToArgs(hash: Option<WireFormat.Core.Hash>): Option<WireFormat.Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map(key => `@${key}`);
  return [names, hash[1]];
}
