import type { WireFormat } from '@glimmer/interfaces';
import { PRIMITIVE_REFERENCE_OP } from '@glimmer/runtime/lib/compiled/opcodes/vm';

import type { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';

import { compileSexp } from '../../syntax/compilers';
import { PushPrimitive } from './vm';

export function expr(op: PushExpressionOp, expression: WireFormat.Expression): void {
  if (Array.isArray(expression)) {
    compileSexp(op as PushStatementOp, expression);
  } else {
    PushPrimitive(op, expression);
    op(PRIMITIVE_REFERENCE_OP);
  }
}
