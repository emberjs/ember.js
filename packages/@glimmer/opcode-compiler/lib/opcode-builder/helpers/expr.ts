import type { WireFormat } from '@glimmer/interfaces';
import { Op } from '@glimmer/vm';

import type { PushExpressionOp } from '../../syntax/compilers';

import { EXPRESSIONS } from '../../syntax/expressions';
import { PushPrimitive } from './vm';

export function expr(op: PushExpressionOp, expression: WireFormat.Expression): void {
  if (Array.isArray(expression)) {
    EXPRESSIONS.compile(op, expression);
  } else {
    PushPrimitive(op, expression);
    op(Op.PrimitiveReference);
  }
}
