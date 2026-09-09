import type { CurriedType, NonSmallIntOperand, Nullable, WireFormat } from '@glimmer/interfaces';
import { encodeImmediate, isSmallInt } from '@glimmer/constants/lib/immediate';
import { CAPTURE_ARGS_OP } from '@glimmer/runtime/lib/compiled/opcodes/component';
import {
  CURRY_OP,
  DYNAMIC_HELPER_OP,
  HELPER_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/expressions';
import {
  BIND_DYNAMIC_SCOPE_OP,
  DUP_OP,
  FETCH_OP,
  POP_DYNAMIC_SCOPE_OP,
  POP_OP,
  PRIMITIVE_OP,
  PRIMITIVE_REFERENCE_OP,
  PUSH_DYNAMIC_SCOPE_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/vm';
import { VM_POP_FRAME_OP, VM_PUSH_FRAME_OP } from '@glimmer/constants/lib/vm-ops';
import { $fp, $v0 } from '@glimmer/vm/lib/registers';

import type { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';

import { isStrictMode, nonSmallIntOperand } from '../operands';
import { expr } from './expr';
import { SimpleArgs } from './shared';

export type Primitive = undefined | null | boolean | number | string;

export interface CompileHelper {
  handle: number;
  positional: Nullable<WireFormat.Core.Params>;
  named: WireFormat.Core.Hash;
}

/**
 * Push a reference onto the stack corresponding to a statically known primitive
 * @param value A JavaScript primitive (undefined, null, boolean, number or string)
 */
export function PushPrimitiveReference(op: PushExpressionOp, value: Primitive): void {
  PushPrimitive(op, value);
  op(PRIMITIVE_REFERENCE_OP);
}

/**
 * Push an encoded representation of a JavaScript primitive on the stack
 *
 * @param value A JavaScript primitive (undefined, null, boolean, number or string)
 */
export function PushPrimitive(op: PushExpressionOp, primitive: Primitive): void {
  let p: Primitive | NonSmallIntOperand = primitive;

  if (typeof p === 'number') {
    p = isSmallInt(p) ? encodeImmediate(p) : nonSmallIntOperand(p);
  }

  op(PRIMITIVE_OP, p);
}

/**
 * Invoke a foreign function (a "helper") based on a statically known handle
 *
 * @param op The op creation function
 * @param handle A handle
 * @param positional An optional list of expressions to compile
 * @param named An optional list of named arguments (name + expression) to compile
 */
export function Call(
  op: PushExpressionOp,
  handle: number,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash
): void {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, named, false);
  op(HELPER_OP, handle);
  op(VM_POP_FRAME_OP);
  op(FETCH_OP, $v0);
}

/**
 * Invoke a foreign function (a "helper") based on a dynamically loaded definition
 *
 * @param op The op creation function
 * @param positional An optional list of expressions to compile
 * @param named An optional list of named arguments (name + expression) to compile
 */
export function CallDynamic(
  op: PushExpressionOp,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash,
  append?: () => void
): void {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, named, false);
  op(DUP_OP, $fp, 1);
  op(DYNAMIC_HELPER_OP);
  if (append) {
    op(FETCH_OP, $v0);
    append();
    op(VM_POP_FRAME_OP);
    op(POP_OP, 1);
  } else {
    op(VM_POP_FRAME_OP);
    op(POP_OP, 1);
    op(FETCH_OP, $v0);
  }
}

/**
 * Evaluate statements in the context of new dynamic scope entries. Move entries from the
 * stack into named entries in the dynamic scope, then evaluate the statements, then pop
 * the dynamic scope
 *
 * @param names a list of dynamic scope names
 * @param block a function that returns a list of statements to evaluate
 */
export function DynamicScope(op: PushStatementOp, names: string[], block: () => void): void {
  op(PUSH_DYNAMIC_SCOPE_OP);
  op(BIND_DYNAMIC_SCOPE_OP, names);
  block();
  op(POP_DYNAMIC_SCOPE_OP);
}

export function Curry(
  op: PushExpressionOp,
  type: CurriedType,
  definition: WireFormat.Expression,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash
): void {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, named, false);
  op(CAPTURE_ARGS_OP);
  expr(op, definition);
  op(CURRY_OP, type, isStrictMode());
  op(VM_POP_FRAME_OP);
  op(FETCH_OP, $v0);
}
