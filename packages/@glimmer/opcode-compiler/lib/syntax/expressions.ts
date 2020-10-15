import {
  ExpressionCompileActions,
  ExpressionSexpOpcode,
  HighLevelResolutionOpcode,
  Op,
  SexpOpcodes,
} from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { CurryComponent } from '../opcode-builder/helpers/components';
import { Call, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { lookupLocal } from '../utils';
import { Compilers } from './compilers';

export const EXPRESSIONS = new Compilers<ExpressionSexpOpcode, ExpressionCompileActions>();

EXPRESSIONS.add(SexpOpcodes.Concat, ([, parts]) => {
  let out = [];

  for (let part of parts) {
    out.push(op(HighLevelResolutionOpcode.Expr, part));
  }

  out.push(op(Op.Concat, parts.length));

  return out;
});

EXPRESSIONS.add(SexpOpcodes.Call, ([, expr, params, hash]) => {
  return op(HighLevelResolutionOpcode.ResolveHelper, {
    expr,
    then: (handle) => Call({ handle, positional: params, named: hash }),
  });
});

EXPRESSIONS.add(SexpOpcodes.CurryComponent, ([, expr, positional, named], meta) => {
  return CurryComponent(meta, expr, positional, named);
});

EXPRESSIONS.add(SexpOpcodes.GetSymbol, ([, sym, path]) => withPath(op(Op.GetVariable, sym), path));

EXPRESSIONS.add(SexpOpcodes.GetStrictFree, ([, sym, _path]) => {
  return op(HighLevelResolutionOpcode.ResolveFree, {
    sym,
    then(_handle) {
      // TODO: Implement in strict mode

      return [];
    },
  });
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsFallback, ([, freeVar, path], meta) => {
  return withPath(lookupLocal(meta, meta.upvars![freeVar]), path);
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback, () => {
  // TODO: The logic for this opcode currently exists in STATEMENTS.Append, since
  // we want different wrapping logic depending on if we are invoking a component,
  // helper, or {{this}} fallback. Eventually we fix the opcodes so that we can
  // traverse the subexpression tree like normal in this location.
  throw new Error('unimplemented opcode');
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsHelperHeadOrThisFallback, (expr, meta) => {
  // <Foo @arg={{baz}}>

  if (meta.asPartial) {
    let name = meta.upvars![expr[1]];

    return op(Op.ResolveMaybeLocal, name);
  } else {
    return op(HighLevelResolutionOpcode.ResolveOptionalHelper, {
      expr,
      then(handleOrName) {
        return typeof handleOrName === 'number'
          ? Call({ handle: handleOrName, positional: null, named: null })
          : [op(Op.GetVariable, 0), op(Op.GetProperty, handleOrName)];
      },
    });
  }
});

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
  return [op(HighLevelResolutionOpcode.Expr, block), op(Op.HasBlock)];
});

EXPRESSIONS.add(SexpOpcodes.HasBlockParams, ([, block]) => [
  op(HighLevelResolutionOpcode.Expr, block),
  op(Op.SpreadBlock),
  op(Op.CompileBlock),
  op(Op.HasBlockParams),
]);
