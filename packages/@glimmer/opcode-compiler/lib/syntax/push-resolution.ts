import { DEBUG } from '@glimmer/env';
import {
  CompileTimeConstants,
  ContainingMetadata,
  Encoder,
  ExpressionCompileActions,
  Expressions,
  HighLevelResolutionOp,
  HighLevelResolutionOpcode,
  Op,
  Option,
  ResolveComponentOp,
  ResolveComponentOrHelperOp,
  ResolveHelperOp,
  ResolveModifierOp,
  ResolveOptionalComponentOrHelperOp,
  ResolveOptionalHelperOp,
  SexpOpcodes,
  TemplateCompilationContext,
  WireFormat,
} from '@glimmer/interfaces';
import { assert, emptyArray, EMPTY_STRING_ARRAY, exhausted, expect } from '@glimmer/util';
import { op } from '../opcode-builder/encoder';
import { CompilePositional } from '../opcode-builder/helpers/shared';
import { PushPrimitive } from '../opcode-builder/helpers/vm';
import { strArray } from '../opcode-builder/operands';
import { concatExpressions } from './concat';
import { EXPRESSIONS } from './expressions';

export default function pushResolutionOp(
  encoder: Encoder,
  context: TemplateCompilationContext,
  operation: HighLevelResolutionOp,
  constants: CompileTimeConstants
): void {
  switch (operation.op) {
    case HighLevelResolutionOpcode.Expr:
      return concatExpressions(encoder, context, expr(operation.op1, context.meta), constants);

    case HighLevelResolutionOpcode.ResolveComponent:
      return concatExpressions(encoder, context, resolveComponent(context, operation), constants);

    case HighLevelResolutionOpcode.ResolveModifier:
      return concatExpressions(encoder, context, resolveModifier(context, operation), constants);

    case HighLevelResolutionOpcode.ResolveHelper:
      return concatExpressions(encoder, context, resolveHelper(context, operation), constants);

    case HighLevelResolutionOpcode.ResolveComponentOrHelper:
      return concatExpressions(
        encoder,
        context,
        resolveComponentOrHelper(context, operation),
        constants
      );

    case HighLevelResolutionOpcode.ResolveOptionalHelper:
      return concatExpressions(
        encoder,
        context,
        resolveOptionalHelper(context, operation),
        constants
      );

    case HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper:
      return concatExpressions(
        encoder,
        context,
        resolveOptionalComponentOrHelper(context, operation),
        constants
      );

    case HighLevelResolutionOpcode.ResolveFree:
      throw new Error('Unimplemented HighLevelResolutionOpcode.ResolveFree');

    default:
      return exhausted(operation);
  }
}

export function expr(
  expression: WireFormat.Expression,
  meta: ContainingMetadata
): ExpressionCompileActions {
  if (Array.isArray(expression)) {
    return EXPRESSIONS.compile(expression, meta);
  } else {
    return [PushPrimitive(expression), op(Op.PrimitiveReference)];
  }
}

export function compileSimpleArgs(
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  atNames: boolean
): ExpressionCompileActions {
  let out: ExpressionCompileActions = [];

  let { count, actions } = CompilePositional(params);

  out.push(actions);

  let flags = count << 4;

  if (atNames) flags |= 0b1000;

  let names = emptyArray<string>();

  if (hash) {
    names = hash[0];
    let val = hash[1];
    for (let i = 0; i < val.length; i++) {
      out.push(op(HighLevelResolutionOpcode.Expr, val[i]));
    }
  }

  out.push(op(Op.PushArgs, strArray(names), strArray(EMPTY_STRING_ARRAY), flags));

  return out;
}

function isGetLikeTuple(opcode: Expressions.Expression): opcode is Expressions.TupleExpression {
  return Array.isArray(opcode) && opcode.length === 2;
}

function makeTypeVerifier(typeToVerify: SexpOpcodes) {
  return (opcode: Expressions.Expression): opcode is Expressions.GetFree => {
    if (!isGetLikeTuple(opcode)) return false;

    let type = opcode[0];

    if (DEBUG && type === SexpOpcodes.GetStrictFree) {
      throw new Error('Attempted to resolve strict free, but this has not been implemented yet');
    }

    return type === SexpOpcodes.GetStrictFree || type === typeToVerify;
  };
}

