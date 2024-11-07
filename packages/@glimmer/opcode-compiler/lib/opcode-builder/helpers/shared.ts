import type {
  BlockMetadata,
  LayoutWithContext,
  NamedBlocks,
  Nullable,
  WireFormat,
} from '@glimmer/interfaces';
import { VM_PUSH_ARGS_OP, VM_PUSH_EMPTY_ARGS_OP } from '@glimmer/constants';
import { EMPTY_ARRAY, EMPTY_STRING_ARRAY } from '@glimmer/util';

import type { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';

import { PushYieldableBlock } from './blocks';
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
  for (const name of blockNames) {
    PushYieldableBlock(op, blocks.get(name));
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

  op(VM_PUSH_ARGS_OP, names as string[], blockNames, flags);
}

export function SimpleArgs(
  op: PushExpressionOp,
  positional: Nullable<WireFormat.Core.Params>,
  named: Nullable<WireFormat.Core.Hash>,
  atNames: boolean
): void {
  if (positional === null && named === null) {
    op(VM_PUSH_EMPTY_ARGS_OP);
    return;
  }

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

  op(VM_PUSH_ARGS_OP, names, EMPTY_STRING_ARRAY, flags);
}

/**
 * Compile an optional list of positional arguments, which pushes each argument
 * onto the stack and returns the number of parameters compiled
 *
 * @param positional an optional list of positional arguments
 */
export function CompilePositional(
  op: PushExpressionOp,
  positional: Nullable<WireFormat.Core.Params>
): number {
  if (positional === null) return 0;

  for (let i = 0; i < positional.length; i++) {
    expr(op, positional[i]);
  }

  return positional.length;
}

export function meta(layout: LayoutWithContext): BlockMetadata {
  let [, locals, hasDebugger, upvars, lexicalSymbols] = layout.block;

  return {
    symbols: {
      locals,
      upvars,
      lexical: lexicalSymbols,
    },
    hasDebugger,
    scopeValues: layout.scope?.() ?? null,
    isStrictMode: layout.isStrictMode,
    moduleName: layout.moduleName,
    owner: layout.owner,
    size: locals.length,
  };
}

export function getDebuggerSymbols(layout: LayoutWithContext): Nullable<string[]> {
  let { block } = layout;
  let [, symbols, hasDebugger] = block;

  return hasDebugger ? symbols : null;
}
