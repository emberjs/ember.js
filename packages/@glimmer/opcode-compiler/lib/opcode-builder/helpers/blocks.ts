import type { Nullable, WireFormat } from '@glimmer/interfaces';
import {
  VM_CHILD_SCOPE_OP,
  VM_COMPILE_BLOCK_OP,
  VM_CONSTANT_OP,
  VM_DUP_OP,
  VM_GET_BLOCK_OP,
  VM_INVOKE_VIRTUAL_OP,
  VM_INVOKE_YIELD_OP,
  VM_POP_FRAME_OP,
  VM_POP_SCOPE_OP,
  VM_PUSH_BLOCK_SCOPE_OP,
  VM_PUSH_FRAME_OP,
  VM_PUSH_SYMBOL_TABLE_OP,
  VM_SET_VARIABLE_OP,
  VM_SPREAD_BLOCK_OP,
} from '@glimmer/constants';
import { $fp } from '@glimmer/vm';

import type { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';

import { blockOperand, symbolTableOperand } from '../operands';
import { SimpleArgs } from './shared';
import { PushPrimitive } from './vm';

/**
 * Yield to a block located at a particular symbol location.
 *
 * @param to the symbol containing the block to yield to
 * @param params optional block parameters to yield to the block
 */
export function YieldBlock(
  op: PushStatementOp,
  to: number,
  positional: Nullable<WireFormat.Core.Params>
): void {
  SimpleArgs(op, positional, null, true);
  op(VM_GET_BLOCK_OP, to);
  op(VM_SPREAD_BLOCK_OP);
  op(VM_COMPILE_BLOCK_OP);
  op(VM_INVOKE_YIELD_OP);
  op(VM_POP_SCOPE_OP);
  op(VM_POP_FRAME_OP);
}

/**
 * Push an (optional) yieldable block onto the stack. The yieldable block must be known
 * statically at compile time.
 *
 * @param block An optional Compilable block
 */
export function PushYieldableBlock(
  op: PushStatementOp,
  block: Nullable<WireFormat.SerializedInlineBlock>
): void {
  PushSymbolTable(op, block && block[1]);
  op(VM_PUSH_BLOCK_SCOPE_OP);
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
  op(VM_PUSH_FRAME_OP);
  PushCompilable(op, block);
  op(VM_COMPILE_BLOCK_OP);
  op(VM_INVOKE_VIRTUAL_OP);
  op(VM_POP_FRAME_OP);
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

  op(VM_PUSH_FRAME_OP);

  if (count) {
    op(VM_CHILD_SCOPE_OP);

    for (let i = 0; i < count; i++) {
      op(VM_DUP_OP, $fp, callerCount - i);
      op(VM_SET_VARIABLE_OP, parameters[i]);
    }
  }

  PushCompilable(op, block);
  op(VM_COMPILE_BLOCK_OP);
  op(VM_INVOKE_VIRTUAL_OP);

  if (count) {
    op(VM_POP_SCOPE_OP);
  }

  op(VM_POP_FRAME_OP);
}

export function PushSymbolTable(op: PushExpressionOp, parameters: number[] | null): void {
  if (parameters !== null) {
    op(VM_PUSH_SYMBOL_TABLE_OP, symbolTableOperand({ parameters }));
  } else {
    PushPrimitive(op, null);
  }
}

export function PushCompilable(
  op: PushExpressionOp,
  _block: Nullable<WireFormat.SerializedInlineBlock>
): void {
  if (_block === null) {
    PushPrimitive(op, null);
  } else {
    op(VM_CONSTANT_OP, blockOperand(_block));
  }
}
