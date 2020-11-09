import {
  ContainingMetadata,
  ExpressionCompileActions,
  LayoutWithContext,
  Op,
  Option,
  StatementCompileActions,
  WireFormat,
  ArgsOptions,
} from '@glimmer/interfaces';
import { EMPTY_ARRAY } from '@glimmer/util';
import { op } from '../encoder';
import { strArray } from '../operands';
import { PushYieldableBlock } from './blocks';
import { NONE } from '../../syntax/concat';

/**
 * Compile arguments, pushing an Arguments object onto the stack.
 *
 * @param args.params
 * @param args.hash
 * @param args.blocks
 * @param args.atNames
 */
export function CompileArgs({
  params,
  hash,
  blocks,
  atNames,
}: ArgsOptions): StatementCompileActions {
  let out: StatementCompileActions = [];

  let blockNames: string[] = blocks.names;
  for (let i = 0; i < blockNames.length; i++) {
    out.push(PushYieldableBlock(blocks.get(blockNames[i])));
  }

  let { count, actions } = CompilePositional(params);

  out.push(actions);

  let flags = count << 4;

  if (atNames) flags |= 0b1000;

  if (blocks) {
    flags |= 0b111;
  }

  let names: string[] = EMPTY_ARRAY;

  if (hash) {
    names = hash[0];
    let val = hash[1];
    for (let i = 0; i < val.length; i++) {
      out.push(op('Expr', val[i]));
    }
  }

  out.push(op(Op.PushArgs, strArray(names), strArray(blockNames), flags));

  return out;
}

/**
 * Compile an optional list of positional arguments, which pushes each argument
 * onto the stack and returns the number of parameters compiled
 *
 * @param params an optional list of positional arguments
 */
export function CompilePositional(
  params: Option<WireFormat.Core.Params>
): { count: number; actions: ExpressionCompileActions } {
  if (!params) return { count: 0, actions: NONE };

  let actions: ExpressionCompileActions = [];

  for (let i = 0; i < params.length; i++) {
    actions.push(op('Expr', params[i]));
  }

  return { count: params.length, actions };
}

export function meta(layout: LayoutWithContext): ContainingMetadata {
  return {
    asPartial: layout.asPartial || false,
    evalSymbols: evalSymbols(layout),
    upvars: layout.block.upvars,
    moduleName: layout.moduleName,
    owner: layout.owner,
    size: layout.block.symbols.length,
  };
}

export function evalSymbols(layout: LayoutWithContext): Option<string[]> {
  let { block } = layout;

  return block.hasEval ? block.symbols : null;
}
