import {
  HighLevelBuilderOp,
  HighLevelBuilderOpcode,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { exhausted } from '@glimmer/util';
import { op as _op } from '../opcode-builder/encoder';

export default function pushBuilderOp(
  context: TemplateCompilationContext,
  op: HighLevelBuilderOp
): void {
  let { encoder } = context;

  switch (op.op) {
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
