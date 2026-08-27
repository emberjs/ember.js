import type { Nullable, WireFormat } from '@glimmer/interfaces';
import {
  GET_BLOCK_OP,
  SET_VARIABLE_OP,
  SPREAD_BLOCK_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/expressions';
import {
  CHILD_SCOPE_OP,
  COMPILE_BLOCK_OP,
  CONSTANT_OP,
  DUP_OP,
  INVOKE_YIELD_OP,
  POP_SCOPE_OP,
  PUSH_BLOCK_SCOPE_OP,
  PUSH_SYMBOL_TABLE_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/vm';
import {
  VM_INVOKE_VIRTUAL_OP,
  VM_POP_FRAME_OP,
  VM_PUSH_FRAME_OP,
} from '@glimmer/constants/lib/vm-ops';
import { $fp } from '@glimmer/vm/lib/registers';

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
  op(GET_BLOCK_OP, to);
  op(SPREAD_BLOCK_OP);
  op(COMPILE_BLOCK_OP);
  op(INVOKE_YIELD_OP);
  op(POP_SCOPE_OP);
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
  op(PUSH_BLOCK_SCOPE_OP);
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
  op(COMPILE_BLOCK_OP);
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
    op(CHILD_SCOPE_OP);

    for (let i = 0; i < count; i++) {
      op(DUP_OP, $fp, callerCount - i);
      op(SET_VARIABLE_OP, parameters[i]);
    }
  }

  PushCompilable(op, block);
  op(COMPILE_BLOCK_OP);
  op(VM_INVOKE_VIRTUAL_OP);

  if (count) {
    op(POP_SCOPE_OP);
  }

  op(VM_POP_FRAME_OP);
}

export function PushSymbolTable(op: PushExpressionOp, parameters: number[] | null): void {
  if (parameters !== null) {
    op(PUSH_SYMBOL_TABLE_OP, symbolTableOperand({ parameters }));
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
    op(CONSTANT_OP, blockOperand(_block));
  }
}
