import {
  CompileTimeConstants,
  CompileTimeResolver,
  ContainingMetadata,
  Encoder,
  ExpressionCompileActions,
  HighLevelResolutionOp,
  HighLevelResolutionOpcode,
  IfResolvedOp,
  Op,
  Option,
  ResolveHandle,
  TemplateCompilationContext,
  Owner,
  WireFormat,
} from '@glimmer/interfaces';
import { expect, emptyArray, EMPTY_STRING_ARRAY, exhausted } from '@glimmer/util';
import { error, op } from '../opcode-builder/encoder';
import { CompilePositional } from '../opcode-builder/helpers/shared';
import { Call, PushPrimitive } from '../opcode-builder/helpers/vm';
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
      concatExpressions(encoder, context, expr(operation.op1, context.meta), constants);
      break;
    case HighLevelResolutionOpcode.IfResolved: {
      concatExpressions(encoder, context, ifResolved(context, operation), constants);
      break;
    }
    case HighLevelResolutionOpcode.ResolveFree: {
      throw new Error('Unimplemented HighLevelResolutionOpcode.ResolveFree');
    }

    case HighLevelResolutionOpcode.ResolveAmbiguous: {
      let { upvar, allowComponents } = operation.op1;
      let resolver = context.syntax.program.resolver;
      let name = context.meta.upvars![upvar];

      let resolvedHelper = resolver.lookupHelper(
        name,
        expect(context.meta.owner, 'BUG: expected owner when resolving helper')
      );
      let expressions: ExpressionCompileActions;

      if (resolvedHelper) {
        expressions = Call({ handle: resolvedHelper, params: null, hash: null });
      } else {
        if (allowComponents) {
          let resolvedComponent = resolver.lookupComponent(
            name,
            expect(context.meta.owner, 'BUG: expected owner when resolving helper')
          );

          if (resolvedComponent) {
            throw new Error(`unimplemented {{component-name}}`);
          }
        }

        expressions = [op(Op.GetVariable, 0), op(Op.GetProperty, name)];
      }

      concatExpressions(encoder, context, expressions, constants);

      break;
    }

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

function ifResolved(
  context: TemplateCompilationContext,
  { op1 }: IfResolvedOp
): ExpressionCompileActions {
  let { kind, name, andThen, span } = op1;

  let resolved = resolve(context.syntax.program.resolver, kind, name, context.meta.owner);

  if (resolved !== null) {
    return andThen(resolved);
  } else {
    return error(`Unexpected ${kind} ${name}`, span.start, span.end);
  }
}

function resolve(
  resolver: CompileTimeResolver,
  kind: ResolveHandle,
  name: string,
  owner: Owner | null
): Option<number> {
  switch (kind) {
    case ResolveHandle.Modifier:
      return resolver.lookupModifier(
        name,
        expect(owner, 'BUG: expected owner when resolving modifier')
      );
    case ResolveHandle.Helper:
      return resolver.lookupHelper(
        name,
        expect(owner, 'BUG: expected owner when resolving helper')
      );
    case ResolveHandle.ComponentDefinition: {
      let component = resolver.lookupComponent(
        name,
        expect(owner, 'BUG: expected owner when resolving component')
      );
      return component && component.handle;
    }
  }
}
