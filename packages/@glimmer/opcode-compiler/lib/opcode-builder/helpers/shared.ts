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
import { pushYieldableBlock } from './blocks';
import { NONE } from '../../syntax/concat';

export function compileArgs({
  params,
  hash,
  blocks,
  atNames,
}: ArgsOptions): StatementCompileActions {
  let out: StatementCompileActions = [];

  if (blocks.hasAny) {
    out.push(pushYieldableBlock(blocks.get('default')));
    out.push(pushYieldableBlock(blocks.get('else')));
    out.push(pushYieldableBlock(blocks.get('attrs')));
  }

  let { count, actions } = compileParams(params);

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

  out.push(op(Op.PushArgs, strArray(names), flags));

  return out;
}

export function compileParams(
  params: Option<WireFormat.Core.Params>
): { count: number; actions: ExpressionCompileActions } {
  if (!params) return { count: 0, actions: NONE };

  let actions: ExpressionCompileActions = [];

  for (let i = 0; i < params.length; i++) {
    actions.push(op('Expr', params[i]));
  }

  return { count: params.length, actions };
}

export function meta<R>(layout: LayoutWithContext<R>): ContainingMetadata {
  return {
    asPartial: layout.asPartial,
    evalSymbols: evalSymbols(layout),
    referrer: layout.referrer,
    size: layout.block.symbols.length,
  };
}

export function evalSymbols<R>(layout: LayoutWithContext<R>): Option<string[]> {
  let { block } = layout;

  return block.hasEval ? block.symbols : null;
}
