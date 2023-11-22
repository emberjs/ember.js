import type { CurriedType, NonSmallIntOperand, Nullable, WireFormat } from '@glimmer/interfaces';
import { encodeImmediate, isSmallInt } from '@glimmer/util';
import { $fp, $v0, MachineOp, Op } from '@glimmer/vm';

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
  op(Op.PrimitiveReference);
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

  op(Op.Primitive, p);
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
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.Helper, handle);
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
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
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.Dup, $fp, 1);
  op(Op.DynamicHelper);
  if (append) {
    op(Op.Fetch, $v0);
    append();
    op(MachineOp.PopFrame);
    op(Op.Pop, 1);
  } else {
    op(MachineOp.PopFrame);
    op(Op.Pop, 1);
    op(Op.Fetch, $v0);
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
  op(Op.PushDynamicScope);
  op(Op.BindDynamicScope, names);
  block();
  op(Op.PopDynamicScope);
}

export function Curry(
  op: PushExpressionOp,
  type: CurriedType,
  definition: WireFormat.Expression,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash
): void {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.CaptureArgs);
  expr(op, definition);
  op(Op.Curry, type, isStrictMode());
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
}
