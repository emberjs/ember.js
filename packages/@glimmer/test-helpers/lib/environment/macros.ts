import { Macros } from '@glimmer/opcode-compiler';
import { Option } from '@glimmer/interfaces';
import * as WireFormat from '@glimmer/wire-format';
import { EMPTY_BLOCKS } from '@glimmer/opcode-compiler';

export default class TestMacros extends Macros {
  constructor() {
    super();

    let { blocks, inlines } = this;

    blocks.add('identity', (_params, _hash, blocks, builder) => {
      builder.invokeStaticBlock(blocks.get('default')!);
    });

    blocks.add('render-else', (_params, _hash, blocks, builder) => {
      builder.invokeStaticBlock(blocks.get('else')!);
    });

    blocks.addMissing((name, params, hash, blocks, builder) => {
      if (!params) {
        params = [];
      }

      let { handle } = builder.compiler.resolveLayoutForTag(name, builder.referrer);

      if (handle !== null) {
        builder.component.static(handle, [params, hashToArgs(hash), blocks]);
        return true;
      }

      return false;
    });

    inlines.addMissing((name, params, hash, builder) => {
      let { handle } = builder.compiler.resolveLayoutForTag(name, builder.referrer);

      if (handle !== null) {
        builder.component.static(handle, [params!, hashToArgs(hash), EMPTY_BLOCKS]);
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
