import { prim, strArray, immediate } from '../operands';
import { $v0 } from '@glimmer/vm';
import {
  Option,
  Op,
  MachineOp,
  OpcodeWrapperOp,
  CompileActions,
  StatementCompileActions,
  ExpressionCompileActions,
  WireFormat,
} from '@glimmer/interfaces';
import { op } from '../encoder';
import { isSmallInt } from '@glimmer/util';
import { SimpleArgs } from './shared';

export type StatementBlock = () => StatementCompileActions;
export type Primitive = undefined | null | boolean | number | string;

export interface CompileHelper {
  handle: number;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
}

/**
 * Push a reference onto the stack corresponding to a statically known primitive
 * @param value A JavaScript primitive (undefined, null, boolean, number or string)
 */
export function PushPrimitiveReference(value: Primitive): CompileActions {
  return [PushPrimitive(value), op(Op.PrimitiveReference)];
}

/**
 * Push an encoded representation of a JavaScript primitive on the stack
 *
 * @param value A JavaScript primitive (undefined, null, boolean, number or string)
 */
export function PushPrimitive(primitive: Primitive): OpcodeWrapperOp {
  let p =
    typeof primitive === 'number' && isSmallInt(primitive) ? immediate(primitive) : prim(primitive);

  return op(Op.Primitive, p);
}

/**
 * Invoke a foreign function (a "helper") based on a statically known handle
 *
 * @param compile.handle A handle
 * @param compile.params An optional list of expressions to compile
 * @param compile.hash An optional list of named arguments (name + expression) to compile
 */
export function Call({ handle, params, hash }: CompileHelper): ExpressionCompileActions {
  return [
    op(MachineOp.PushFrame),
    SimpleArgs({ params, hash, atNames: false }),
    op(Op.Helper, handle),
    op(MachineOp.PopFrame),
    op(Op.Fetch, $v0),
  ];
}

/**
 * Evaluate statements in the context of new dynamic scope entries. Move entries from the
 * stack into named entries in the dynamic scope, then evaluate the statements, then pop
 * the dynamic scope
 *
 * @param names a list of dynamic scope names
 * @param block a function that returns a list of statements to evaluate
 */
export function DynamicScope(names: string[], block: StatementBlock): StatementCompileActions {
  return [
    op(Op.PushDynamicScope),
    op(Op.BindDynamicScope, strArray(names)),
    block(),
    op(Op.PopDynamicScope),
  ];
}
