import {
  NamedBlocks,
  Option,
  CompilableBlock,
  WireFormat,
  ContainingMetadata,
  CompileErrorOp,
} from '@glimmer/interfaces';
import { dict, assign } from '@glimmer/util';
import { compilableBlock } from './compilable-template';
import { error } from './opcode-builder/encoder';

interface NamedBlocksDict {
  [key: string]: Option<CompilableBlock>;
}

export class NamedBlocksImpl implements NamedBlocks {
  constructor(private blocks: Option<NamedBlocksDict>) {}

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

export function expectString(
  expr: WireFormat.Expression,
  meta: ContainingMetadata,
  desc: string
): string | CompileErrorOp {
  if (!meta.upvars) {
    return error(`${desc}, but there were no free variables in the template`, 0, 0);
  }

  if (!Array.isArray(expr) || expr[0] !== WireFormat.SexpOpcodes.GetPath) {
    throw new Error(`${desc}, got ${JSON.stringify(expr)}`);
  }

  if (expr[2].length !== 0) {
    throw new Error(`${desc}, got ${JSON.stringify(expr)}`);
  }

  if (
    expr[1][0] === WireFormat.SexpOpcodes.GetContextualFree ||
    expr[1][0] === WireFormat.SexpOpcodes.GetFree
  ) {
    let head = expr[1][1];

    return meta.upvars[head];
  }

  throw new Error(`${desc}, got ${JSON.stringify(expr)}`);
}
