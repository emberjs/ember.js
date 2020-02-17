import { Compilers } from './compilers';
import {
  SexpOpcodes,
  ResolveHandle,
  Op,
  Expressions,
  ExpressionSexpOpcode,
  ExpressionCompileActions,
  ContainingMetadata,
} from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { Call, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { curryComponent } from '../opcode-builder/helpers/components';
import { expectString } from '../utils';

export const EXPRESSIONS = new Compilers<ExpressionSexpOpcode, ExpressionCompileActions>();

EXPRESSIONS.add(SexpOpcodes.Concat, ([, parts]) => {
  let out = [];

  for (let part of parts) {
    out.push(op('Expr', part));
  }

  out.push(op(Op.Concat, parts.length));

  return out;
});

EXPRESSIONS.add(SexpOpcodes.Call, ([, start, offset, name, params, hash], meta) => {
  // TODO: triage this in the WF compiler
  if (isComponent(name, meta)) {
    if (!params || params.length === 0) {
      return op('Error', {
        problem: 'component helper requires at least one argument',
        start: start,
        end: start + offset,
      });
    }

    let [definition, ...restArgs] = params as Expressions.Expression[];
    return curryComponent(
      {
        definition,
        params: restArgs,
        hash,
        atNames: false,
      },
      meta.referrer
    );
  }

  let nameOrError = expectString(name, meta, 'Expected call head to be a string');

  if (typeof nameOrError !== 'string') {
    return nameOrError;
  }

  return op('IfResolved', {
    kind: ResolveHandle.Helper,
    name: nameOrError,
    andThen: handle => Call({ handle, params, hash }),
    span: {
      start,
      end: start + offset,
    },
  });
});

function isComponent(expr: Expressions.Expression, meta: ContainingMetadata): boolean {
  if (!Array.isArray(expr)) {
    return false;
  }

  if (expr[0] === SexpOpcodes.GetPath) {
    let head = expr[1];

    if (
      head[0] === SexpOpcodes.GetContextualFree &&
      meta.upvars &&
      meta.upvars[head[1]] === 'component'
    ) {
      return true;
    } else {
      return false;
    }
  }

  return false;
}

EXPRESSIONS.add(SexpOpcodes.GetSymbol, ([, head]) => [op(Op.GetVariable, head)]);

EXPRESSIONS.add(SexpOpcodes.GetPath, ([, head, tail]) => {
  return [op('Expr', head), ...tail.map(p => op(Op.GetProperty, p))];
});

EXPRESSIONS.add(SexpOpcodes.GetFree, ([, head]) => op('ResolveFree', head));

EXPRESSIONS.add(SexpOpcodes.GetContextualFree, ([, head, context]) =>
  op('ResolveContextualFree', { freeVar: head, context })
);

EXPRESSIONS.add(SexpOpcodes.Undefined, () => PushPrimitiveReference(undefined));
EXPRESSIONS.add(SexpOpcodes.HasBlock, ([, block]) => {
  return [op('Expr', block), op(Op.HasBlock)];
});

EXPRESSIONS.add(SexpOpcodes.HasBlockParams, ([, block]) => [
  op('Expr', block),
  op(Op.JitSpreadBlock),
  op('JitCompileBlock'),
  op(Op.HasBlockParams),
]);
