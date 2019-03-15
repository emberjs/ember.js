import {
  HighLevelBuilderOp,
  HighLevelBuilderOpcode,
  CompileMode,
  Op,
  OptionOp,
  CompileActions,
  CompileAction,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { exhausted } from '@glimmer/util';
import { op } from '../opcode-builder/encoder';
import { concat, NONE } from './concat';

export default function pushBuilderOp(
  context: TemplateCompilationContext,
  op: HighLevelBuilderOp
): void {
  let {
    encoder,
    syntax: {
      program: { mode, constants },
    },
  } = context;

  switch (op.op) {
    case HighLevelBuilderOpcode.Option:
      return concat(context, option(op));
    case HighLevelBuilderOpcode.Label:
      return encoder.label(op.op1);
    case HighLevelBuilderOpcode.StartLabels:
      return encoder.startLabels();
    case HighLevelBuilderOpcode.StopLabels:
      return encoder.stopLabels();
    case HighLevelBuilderOpcode.JitCompileBlock:
      return concat(context, jitCompileBlock(mode));
    case HighLevelBuilderOpcode.GetComponentLayout:
      return encoder.push(constants, compileLayoutOpcode(mode), op.op1);
    case HighLevelBuilderOpcode.SetBlock:
      return encoder.push(constants, setBlock(mode), op.op1);

    default:
      return exhausted(op);
  }
}

function option(op: OptionOp): CompileActions {
  let value = op.op1;

  return value === null ? NONE : value;
}

function compileLayoutOpcode(mode: CompileMode): Op {
  return mode === CompileMode.aot ? Op.GetAotComponentLayout : Op.GetJitComponentLayout;
}

function jitCompileBlock(mode: CompileMode): CompileAction {
  return mode === CompileMode.jit ? op(Op.CompileBlock) : NONE;
}

function setBlock(mode: CompileMode): Op {
  return mode === CompileMode.aot ? Op.SetAotBlock : Op.SetJitBlock;
}
