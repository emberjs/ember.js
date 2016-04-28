import {
  Yield,
  Block,
  Append,
  DynamicAttr,
  DynamicProp,
  Text,
  Comment,
  OpenElement,
  CloseElement,
  StaticAttr,
  Modifier
} from './core';

import { InlineBlock } from '../compiled/blocks';
import { Statement as StatementSyntax } from '../syntax';
import {
  Statements as SerializedStatements,
  Statement as SerializedStatement
} from 'glimmer-wire-format';

const {
  isYield,
  isBlock,
  isAppend,
  isDynamicAttr,
  isDynamicProp,
  isText,
  isComment,
  isOpenElement,
  isCloseElement,
  isStaticAttr,
  isModifier
} = SerializedStatements;

export default function(sexp: SerializedStatement, blocks: InlineBlock[]): StatementSyntax {
  if (isYield(sexp)) return Yield.fromSpec(sexp);
  if (isBlock(sexp)) return Block.fromSpec(sexp, blocks);
  if (isAppend(sexp)) return Append.fromSpec(sexp);
  if (isDynamicAttr(sexp)) return DynamicAttr.fromSpec(sexp);
  if (isDynamicProp(sexp)) return DynamicProp.fromSpec(sexp);
  if (isText(sexp)) return Text.fromSpec(sexp);
  if (isComment(sexp)) return Comment.fromSpec(sexp);
  if (isOpenElement(sexp)) return OpenElement.fromSpec(sexp);
  if (isCloseElement(sexp)) return CloseElement.fromSpec();
  if (isStaticAttr(sexp)) return StaticAttr.fromSpec(sexp);
  if (isModifier(sexp)) return Modifier.fromSpec(sexp);
};