export const isGetFreeComponent = makeTypeVerifier(SexpOpcodes.GetFreeAsComponentHead);

export const isGetFreeModifier = makeTypeVerifier(SexpOpcodes.GetFreeAsModifierHead);

export const isGetFreeHelper = makeTypeVerifier(SexpOpcodes.GetFreeAsHelperHead);

export const isGetFreeComponentOrHelper = makeTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHead
);

export const isGetFreeOptionalHelper = makeTypeVerifier(
  SexpOpcodes.GetFreeAsHelperHeadOrThisFallback
);

export const isGetFreeOptionalComponentOrHelper = makeTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback
);

function resolveComponent(
  { program: { resolver }, meta }: TemplateCompilationContext,
  { op1 }: ResolveComponentOp
): ExpressionCompileActions {
  let { expr, then } = op1;

  assert(isGetFreeComponent(expr), 'Attempted to resolve a component with incorrect opcode');
  assert(meta.upvars, 'Attempted to resolve a component, but no free vars were found');

  let name = meta.upvars[expr[1]];
  let value = resolver.lookupComponent(
    name,
    expect(meta.owner, 'expected owner when resolving value')
  );

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  return then(value!);
}

function resolveHelper(
  { program: { resolver }, meta }: TemplateCompilationContext,
  { op1 }: ResolveHelperOp
): ExpressionCompileActions {
  let { expr, then } = op1;

  assert(isGetFreeHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  assert(meta.upvars, 'Attempted to resolve a helper, but no free vars were found');

  let name = meta.upvars[expr[1]];
  let value = resolver.lookupHelper(
    name,
    expect(meta.owner, 'expected owner when resolving value')
  );

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  return then(value!);
}

function resolveModifier(
  { program: { resolver }, meta }: TemplateCompilationContext,
  { op1 }: ResolveModifierOp
) {
  let { expr, then } = op1;

  assert(isGetFreeModifier(expr), 'Attempted to resolve a modifier with incorrect opcode');
  assert(meta.upvars, 'Attempted to resolve a modifier, but no free vars were found');

  let name = meta.upvars[expr[1]];
  let value = resolver.lookupModifier(
    name,
    expect(meta.owner, 'expected owner when resolving value')
  );

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  return then(value!);
}

function resolveComponentOrHelper(
  { program: { resolver }, meta }: TemplateCompilationContext,
  { op1 }: ResolveComponentOrHelperOp
) {
  let { expr, then } = op1;

  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve a component or helper with incorrect opcode'
  );
  assert(meta.upvars, 'Attempted to resolve a component or helper, but no free vars were found');

  let name = meta.upvars[expr[1]];
  let value =
    resolver.lookupComponent(name, expect(meta.owner, 'expected owner when resolving value')) ||
    resolver.lookupHelper(name, expect(meta.owner, 'expected owner when resolving value'));

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component or helper, but nothing was found.`
    );
  }

  return then(value!);
}

function resolveOptionalHelper(
  { program: { resolver }, meta }: TemplateCompilationContext,
  { op1 }: ResolveOptionalHelperOp
) {
  let { expr, then } = op1;

  assert(isGetFreeOptionalHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  assert(meta.upvars, 'Attempted to resolve a component or helper, but no free vars were found');

  let name = meta.upvars[expr[1]];
  let value = resolver.lookupHelper(
    name,
    expect(meta.owner, 'expected owner when resolving value')
  );

  return then(value || name);
}

function resolveOptionalComponentOrHelper(
  { program: { resolver }, meta }: TemplateCompilationContext,
  { op1 }: ResolveOptionalComponentOrHelperOp
) {
  let { expr, then } = op1;

  assert(
    isGetFreeOptionalComponentOrHelper(expr),
    'Attempted to resolve an optional component or helper with incorrect opcode'
  );
  assert(
    meta.upvars,
    'Attempted to resolve an optional component or helper, but no free vars were found'
  );

  let name = meta.upvars[expr[1]];
  let value =
    resolver.lookupComponent(name, expect(meta.owner, 'expected owner when resolving value')) ||
    resolver.lookupHelper(name, expect(meta.owner, 'expected owner when resolving value'));

  return then(value || name);
}
