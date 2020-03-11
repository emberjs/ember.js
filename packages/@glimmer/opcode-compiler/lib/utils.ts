import {
  NamedBlocks,
  Option,
  CompilableBlock,
  WireFormat,
  ContainingMetadata,
  CompileErrorOp,
  Expressions,
  SexpOpcodes,
} from '@glimmer/interfaces';
import { dict, assign } from '@glimmer/util';
import { compilableBlock } from './compilable-template';
import { error } from './opcode-builder/encoder';

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

export function expectString(
  expr: WireFormat.Expression,
  meta: ContainingMetadata,
  desc: string
): string | CompileErrorOp {
  if (!meta.upvars) {
    return error(`${desc}, but there were no free variables in the template`, 0, 0);
  }

  if (!Array.isArray(expr)) {
    throw new Error(`${desc}, got ${JSON.stringify(expr)}`);
  }

  if (isGet(expr)) {
    let name = simplePathName(expr, meta);
    if (name !== null) return name;
  }

  throw new Error(`${desc}, got ${JSON.stringify(expr)}`);
}

export function simplePathName(
  opcode: Expressions.GetPath | Expressions.Get,
  meta: ContainingMetadata
): Option<string> {
  if (opcode.length === 3 && opcode[2].length > 0) {
    return null;
  }

  if (isGetFree(opcode)) {
    return meta.upvars![opcode[1]];
  }

  return null;
}

export function isGet(
  opcode: Expressions.TupleExpression
): opcode is Expressions.Get | Expressions.GetPath {
  return opcode.length >= 2 && opcode[0] >= SexpOpcodes.GetSymbol;
}

function isGetFree(
  opcode: Expressions.Get | Expressions.GetPath
): opcode is Expressions.GetFree | Expressions.GetContextualFree {
  return opcode[0] >= SexpOpcodes.GetFree;
}
