import {
  HighLevelBuilderOp,
  HighLevelBuilderOpcode,
  OptionOp,
  CompileActions,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { exhausted } from '@glimmer/util';
import { op as _op } from '../opcode-builder/encoder';
import { concat, NONE } from './concat';

export default function pushBuilderOp(
  context: TemplateCompilationContext,
  op: HighLevelBuilderOp
): void {
  let { encoder } = context;

  switch (op.op) {
    case HighLevelBuilderOpcode.Option:
      return concat(context, option(op));
    case HighLevelBuilderOpcode.Label:
      return encoder.label(op.op1);
    case HighLevelBuilderOpcode.StartLabels:
      return encoder.startLabels();
    case HighLevelBuilderOpcode.StopLabels:
      return encoder.stopLabels();
    default:
      return exhausted(op);
  }
}

function option(op: OptionOp): CompileActions {
  let value = op.op1;

  return value === null ? NONE : value;
}
