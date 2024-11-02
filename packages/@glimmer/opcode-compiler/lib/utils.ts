import type { NamedBlocks, Nullable, SerializedInlineBlock, WireFormat } from '@glimmer/interfaces';
import { unwrap } from '@glimmer/debug-util';
import { assign, dict, enumerate } from '@glimmer/util';

interface NamedBlocksDict {
  [key: string]: Nullable<WireFormat.SerializedInlineBlock>;
}

export class NamedBlocksImpl implements NamedBlocks {
  public names: string[];

  constructor(private blocks: Nullable<NamedBlocksDict>) {
    this.names = blocks ? Object.keys(blocks) : [];
  }

  get(name: string): Nullable<SerializedInlineBlock> {
    if (!this.blocks) return null;

    return this.blocks[name] || null;
  }

  has(name: string): boolean {
    let { blocks } = this;
    return blocks !== null && name in blocks;
  }

  with(name: string, block: Nullable<SerializedInlineBlock>): NamedBlocks {
    let { blocks } = this;

    if (blocks) {
      return new NamedBlocksImpl(assign({}, blocks, { [name]: block }));
    } else {
      return new NamedBlocksImpl({ [name]: block });
    }
  }

  get hasAny(): boolean {
    return this.blocks !== null;
  }
}

export const EMPTY_BLOCKS = new NamedBlocksImpl(null);

export function namedBlocks(blocks: WireFormat.Core.Blocks): NamedBlocks {
  if (blocks === null) {
    return EMPTY_BLOCKS;
  }

  let out: NamedBlocksDict = dict();

  let [keys, values] = blocks;

  for (const [i, key] of enumerate(keys)) {
    out[key] = unwrap(values[i]);
  }

  return new NamedBlocksImpl(out);
}
