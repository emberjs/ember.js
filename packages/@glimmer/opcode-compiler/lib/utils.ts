import {
  NamedBlocks,
  Option,
  CompilableBlock,
  WireFormat,
  ContainingMetadata,
  ExpressionCompileActions,
  Op,
} from '@glimmer/interfaces';
import { dict, assign } from '@glimmer/util';
import { compilableBlock } from './compilable-template';
import { op } from './opcode-builder/encoder';

interface NamedBlocksDict {
  [key: string]: Option<CompilableBlock>;
}

export class NamedBlocksImpl implements NamedBlocks {
  public names: string[];

  constructor(private blocks: Option<NamedBlocksDict>) {
    this.names = blocks ? Object.keys(blocks) : [];
  }

  get(name: string): Option<CompilableBlock> {
    if (!this.blocks) return null;

    return this.blocks[name] || null;
  }

  has(name: string): boolean {
    let { blocks } = this;
    return blocks !== null && name in blocks;
  }

  with(name: string, block: Option<CompilableBlock>): NamedBlocks {
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

export function namedBlocks(blocks: WireFormat.Core.Blocks, meta: ContainingMetadata): NamedBlocks {
  if (blocks === null) {
    return EMPTY_BLOCKS;
  }

  let out: NamedBlocksDict = dict();

  let [keys, values] = blocks;

  for (let i = 0; i < keys.length; i++) {
    out[keys[i]] = compilableBlock(values[i]!, meta);
  }

  return new NamedBlocksImpl(out);
}

export function lookupLocal(meta: ContainingMetadata, name: string): ExpressionCompileActions {
  if (meta.asPartial) {
    return op(Op.ResolveMaybeLocal, name);
  } else {
    return [op(Op.GetVariable, 0), op(Op.GetProperty, name)];
  }
}
