import { SerializedSourceSpan } from '../../source/span';
import type { Args } from './args';
import type { ElementModifier } from './attr-block';
import type { AppendContent, ContentNode, InvokeBlock, InvokeComponent } from './content';
import type { CallExpression, ExpressionNode } from './expr';
import type { BaseNodeFields } from './node';

export interface SerializedBaseNode {
  loc: SerializedSourceSpan;
}

export interface GlimmerParentNodeOptions extends BaseNodeFields {
  body: readonly ContentNode[];
}

export interface CallFields extends BaseNodeFields {
  callee: ExpressionNode;
  args: Args;
}

export type CallNode =
  | CallExpression
  | InvokeBlock
  | AppendContent
  | InvokeComponent
  | ElementModifier;
