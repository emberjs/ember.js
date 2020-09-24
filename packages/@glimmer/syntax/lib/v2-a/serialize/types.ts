import type { PresentArray } from '@glimmer/interfaces';

import { SerializedSourceSlice } from '../../source/slice';
import { SerializedSourceSpan } from '../../source/span';
import * as ASTv2 from '../api';

export interface SerializedBaseNode {
  loc: SerializedSourceSpan;
}

export interface SerializedLiteralExpression extends SerializedBaseNode {
  type: 'Literal';
  value: ASTv2.LiteralValue;
}

export interface SerializedInterpolateExpression extends SerializedBaseNode {
  type: 'Interpolate';
  parts: PresentArray<SerializedExpressionNode>;
}

export interface SerializedPathExpression extends SerializedBaseNode {
  type: 'Path';
  ref: SerializedVariableReference;
  tail: SerializedSourceSlice[];
}

export interface SerializedThisReference extends SerializedBaseNode {
  type: 'This';
}

export interface SerializedArgReference extends SerializedBaseNode {
  type: 'Arg';
  name: SerializedSourceSlice;
}

export interface SerializedLocalVarReference extends SerializedBaseNode {
  type: 'Local';
  name: string;
}

export interface SerializedFreeVarReference extends SerializedBaseNode {
  type: 'Free';
  name: string;
  resolution: ASTv2.SerializedResolution;
}

export type SerializedVariableReference =
  | SerializedThisReference
  | SerializedArgReference
  | SerializedLocalVarReference
  | SerializedFreeVarReference;

export interface SerializedCallNode extends SerializedBaseNode {
  callee: SerializedExpressionNode;
  args: SerializedArgs;
}

export interface SerializedCallExpression extends SerializedCallNode {
  type: 'Call';
}

export type SerializedExpressionNode =
  | SerializedLiteralExpression
  | SerializedPathExpression
  | SerializedCallExpression
  | SerializedInterpolateExpression;

export interface SerializedArgs extends SerializedBaseNode {
  positional: SerializedPositional;
  named: SerializedNamed;
}

export interface SerializedPositional extends SerializedBaseNode {
  exprs: SerializedExpressionNode[];
}

export interface SerializedNamed extends SerializedBaseNode {
  entries: [SerializedSourceSlice, SerializedExpressionNode][];
}

export type SerializedNamedArgument = [SerializedSourceSlice, SerializedExpressionNode];

export interface SerializedAppendContent extends SerializedBaseNode {
  type: 'Append';
  value: SerializedExpressionNode;
  trusting: boolean;
}

export interface SerializedGlimmerComment extends SerializedBaseNode {
  type: 'GlimmerComment';
  text: SerializedSourceSlice;
}

export interface SerializedHtmlText extends SerializedBaseNode {
  type: 'HtmlText';
  chars: string;
}

export interface SerializedHtmlComment extends SerializedBaseNode {
  type: 'HtmlComment';
  text: SerializedSourceSlice;
}

export interface SerializedInvokeBlock extends SerializedCallNode {
  type: 'InvokeBlock';
  blocks: SerializedNamedBlocks;
}

export interface SerializedInvokeComponent extends SerializedBaseNode {
  type: 'InvokeComponent';
  callee: SerializedExpressionNode;
  blocks: SerializedNamedBlocks;
  attrs: SerializedAttrNode[];
  componentArgs: SerializedComponentArg[];
  modifiers: SerializedElementModifier[];
}

export interface SerializedSimpleElement extends SerializedBaseNode {
  type: 'SimpleElement';
  tag: SerializedSourceSlice;
  body: SerializedContentNode[];
  attrs: SerializedHtmlOrSplatAttr[];
  componentArgs: SerializedComponentArg[];
  modifiers: SerializedElementModifier[];
}

export type SerializedSplatAttr = SerializedSourceSlice<'...attributes'>;

export interface SerializedAttrOrArg extends SerializedBaseNode {
  name: SerializedSourceSlice;
  value: SerializedExpressionNode;
  trusting: boolean;
}

export type SerializedHtmlOrSplatAttr = SerializedSplatAttr | SerializedAttrOrArg;
export type SerializedAttrNode = SerializedSplatAttr | SerializedAttrOrArg;

export type SerializedComponentArg = SerializedBaseNode;
export type SerializedElementModifier = SerializedCallNode;

export interface SerializedNamedBlocks extends SerializedBaseNode {
  blocks: SerializedNamedBlock[];
}

export interface SerializedNamedBlock {
  name: SerializedSourceSlice;
  block: SerializedBlock;
  // TODO attrs, componentArgs, modifiers
}

export interface SerializedBlock extends SerializedBaseNode {
  body: SerializedContentNode[];
  table: string[];
}

export type SerializedContentNode =
  | SerializedAppendContent
  | SerializedHtmlComment
  | SerializedHtmlText
  | SerializedGlimmerComment
  | SerializedInvokeBlock
  | SerializedInvokeComponent
  | SerializedSimpleElement;
