import {
  ExpressionSexpOpcode,
  HighLevelResolutionOpcode,
  Op,
  SexpOpcodes,
} from '@glimmer/interfaces';
import { CurryComponent } from '../opcode-builder/helpers/components';
import { expr } from '../opcode-builder/helpers/expr';
import { Call, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { Compilers, PushExpressionOp } from './compilers';

export const EXPRESSIONS = new Compilers<PushExpressionOp, ExpressionSexpOpcode>();

EXPRESSIONS.add(SexpOpcodes.Concat, (op, [, parts]) => {
  for (let part of parts) {
    expr(op, part);
  }

  op(Op.Concat, parts.length);
});

EXPRESSIONS.add(SexpOpcodes.Call, (op, [, expr, positional, named]) => {
  op(HighLevelResolutionOpcode.ResolveHelper, expr, (handle: number) => {
    Call(op, handle, positional, named);
  });
});

EXPRESSIONS.add(SexpOpcodes.CurryComponent, (op, [, expr, positional, named]) => {
  CurryComponent(op, expr, positional, named);
});

EXPRESSIONS.add(SexpOpcodes.GetSymbol, (op, [, sym, path]) => {
  op(Op.GetVariable, sym);
  withPath(op, path);
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
    op(HighLevelResolutionOpcode.ResolveOptionalHelper, expr, (handleOrName: number | string) => {
      if (typeof handleOrName === 'number') {
        Call(op, handleOrName, null, null);
      } else {
        op(Op.GetVariable, 0);
        op(Op.GetProperty, handleOrName);
      }
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
