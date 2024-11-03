import type { ExpressionSexpOpcode } from '@glimmer/interfaces';
import { VM_POP_FRAME_OP, VM_PUSH_FRAME_OP } from '@glimmer/constants';
import { $v0, Op } from '@glimmer/vm';
import { SexpOpcodes } from '@glimmer/wire-format';

import type { PushExpressionOp } from './compilers';

import { expr } from '../opcode-builder/helpers/expr';
import { isGetFreeHelper } from '../opcode-builder/helpers/resolution';
import { SimpleArgs } from '../opcode-builder/helpers/shared';
import { Call, CallDynamic, Curry, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { HighLevelResolutionOpcodes } from '../opcode-builder/opcodes';
import { Compilers } from './compilers';

export const EXPRESSIONS = new Compilers<PushExpressionOp, ExpressionSexpOpcode>();

EXPRESSIONS.add(SexpOpcodes.Concat, (op, [, parts]) => {
  for (let part of parts) {
    expr(op, part);
  }

  op(Op.Concat, parts.length);
});

EXPRESSIONS.add(SexpOpcodes.Call, (op, [, expression, positional, named]) => {
  if (isGetFreeHelper(expression)) {
    op(HighLevelResolutionOpcodes.Helper, expression, (handle: number) => {
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

EXPRESSIONS.add(SexpOpcodes.GetLexicalSymbol, (op, [, sym, path]) => {
  op(HighLevelResolutionOpcodes.TemplateLocal, sym, (handle: number) => {
    op(Op.ConstantReference, handle);
    withPath(op, path);
  });
});

EXPRESSIONS.add(SexpOpcodes.GetStrictKeyword, (op, expr) => {
  op(HighLevelResolutionOpcodes.Local, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcodes.Helper, expr, (handle: number) => {
      Call(op, handle, null, null);
    });
  });
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsHelperHead, (op, expr) => {
  op(HighLevelResolutionOpcodes.Local, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcodes.Helper, expr, (handle: number) => {
      Call(op, handle, null, null);
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

EXPRESSIONS.add(SexpOpcodes.Log, (op, [, positional]) => {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, null, false);
  op(Op.Log);
  op(VM_POP_FRAME_OP);
  op(Op.Fetch, $v0);
});
