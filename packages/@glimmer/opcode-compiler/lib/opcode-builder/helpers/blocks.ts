import {
  BuilderOp,
  CompilableBlock,
  MachineOp,
  Op,
  Option,
  StatementCompileActions,
  SymbolTable,
  WireFormat,
} from '@glimmer/interfaces';
import { $fp } from '@glimmer/vm';
import { op } from '../encoder';
import { PushPrimitive } from './vm';
import { serializable } from '../operands';

/**
 * Yield to a block located at a particular symbol location.
 *
 * @param to the symbol containing the block to yield to
 * @param params optional block parameters to yield to the block
 */
export function YieldBlock(
  to: number,
  params: Option<WireFormat.Core.Params>
): StatementCompileActions {
  return [
    op('SimpleArgs', { params, hash: null, atNames: true }),
    op(Op.GetBlock, to),
    op(Op.JitSpreadBlock),
    op('Option', op('JitCompileBlock')),
    op(Op.InvokeYield),
    op(Op.PopScope),
    op(MachineOp.PopFrame),
  ];
}

/**
 * Push an (optional) yieldable block onto the stack. The yieldable block must be known
 * statically at compile time.
 *
 * @param block An optional Compilable block
 */
export function PushYieldableBlock(block: Option<CompilableBlock>): StatementCompileActions {
  return [
    PushSymbolTable(block && block.symbolTable),
    op(Op.PushBlockScope),
    op('PushCompilable', block),
  ];
}

/**
 * Invoke a block that is known statically at compile time.
 *
 * @param block a Compilable block
 */
export function InvokeStaticBlock(block: CompilableBlock): StatementCompileActions {
  return [
    op(MachineOp.PushFrame),
    op('PushCompilable', block),
    op('JitCompileBlock'),
    op(MachineOp.InvokeVirtual),
    op(MachineOp.PopFrame),
  ];
}

/**
 * Invoke a static block, preserving some number of stack entries for use in
 * updating.
 *
 * @param block A compilable block
 * @param callerCount A number of stack entries to preserve
 */
export function InvokeStaticBlockWithStack(
  block: CompilableBlock,
  callerCount: number
): StatementCompileActions {
  let { parameters } = block.symbolTable;
  let calleeCount = parameters.length;
  let count = Math.min(callerCount, calleeCount);

  if (count === 0) {
    return InvokeStaticBlock(block);
  }

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

export function PushSymbolTable(table: Option<SymbolTable>): BuilderOp {
  if (table) {
    return op(Op.PushSymbolTable, serializable(table));
  } else {
    return PushPrimitive(null);
  }
}
