export default {
  Program:                  ['body'],

  MustacheStatement:        ['path', 'params', 'hash'],
  BlockStatement:           ['path', 'params', 'hash', 'program', 'inverse'],
  ElementModifierStatement: ['path', 'params', 'hash'],
  PartialStatement:         ['name', 'params', 'hash'],
  CommentStatement:         [],
  ElementNode:              ['attributes', 'modifiers', 'children'],
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
