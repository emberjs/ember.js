import {
  ContainingMetadata,
  LayoutWithContext,
  Op,
  Option,
  WireFormat,
  NamedBlocks,
} from '@glimmer/interfaces';
import { EMPTY_ARRAY, EMPTY_STRING_ARRAY } from '@glimmer/util';
import { PushYieldableBlock } from './blocks';
import { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';
import { expr } from './expr';

/**
 * Compile arguments, pushing an Arguments object onto the stack.
 *
 * @param args.params
 * @param args.hash
 * @param args.blocks
 * @param args.atNames
 */
export function CompileArgs(
  op: PushStatementOp,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash,
  blocks: NamedBlocks,
  atNames: boolean
): void {
  let blockNames: string[] = blocks.names;
  for (let i = 0; i < blockNames.length; i++) {
    PushYieldableBlock(op, blocks.get(blockNames[i]));
  }

  let count = CompilePositional(op, positional);

  let flags = count << 4;

  if (atNames) flags |= 0b1000;

  if (blocks) {
    flags |= 0b111;
  }

  let names = EMPTY_ARRAY as readonly string[];

  if (named) {
    names = named[0];
    let val = named[1];
    for (let i = 0; i < val.length; i++) {
      expr(op, val[i]);
    }
  }

  op(Op.PushArgs, names as string[], blockNames, flags);
}

export function SimpleArgs(
  op: PushExpressionOp,
  positional: Option<WireFormat.Core.Params>,
  named: Option<WireFormat.Core.Hash>,
  atNames: boolean
): void {
  let count = CompilePositional(op, positional);

  let flags = count << 4;

  if (atNames) flags |= 0b1000;

  let names = EMPTY_STRING_ARRAY;

  if (named) {
    names = named[0];
    let val = named[1];
    for (let i = 0; i < val.length; i++) {
      expr(op, val[i]);
    }
  }

  op(Op.PushArgs, names as string[], EMPTY_STRING_ARRAY, flags);
}

/**
 * Compile an optional list of positional arguments, which pushes each argument
 * onto the stack and returns the number of parameters compiled
 *
 * @param positional an optional list of positional arguments
 */
export function CompilePositional(
  op: PushExpressionOp,
  positional: Option<WireFormat.Core.Params>
): number {
  if (positional === null) return 0;

  for (let i = 0; i < positional.length; i++) {
    expr(op, positional[i]);
  }

  return positional.length;
}

export function meta(layout: LayoutWithContext): ContainingMetadata {
  let [, symbols, , upvars] = layout.block;

  return {
    asPartial: layout.asPartial || false,
    evalSymbols: evalSymbols(layout),
    upvars: upvars,
    scopeValues: layout.scope?.() ?? null,
    isStrictMode: layout.isStrictMode,
    moduleName: layout.moduleName,
    owner: layout.owner,
    size: symbols.length,
  };
}

export function evalSymbols(layout: LayoutWithContext): Option<string[]> {
  let { block } = layout;
  let [, symbols, hasEval] = block;

  return hasEval ? symbols : null;
}
