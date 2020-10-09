import {
  CompileActions,
  Encoder,
  ExpressionCompileActions,
  NO_ACTION,
  StatementCompileActions,
  Unhandled,
  Dict,
  TemplateCompilationContext,
  CompileTimeConstants,
  HighLevelOpcodeType,
} from '@glimmer/interfaces';
import pushBuilderOp from './push-builder';
import pushCompileOp from './push-compile';
import pushOp from './push-op';
import pushResolutionOp from './push-resolution';
import { assertNever } from '@glimmer/util';

export const NONE: NO_ACTION = { 'no-action': true };
export const UNHANDLED: Unhandled = { 'not-handled': true };

export function isNoAction(
  actions: CompileActions | StatementCompileActions
): actions is NO_ACTION {
  return actions && !!(actions as Dict)['no-action'];
}

export function isHandled(
  actions: CompileActions | StatementCompileActions | Unhandled
): actions is CompileActions | StatementCompileActions {
  return !actions || !(actions as Dict)['not-handled'];
}

export function concat(context: TemplateCompilationContext, action: CompileActions): void {
  if (isNoAction(action)) {
    return;
  } else if (Array.isArray(action)) {
    for (let item of action) {
      concat(context, item);
    }
  } else if (action.type === HighLevelOpcodeType.Builder) {
    pushBuilderOp(context, action);
  } else {
    pushOp(context.encoder, context.syntax.program.constants, action);
  }
}

export function concatExpressions(
  encoder: Encoder,
  context: TemplateCompilationContext,
  action: ExpressionCompileActions,
  constants: CompileTimeConstants
): void {
  if (isNoAction(action)) {
    return;
  } else if (Array.isArray(action)) {
    for (let item of action) {
      concatExpressions(encoder, context, item, constants);
    }
  } else if (action.type === HighLevelOpcodeType.OpcodeWrapper) {
    pushOp(encoder, constants, action);
  } else if (action.type === HighLevelOpcodeType.Resolution) {
    pushResolutionOp(encoder, context, action, constants);
  } else if (action.type === HighLevelOpcodeType.Builder) {
    pushBuilderOp(context, action);
  } else if (action.type === HighLevelOpcodeType.Error) {
    encoder.error({
      problem: action.op1.problem,
      span: {
        start: action.op1.start,
        end: action.op1.end,
      },
    });
  } else {
    throw assertNever(action, 'unexpected action kind');
  }
}

export function concatStatements(
  context: TemplateCompilationContext,
  action: StatementCompileActions
): void {
  if (isNoAction(action)) {
    return;
  } else if (Array.isArray(action)) {
    for (let item of action) {
      concatStatements(context, item);
    }
  } else if (action.type === HighLevelOpcodeType.OpcodeWrapper) {
    pushOp(context.encoder, context.syntax.program.constants, action);
  } else {
    if (action.type === HighLevelOpcodeType.Compile) {
      pushCompileOp(context, action);
    } else if (action.type === HighLevelOpcodeType.Resolution) {
      pushResolutionOp(context.encoder, context, action, context.syntax.program.constants);
    } else if (action.type === HighLevelOpcodeType.Builder) {
      pushBuilderOp(context, action);
    } else if (action.type === HighLevelOpcodeType.Error) {
    } else {
      throw assertNever(action, `unexpected action type`);
    }
  }
}
