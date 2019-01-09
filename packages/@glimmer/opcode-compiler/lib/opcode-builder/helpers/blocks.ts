import {
  BuilderOp,
  CompilableBlock,
  CompilableTemplate,
  MachineOp,
  Op,
  Option,
  StatementCompileActions,
  SymbolTable,
  WireFormat,
} from '@glimmer/interfaces';
import { $fp } from '@glimmer/vm';
import { op } from '../encoder';
import { primitive } from './vm';
import { serializable } from '../operands';

export function yieldBlock(
  to: number,
  params: Option<WireFormat.Core.Params>
): StatementCompileActions {
  return [
    op('SimpleArgs', { params, hash: null, atNames: true }),
    op(Op.GetBlock, to),
    op('Option', op('JitCompileBlock')),
    op(Op.InvokeYield),
    op(Op.PopScope),
    op(MachineOp.PopFrame),
  ];
}

export function pushYieldableBlock(block: Option<CompilableTemplate>): StatementCompileActions {
  return [
    pushSymbolTable(block && block.symbolTable),
    op(Op.PushBlockScope),
    op('PushCompilable', block),
  ];
}

export function invokeStaticBlock(block: CompilableBlock): StatementCompileActions {
  return [
    op(MachineOp.PushFrame),
    op('PushCompilable', block),
    op('JitCompileBlock'),
    op(MachineOp.InvokeVirtual),
    op(MachineOp.PopFrame),
  ];
}

export function invokeStaticBlockWithStack(
  block: CompilableBlock,
  callerCount: number
): StatementCompileActions {
  let { parameters } = block.symbolTable;
  let calleeCount = parameters.length;
  let count = Math.min(callerCount, calleeCount);

  let out: StatementCompileActions = [];

  out.push(op(MachineOp.PushFrame));

  if (count) {
    out.push(op(Op.ChildScope));

    for (let i = 0; i < count; i++) {
      out.push(op(Op.Dup, $fp, callerCount - i));
      out.push(op(Op.SetVariable, parameters[i]));
    }
  }

  out.push(op('PushCompilable', block));
  out.push(op('JitCompileBlock'));
  out.push(op(MachineOp.InvokeVirtual));

  if (count) {
    out.push(op(Op.PopScope));
  }

  out.push(op(MachineOp.PopFrame));

  return out;
}

export function pushSymbolTable(table: Option<SymbolTable>): BuilderOp {
  if (table) {
    return op(Op.PushSymbolTable, serializable(table));
  } else {
    return primitive(null);
  }
}
