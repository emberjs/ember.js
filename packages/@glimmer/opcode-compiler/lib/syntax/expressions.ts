import { assert, deprecate } from '@glimmer/global-context';
import {
  ExpressionSexpOpcode,
  HighLevelResolutionOpcode,
  MachineOp,
  Op,
  SexpOpcodes,
} from '@glimmer/interfaces';
import { $v0 } from '@glimmer/vm';

import { expr } from '../opcode-builder/helpers/expr';
import { isGetFreeHelper } from '../opcode-builder/helpers/resolution';
import { SimpleArgs } from '../opcode-builder/helpers/shared';
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

EXPRESSIONS.add(SexpOpcodes.GetLexicalSymbol, (op, [, sym, path]) => {
  op(HighLevelResolutionOpcode.ResolveTemplateLocal, sym, (handle: number) => {
    op(Op.ConstantReference, handle);
    withPath(op, path);
  });
});

EXPRESSIONS.add(SexpOpcodes.GetStrictKeyword, (op, [, sym, _path]) => {
  op(HighLevelResolutionOpcode.ResolveFree, sym, (_handle: unknown) => {
    // TODO: Implement in strict mode
  });
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback, () => {
  // TODO: The logic for this opcode currently exists in STATEMENTS.Append, since
  // we want different wrapping logic depending on if we are invoking a component,
  // helper, or {{this}} fallback. Eventually we fix the opcodes so that we can
  // traverse the subexpression tree like normal in this location.
  throw new Error('unimplemented opcode');
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsHelperHeadOrThisFallback, (op, expr) => {
  // <div id={{baz}}>

  op(HighLevelResolutionOpcode.ResolveLocal, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcode.ResolveOptionalHelper, expr, {
      ifHelper: (handle: number) => {
        Call(op, handle, null, null);
      },
    });
  });
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsDeprecatedHelperHeadOrThisFallback, (op, expr) => {
  // <Foo @bar={{baz}}>

  op(HighLevelResolutionOpcode.ResolveLocal, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcode.ResolveOptionalHelper, expr, {
      ifHelper: (handle: number, name: string, moduleName: string) => {
        assert(expr[2] && expr[2].length === 1, '[BUG] Missing argument name');

        let arg = expr[2][0];

        deprecate(
          `The \`${name}\` helper was used in the \`${moduleName}\` template as \`${arg}={{${name}}}\`. ` +
            `This is ambigious between wanting the \`${arg}\` argument to be the \`${name}\` helper itself, ` +
            `or the result of invoking the \`${name}\` helper (current behavior). ` +
            `This implicit invocation behavior has been deprecated.\n\n` +
            `Instead, please explicitly invoke the helper with parenthesis, i.e. \`${arg}={{(${name})}}\`.\n\n` +
            `Note: the parenthesis are only required in this exact scenario where an ambiguity is present – where ` +
            `\`${name}\` referes to a global helper (as opposed to a local variable), AND ` +
            `the \`${name}\` helper invocation does not take any arguments, AND ` +
            `this occurs in a named argument position of a component invocation.\n\n` +
            `We expect this combination to be quite rare, as most helpers require at least one argument. ` +
            `There is no need to refactor helper invocations in cases where this deprecation was not triggered.`,
          false,
          {
            id: 'argument-less-helper-paren-less-invocation',
          }
        );

        Call(op, handle, null, null);
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

EXPRESSIONS.add(SexpOpcodes.Log, (op, [, positional]) => {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, null, false);
  op(Op.Log);
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
});
