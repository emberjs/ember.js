function tuple(): never[];
function tuple<T extends string[]>(...args: T): T;
function tuple<T>(...args: T[]): T[] {
  return args;
}

// ensure stays in sync with typing
// ParentNode and ChildKey types are derived from VisitorKeysMap
const visitorKeys = {
  Program: tuple('body'),
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

export default visitorKeys;

export type VisitorKeysMap = typeof visitorKeys;
