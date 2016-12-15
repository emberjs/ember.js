import { unreachable } from 'glimmer-util';
import {
  FLUSH_ELEMENT,
  CLOSE_ELEMENT,
  Yield,
  Partial,
  Block,
  OptimizedAppend,
  DynamicAttr,
  Text,
  Comment,
  OpenElement,
  FlushElement,
  CloseElement,
  StaticAttr,
  Modifier,
  DynamicArg,
  StaticArg,
  TrustingAttr
} from './core';

import { SymbolTable, Opaque } from 'glimmer-interfaces';
import {
  Statement as StatementSyntax,
  Argument as ArgumentSyntax,
  Attribute as AttributeSyntax
} from '../syntax';
import {
  Statements as SerializedStatements,
  Statement as SerializedStatement,
} from 'glimmer-wire-format';
import { BlockScanner  } from '../scanner';

const {
  isYield,
  isBlock,
  isPartial,
  isAppend,
  isDynamicAttr,
  isText,
  isComment,
  isOpenElement,
  isFlushElement,
  isCloseElement,
  isStaticAttr,
  isModifier,
  isDynamicArg,
  isStaticArg,
  isTrustingAttr
} = SerializedStatements;

export default function(sexp: SerializedStatement, symbolTable: SymbolTable, scanner: BlockScanner): StatementSyntax | ArgumentSyntax<Opaque> | AttributeSyntax<Opaque> {
  if (isYield(sexp)) return Yield.fromSpec(sexp);
  if (isPartial(sexp)) return Partial.fromSpec(sexp);
  if (isBlock(sexp)) return Block.fromSpec(sexp, symbolTable, scanner);
  if (isAppend(sexp)) return new OptimizedAppend(sexp);
  if (isDynamicAttr(sexp)) return DynamicAttr.fromSpec(sexp);
  if (isDynamicArg(sexp)) return DynamicArg.fromSpec(sexp);
  if (isTrustingAttr(sexp)) return TrustingAttr.fromSpec(sexp);
  if (isText(sexp)) return new Text(sexp);
  if (isComment(sexp)) return Comment.fromSpec(sexp);
  if (isOpenElement(sexp)) return OpenElement.fromSpec(sexp, symbolTable);
  if (isFlushElement(sexp)) return new FlushElement();
  if (isCloseElement(sexp)) return new CloseElement();
  if (isStaticAttr(sexp)) return StaticAttr.fromSpec(sexp);
  if (isStaticArg(sexp)) return StaticArg.fromSpec(sexp);
  if (isModifier(sexp)) return Modifier.fromSpec(sexp);

  throw unreachable();
};
