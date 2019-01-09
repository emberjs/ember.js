import {
  Macros,
  staticComponent,
  invokeStaticBlock,
  NONE,
  UNHANDLED,
} from '@glimmer/opcode-compiler';
import { Option, WireFormat } from '@glimmer/interfaces';
import { EMPTY_BLOCKS } from '@glimmer/opcode-compiler';
import { resolveLayoutForTag } from '@glimmer/opcode-compiler';

export default class TestMacros extends Macros {
  constructor() {
    super();

    let { blocks, inlines } = this;

    blocks.add('identity', (_params, _hash, blocks) => {
      return invokeStaticBlock(blocks.get('default')!);
    });

    blocks.add('render-else', (_params, _hash, blocks) => {
      return invokeStaticBlock(blocks.get('else')!);
    });

    blocks.addMissing((name, params, hash, blocks, context) => {
      if (!params) {
        params = [];
      }

      let { handle } = resolveLayoutForTag(name, context);

      if (handle !== null) {
        return staticComponent(context.resolver, handle, [params, hashToArgs(hash), blocks]);
      }

      return NONE;
    });

    inlines.addMissing((name, params, hash, context) => {
      let { handle } = resolveLayoutForTag(name, context);

      if (handle !== null) {
        return staticComponent(context.resolver, handle, [params!, hashToArgs(hash), EMPTY_BLOCKS]);
      }

      return UNHANDLED;
    });
  }
}

function hashToArgs(hash: Option<WireFormat.Core.Hash>): Option<WireFormat.Core.Hash> {
  if (hash === null) return null;
  let names = hash[0].map(key => `@${key}`);
  return [names, hash[1]];
}
