import type { CurriedType, NonSmallIntOperand, Nullable, WireFormat } from '@glimmer/interfaces';
import { encodeImmediate, isSmallInt } from '@glimmer/constants/lib/immediate';
import {
  VM_BIND_DYNAMIC_SCOPE_OP,
  VM_CAPTURE_ARGS_OP,
  VM_CURRY_OP,
  VM_DUP_OP,
  VM_DYNAMIC_HELPER_OP,
  VM_FETCH_OP,
  VM_HELPER_OP,
  VM_POP_DYNAMIC_SCOPE_OP,
  VM_POP_OP,
  VM_PRIMITIVE_OP,
  VM_PRIMITIVE_REFERENCE_OP,
  VM_PUSH_DYNAMIC_SCOPE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import { VM_POP_FRAME_OP, VM_PUSH_FRAME_OP } from '@glimmer/constants/lib/vm-ops';
import { $fp, $v0 } from '@glimmer/vm/lib/registers';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

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
  op(VM_PRIMITIVE_REFERENCE_OP);
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

  op(VM_PRIMITIVE_OP, p);
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
  op(VM_HELPER_OP, handle);
  op(VM_POP_FRAME_OP);
  op(VM_FETCH_OP, $v0);
}

/**
 * Invoke a foreign function (a "helper") based on a dynamically loaded definition
 *
 * @param op The op creation function
 * @param positional An optional list of expressions to compile
 * @param named An optional list of named arguments (name + expression) to compile
 */
/**
 * The syntactic receiver of a call, i.e. the object a member-call's `this` should be:
 * `this.obj.method` → `this.obj`. Returns `null` when the callee has no syntactic
 * receiver (a bare variable/argument like `@cb`), so that passing a function as an
 * argument and then invoking it is unbound — matching JS `const f = obj.m; f()`.
 *
 * This is deliberately a *syntactic* question about the call site, independent of how
 * the callee reference happens to have been derived.
 */
export function receiverExpressionFor(
  expression: WireFormat.Expression
): Nullable<WireFormat.Expression> {
  if (!Array.isArray(expression)) return null;

  let [opcode, symbol, path] = expression as [number, number, (readonly string[])?];

  if (opcode !== SexpOpcodes.GetSymbol && opcode !== SexpOpcodes.GetLexicalSymbol) {
    return null;
  }

  if (!Array.isArray(path) || path.length === 0) {
    return null;
  }

  return [opcode, symbol, path.slice(0, -1)] as unknown as WireFormat.Expression;
}

export function CallDynamic(
  op: PushExpressionOp,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash,
  receiver: Nullable<WireFormat.Expression>,
  append?: () => void
): void {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, named, false);
  op(VM_DUP_OP, $fp, 1);
  // Push the syntactic receiver so the callee is invoked with it as `this`
  // (`undefined` when there is none, e.g. `(@cb)`).
  if (receiver) {
    expr(op, receiver);
  } else {
    PushPrimitiveReference(op, undefined);
  }
  op(VM_DYNAMIC_HELPER_OP);
  if (append) {
    op(VM_FETCH_OP, $v0);
    append();
    op(VM_POP_FRAME_OP);
    op(VM_POP_OP, 1);
  } else {
    op(VM_POP_FRAME_OP);
    op(VM_POP_OP, 1);
    op(VM_FETCH_OP, $v0);
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
  op(VM_PUSH_DYNAMIC_SCOPE_OP);
  op(VM_BIND_DYNAMIC_SCOPE_OP, names);
  block();
  op(VM_POP_DYNAMIC_SCOPE_OP);
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
  op(VM_CAPTURE_ARGS_OP);
  expr(op, definition);
  op(VM_CURRY_OP, type, isStrictMode());
  op(VM_POP_FRAME_OP);
  op(VM_FETCH_OP, $v0);
}
