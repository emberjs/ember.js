import { tuple } from '@glimmer/util';
import * as AST from '../types/nodes';

// ensure stays in sync with typing
// ParentNode and ChildKey types are derived from VisitorKeysMap
const visitorKeys = {
  Program: tuple('body'),
  Template: tuple('body'),
  Block: tuple('body'),

  MustacheStatement: tuple('path', 'params', 'hash'),
  BlockStatement: tuple('path', 'params', 'hash', 'program', 'inverse'),
  ElementModifierStatement: tuple('path', 'params', 'hash'),
  PartialStatement: tuple('name', 'params', 'hash'),
  CommentStatement: tuple(),
  MustacheCommentStatement: tuple(),
  ElementNode: tuple('attributes', 'modifiers', 'children', 'comments'),
  AttrNode: tuple('value'),
  TextNode: tuple(),

  ConcatStatement: tuple('parts'),
  SubExpression: tuple('path', 'params', 'hash'),
  PathExpression: tuple(),

  StringLiteral: tuple(),
  BooleanLiteral: tuple(),
  NumberLiteral: tuple(),
  NullLiteral: tuple(),
  UndefinedLiteral: tuple(),

  Hash: tuple('pairs'),
  HashPair: tuple('value'),
};

type VisitorKeysMap = typeof visitorKeys;

export type VisitorKeys = { [P in keyof VisitorKeysMap]: VisitorKeysMap[P][number] };
export type VisitorKey<N extends AST.Node> = VisitorKeys[N['type']] & keyof N;

export default visitorKeys;
