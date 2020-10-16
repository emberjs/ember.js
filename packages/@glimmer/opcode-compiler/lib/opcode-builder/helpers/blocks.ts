import { MachineOp, Op, Option, WireFormat } from '@glimmer/interfaces';
import { $fp } from '@glimmer/vm';
import { PushPrimitive } from './vm';
import { blockOperand, symbolTableOperand } from '../operands';
import { SimpleArgs } from './shared';
import { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';

/**
 * Yield to a block located at a particular symbol location.
 *
 * @param to the symbol containing the block to yield to
 * @param params optional block parameters to yield to the block
 */
export function YieldBlock(
  op: PushStatementOp,
  to: number,
  positional: Option<WireFormat.Core.Params>
): void {
  SimpleArgs(op, positional, null, true);
  op(Op.GetBlock, to);
  op(Op.SpreadBlock);
  op(Op.CompileBlock);
  op(Op.InvokeYield);
  op(Op.PopScope);
  op(MachineOp.PopFrame);
}

/**
 * Push an (optional) yieldable block onto the stack. The yieldable block must be known
 * statically at compile time.
 *
 * @param block An optional Compilable block
 */
export function PushYieldableBlock(
  op: PushStatementOp,
  block: Option<WireFormat.SerializedInlineBlock>
): void {
  PushSymbolTable(op, block && block[1]);
  op(Op.PushBlockScope);
  PushCompilable(op, block);
}

/**
 * Invoke a block that is known statically at compile time.
 *
 * @param block a Compilable block
 */
export function InvokeStaticBlock(
  op: PushStatementOp,
  block: WireFormat.SerializedInlineBlock
): void {
  op(MachineOp.PushFrame);
  PushCompilable(op, block);
  op(Op.CompileBlock);
  op(MachineOp.InvokeVirtual);
  op(MachineOp.PopFrame);
}

/**
 * Invoke a static block, preserving some number of stack entries for use in
 * updating.
 *
 * @param block A compilable block
 * @param callerCount A number of stack entries to preserve
 */
export function InvokeStaticBlockWithStack(
  op: PushStatementOp,
  block: WireFormat.SerializedInlineBlock,
  callerCount: number
): void {
  let parameters = block[1];
  let calleeCount = parameters.length;
  let count = Math.min(callerCount, calleeCount);

  if (count === 0) {
    InvokeStaticBlock(op, block);
    return;
  }

  op(MachineOp.PushFrame);

  if (count) {
    op(Op.ChildScope);

    for (let i = 0; i < count; i++) {
      op(Op.Dup, $fp, callerCount - i);
      op(Op.SetVariable, parameters[i]);
    }
  }

  PushCompilable(op, block);
  op(Op.CompileBlock);
  op(MachineOp.InvokeVirtual);

  if (count) {
    op(Op.PopScope);
  }

  op(MachineOp.PopFrame);
}

export function PushSymbolTable(op: PushExpressionOp, parameters: number[] | null): void {
  if (parameters !== null) {
    op(Op.PushSymbolTable, symbolTableOperand({ parameters }));
  } else {
    PushPrimitive(op, null);
  }
}

export function PushCompilable(
  op: PushExpressionOp,
  _block: Option<WireFormat.SerializedInlineBlock>
): void {
  if (_block === null) {
    PushPrimitive(op, null);
  } else {
    op(Op.Constant, blockOperand(_block));
  }
}
