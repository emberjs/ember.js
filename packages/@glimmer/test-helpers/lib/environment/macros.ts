import {
  MacrosImpl,
  staticComponent,
  invokeStaticBlock,
  NONE,
  UNHANDLED,
} from '@glimmer/opcode-compiler';
import { Option, WireFormat } from '@glimmer/interfaces';
import { EMPTY_BLOCKS } from '@glimmer/opcode-compiler';
import { resolveLayoutForTag } from '@glimmer/opcode-compiler';

export default class TestMacros extends MacrosImpl {
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

      let component = resolveLayoutForTag(name, context);

      if (component !== null) {
        return staticComponent(component, [params, hashToArgs(hash), blocks]);
      }

      return NONE;
    });

    inlines.addMissing((name, params, hash, context) => {
      let component = resolveLayoutForTag(name, context);

      if (component !== null) {
        return staticComponent(component, [params!, hashToArgs(hash), EMPTY_BLOCKS]);
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
