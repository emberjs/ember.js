import { num, prim, strArray } from '../operands';
import { $v0 } from '@glimmer/vm';
import {
  Option,
  Op,
  MachineOp,
  BuilderOp,
  CompileActions,
  PrimitiveType,
  SingleBuilderOperand,
  StatementCompileActions,
  ExpressionCompileActions,
  WireFormat,
} from '@glimmer/interfaces';
import { op } from '../encoder';

export type StatementBlock = () => StatementCompileActions;
export type Primitive = undefined | null | boolean | number | string;

export interface CompileHelper {
  handle: number;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
}

export function pushPrimitiveReference(value: Primitive): CompileActions {
  return [primitive(value), op(Op.PrimitiveReference)];
}

export function primitive(_primitive: Primitive): BuilderOp {
  let type: PrimitiveType = PrimitiveType.NUMBER;
  let p: SingleBuilderOperand;
  switch (typeof _primitive) {
    case 'number':
      if ((_primitive as number) % 1 === 0) {
        if ((_primitive as number) > -1) {
          p = _primitive;
        } else {
          p = num(_primitive);
          type = PrimitiveType.NEGATIVE;
        }
      } else {
        p = num(_primitive);
        type = PrimitiveType.FLOAT;
      }
      break;
    case 'string':
      p = _primitive;
      type = PrimitiveType.STRING;
      break;
    case 'boolean':
      p = _primitive;
      type = PrimitiveType.BOOLEAN_OR_VOID;
      break;
    case 'object':
      // assume null
      p = 2;
      type = PrimitiveType.BOOLEAN_OR_VOID;
      break;
    case 'undefined':
      p = 3;
      type = PrimitiveType.BOOLEAN_OR_VOID;
      break;
    default:
      throw new Error('Invalid primitive passed to pushPrimitive');
  }

  return op(Op.Primitive, prim(p, type));
}

export function helper({ handle, params, hash }: CompileHelper): ExpressionCompileActions {
  return [
    op(MachineOp.PushFrame),
    op('SimpleArgs', { params, hash, atNames: false }),
    op(Op.Helper, handle),
    op(MachineOp.PopFrame),
    op(Op.Fetch, $v0),
  ];
}

export function dynamicScope(
  names: Option<string[]>,
  block: StatementBlock
): StatementCompileActions {
  let out: StatementCompileActions = [op(Op.PushDynamicScope)];
  if (names && names.length) {
    out.push(op(Op.BindDynamicScope, strArray(names)));
  }
  out.push(block(), op(Op.PopDynamicScope));
  return out;
}
