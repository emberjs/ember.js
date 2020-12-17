import {
  ExpressionSexpOpcode,
  HighLevelResolutionOpcode,
  Op,
  SexpOpcodes,
} from '@glimmer/interfaces';
import { expr } from '../opcode-builder/helpers/expr';
import { isGetFreeHelper } from '../opcode-builder/helpers/resolution';
import { Call, CallDynamic, Curry, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { Compilers, PushExpressionOp } from './compilers';

export const EXPRESSIONS = new Compilers<PushExpressionOp, ExpressionSexpOpcode>();

EXPRESSIONS.add(SexpOpcodes.Concat, (op, [, parts]) => {
  for (let part of parts) {
    expr(op, part);
  }

  op(Op.Concat, parts.length);
});

EXPRESSIONS.add(SexpOpcodes.Call, (op, [, expression, positional, named]) => {
  if (isGetFreeHelper(expression)) {
    op(HighLevelResolutionOpcode.ResolveHelper, expression, (handle: number) => {
      Call(op, handle, positional, named);
    });
  } else {
    expr(op, expression);
    CallDynamic(op, positional, named);
  }
});

EXPRESSIONS.add(SexpOpcodes.Curry, (op, [, expr, type, positional, named]) => {
  Curry(op, type, expr, positional, named);
});

EXPRESSIONS.add(SexpOpcodes.GetSymbol, (op, [, sym, path]) => {
  op(Op.GetVariable, sym);
  withPath(op, path);
});

EXPRESSIONS.add(SexpOpcodes.GetTemplateSymbol, (op, [, sym, path]) => {
  op(HighLevelResolutionOpcode.ResolveTemplateLocal, sym, (handle: number) => {
    op(Op.ConstantReference, handle);
    withPath(op, path);
  });
});

EXPRESSIONS.add(SexpOpcodes.GetStrictFree, (op, [, sym, _path]) => {
  op(HighLevelResolutionOpcode.ResolveFree, sym, (_handle: unknown) => {
    // TODO: Implement in strict mode
  });
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsFallback, (op, [, freeVar, path]) => {
  op(HighLevelResolutionOpcode.ResolveLocal, freeVar, (name: string) => {
    op(Op.GetVariable, 0);
    op(Op.GetProperty, name);
  });
  withPath(op, path);
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback, () => {
  // TODO: The logic for this opcode currently exists in STATEMENTS.Append, since
  // we want different wrapping logic depending on if we are invoking a component,
  // helper, or {{this}} fallback. Eventually we fix the opcodes so that we can
  // traverse the subexpression tree like normal in this location.
  throw new Error('unimplemented opcode');
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsHelperHeadOrThisFallback, (op, expr) => {
  // <Foo @arg={{baz}}>

  op(HighLevelResolutionOpcode.ResolveLocal, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcode.ResolveOptionalHelper, expr, {
      ifHelper: (handle: number) => {
        Call(op, handle, null, null);
      },

      ifFallback: (name: string) => {
        op(Op.GetVariable, 0);
        op(Op.GetProperty, name);
      },
    });
  });
});

function withPath(op: PushExpressionOp, path?: string[]) {
  if (path === undefined || path.length === 0) return;

  for (let i = 0; i < path.length; i++) {
    op(Op.GetProperty, path[i]);
  }
}

EXPRESSIONS.add(SexpOpcodes.Undefined, (op) => PushPrimitiveReference(op, undefined));
EXPRESSIONS.add(SexpOpcodes.HasBlock, (op, [, block]) => {
  expr(op, block);
  op(Op.HasBlock);
});

EXPRESSIONS.add(SexpOpcodes.HasBlockParams, (op, [, block]) => {
  expr(op, block);
  op(Op.SpreadBlock);
  op(Op.CompileBlock);
  op(Op.HasBlockParams);
});

EXPRESSIONS.add(SexpOpcodes.IfInline, (op, [, condition, truthy, falsy]) => {
  // Push in reverse order
  expr(op, falsy);
  expr(op, truthy);
  expr(op, condition);
  op(Op.IfInline);
});

EXPRESSIONS.add(SexpOpcodes.Not, (op, [, value]) => {
  expr(op, value);
  op(Op.Not);
});

EXPRESSIONS.add(SexpOpcodes.GetDynamicVar, (op, [, expression]) => {
  expr(op, expression);
  op(Op.GetDynamicVar);
});
