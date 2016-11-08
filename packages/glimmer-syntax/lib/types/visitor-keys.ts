export default {
  Program:                  ['body'],

  MustacheStatement:        ['path', 'params', 'hash'],
  BlockStatement:           ['path', 'params', 'hash', 'program', 'inverse'],
  ElementModifierStatement: ['path', 'params', 'hash'],
  PartialStatement:         ['name', 'params', 'hash'],
  CommentStatement:         [],
  MustacheCommentStatement: [],
  ElementNode:              ['attributes', 'modifiers', 'children', 'comments'],
  AttrNode:                 ['value'],
  TextNode:                 [],

  ConcatStatement:          ['parts'],
  SubExpression:            ['path', 'params', 'hash'],
  PathExpression:           [],

  StringLiteral:            [],
  BooleanLiteral:           [],
  NumberLiteral:            [],
  NullLiteral:              [],
  UndefinedLiteral:         [],

  Hash:                     ['pairs'],
  HashPair:                 ['value']
};
