import { ExpressionCompilers } from './compilers';
import { SexpOpcodes, ResolveHandle, Op } from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { helper, pushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { assert } from '@glimmer/util';
import { curryComponent } from '../opcode-builder/helpers/components';

export const EXPRESSIONS = new ExpressionCompilers();

EXPRESSIONS.add(SexpOpcodes.Unknown, ([, name], meta) => {
  return op('IfResolved', {
    kind: ResolveHandle.Helper,
    name,
    andThen: handle => helper({ handle, params: null, hash: null }),
    orElse: () => {
      if (meta.asPartial) {
        return op(Op.ResolveMaybeLocal, name);
      } else {
        return [op(Op.GetVariable, 0), op(Op.GetProperty, name)];
      }
    },
  });
});

EXPRESSIONS.add(SexpOpcodes.Concat, ([, parts]) => {
  let out = [];

  for (let part of parts) {
    out.push(op('Expr', part));
  }

  out.push(op(Op.Concat, parts.length));

  return out;
});

EXPRESSIONS.add(SexpOpcodes.Helper, ([, name, params, hash], meta) => {
  // TODO: triage this in the WF compiler
  if (name === 'component') {
    assert(params.length, 'SYNTAX ERROR: component helper requires at least one argument');

    let [definition, ...restArgs] = params;
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

  return op('IfResolved', {
    kind: ResolveHandle.Helper,
    name,
    andThen: handle => helper({ handle, params, hash }),
  });
});

EXPRESSIONS.add(SexpOpcodes.Get, ([, head, path]) => [
  op(Op.GetVariable, head),
  ...path.map(p => op(Op.GetProperty, p)),
]);

EXPRESSIONS.add(SexpOpcodes.MaybeLocal, ([, path], meta) => {
  let out = [];

  if (meta.asPartial) {
    let head = path[0];
    path = path.slice(1);

    out.push(op(Op.ResolveMaybeLocal, head));
  } else {
    out.push(op(Op.GetVariable, 0));
  }

  for (let i = 0; i < path.length; i++) {
    out.push(op(Op.GetProperty, path[i]));
  }

  return out;
});

EXPRESSIONS.add(SexpOpcodes.Undefined, () => pushPrimitiveReference(undefined));
EXPRESSIONS.add(SexpOpcodes.HasBlock, ([, symbol]) => op(Op.HasBlock, symbol));

EXPRESSIONS.add(SexpOpcodes.HasBlockParams, ([, symbol]) => [
  op(Op.GetBlock, symbol),
  op('JitCompileBlock'),
  op(Op.HasBlockParams),
]);
