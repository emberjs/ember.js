import { Compilers } from './compilers';
import {
  SexpOpcodes,
  ResolveHandle,
  Op,
  Expressions,
  ExpressionSexpOpcode,
  ExpressionCompileActions,
  ContainingMetadata,
  ExpressionContext,
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

EXPRESSIONS.add(SexpOpcodes.Call, ([, name, params, hash], meta) => {
  // TODO: triage this in the WF compiler
  let start = 0;
  let offset = 0;

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

function isGetContextualFree(
  opcode: Expressions.TupleExpression
): opcode is Expressions.GetContextualFree {
  return opcode[0] >= SexpOpcodes.GetContextualFreeStart;
}

function isComponent(expr: Expressions.Expression, meta: ContainingMetadata): boolean {
  if (!Array.isArray(expr)) {
    return false;
  }

  if (isGetContextualFree(expr)) {
    let head = expr[1];

    if (meta.upvars && meta.upvars[head] === 'component') {
      return true;
    } else {
      return false;
    }
  }

  return false;
}

EXPRESSIONS.add(SexpOpcodes.GetSymbol, ([, sym, path]) => withPath(op(Op.GetVariable, sym), path));
EXPRESSIONS.add(SexpOpcodes.GetFree, ([, sym, path]) => withPath(op('ResolveFree', sym), path));
EXPRESSIONS.add(SexpOpcodes.GetFreeInAppendSingleId, ([, sym, path]) =>
  withPath(
    op('ResolveContextualFree', { freeVar: sym, context: ExpressionContext.AppendSingleId }),
    path
  )
);
EXPRESSIONS.add(SexpOpcodes.GetFreeInExpression, ([, sym, path]) =>
  withPath(
    op('ResolveContextualFree', { freeVar: sym, context: ExpressionContext.Expression }),
    path
  )
);
EXPRESSIONS.add(SexpOpcodes.GetFreeInCallHead, ([, sym, path]) =>
  withPath(op('ResolveContextualFree', { freeVar: sym, context: ExpressionContext.CallHead }), path)
);
EXPRESSIONS.add(SexpOpcodes.GetFreeInBlockHead, ([, sym, path]) =>
  withPath(
    op('ResolveContextualFree', { freeVar: sym, context: ExpressionContext.BlockHead }),
    path
  )
);
EXPRESSIONS.add(SexpOpcodes.GetFreeInModifierHead, ([, sym, path]) =>
  withPath(
    op('ResolveContextualFree', { freeVar: sym, context: ExpressionContext.ModifierHead }),
    path
  )
);
EXPRESSIONS.add(SexpOpcodes.GetFreeInComponentHead, ([, sym, path]) =>
  withPath(
    op('ResolveContextualFree', { freeVar: sym, context: ExpressionContext.ComponentHead }),
    path
  )
);

function withPath(expr: ExpressionCompileActions, path?: string[]) {
  if (path === undefined || path.length === 0) return expr;
  if (!Array.isArray(expr)) expr = [expr];

  for (let i = 0; i < path.length; i++) {
    expr.push(op(Op.GetProperty, path[i]));
  }

  return expr;
}

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
