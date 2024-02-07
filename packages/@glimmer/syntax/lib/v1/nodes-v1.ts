import type { Nullable, PresentArray } from '@glimmer/interfaces';

import type * as src from '../source/api';

export interface BaseNode {
  // Every leaf interface that extends BaseNode must specify a type property.
  // The type property should be a string literal. For example, Identifier
  // has: `type: "Identifier"`
  type: NodeType;
  loc: src.SourceSpan;
}

export interface CommonProgram extends BaseNode {
  body: Statement[];
  blockParams: string[];
  chained?: boolean;
}

export interface Program extends CommonProgram {
  type: 'Program';
}

export interface Block extends CommonProgram {
  type: 'Block';
  blockParamNodes: BlockParam[];
}

export type EntityEncodingState = 'transformed' | 'raw';

export interface Template extends CommonProgram {
  type: 'Template';
}

export type PossiblyDeprecatedBlock = Block | Template;

export interface CallParts {
  path: Expression;
  params: Expression[];
  hash: Hash;
}

export interface Call extends BaseNode {
  name?: Expression;
  path: Expression;
  params: Expression[];
  hash: Hash;
}

export type CallNode =
  | MustacheStatement
  | BlockStatement
  | ElementModifierStatement
  | SubExpression;

export interface MustacheStatement extends BaseNode {
  type: 'MustacheStatement';
  path: Expression;
  params: Expression[];
  hash: Hash;
  /** @deprecated */
  escaped: boolean;
  trusting: boolean;
  strip: StripFlags;
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  path: Expression;
  params: Expression[];
  hash: Hash;
  program: Block;
  inverse?: Nullable<Block>;
  openStrip: StripFlags;
  inverseStrip: StripFlags;
  closeStrip: StripFlags;

  // Printer extension
  chained?: boolean;
}

export interface ElementModifierStatement extends BaseNode {
  type: 'ElementModifierStatement';
  path: Expression;
  params: Expression[];
  hash: Hash;
}

export interface PartialStatement extends BaseNode {
  type: 'PartialStatement';
  name: PathExpression | SubExpression;
  params: Expression[];
  hash: Hash;
  indent: string;
  strip: StripFlags;
}

export interface CommentStatement extends BaseNode {
  type: 'CommentStatement';
  value: string;
}

export interface MustacheCommentStatement extends BaseNode {
  type: 'MustacheCommentStatement';
  value: string;
}

export interface ElementName {
  type: 'ElementName';
  name: string;
  loc: src.SourceLocation;
}

export interface ElementStartNode extends BaseNode {
  type: 'ElementStartNode';
  value: string;
}

export interface ElementNameNode extends BaseNode {
  type: 'ElementNameNode';
  value: string;
}

export interface ElementEndNode extends BaseNode {
  type: 'ElementEndNode';
  value: string;
}

export interface ElementPartNode extends BaseNode {
  type: 'ElementPartNode';
  value: string;
}

/*
  <Foo.bar.x attr='2'></Foo.bar.x>
   ^-- ElementPartNode
       ^-- ElementPartNode
          ^- ElementPartNode
   ^-------- ElementNameNode
  ^------------------ ElementStartNode
                      ^----------- ElementEndNode
 */
export interface ElementNode extends BaseNode {
  type: 'ElementNode';
  tag: string;
  nameNode: ElementNameNode;
  startTag: ElementStartNode;
  endTag: ElementEndNode;
  parts: ElementPartNode[];
  selfClosing: boolean;
  attributes: AttrNode[];
  blockParams: string[];
  blockParamNodes: BlockParam[];
  modifiers: ElementModifierStatement[];
  comments: MustacheCommentStatement[];
  children: Statement[];
}

export type StatementName =
  | 'MustacheStatement'
  | 'CommentStatement'
  | 'BlockStatement'
  | 'PartialStatement'
  | 'MustacheCommentStatement'
  | 'TextNode'
  | 'ElementNode';

export interface AttrNode extends BaseNode {
  type: 'AttrNode';
  name: string;
  value: AttrValue;
}

export type AttrValue = TextNode | MustacheStatement | ConcatStatement;
export type AttrPart = TextNode | MustacheStatement;

export interface TextNode extends BaseNode {
  type: 'TextNode';
  chars: string;
}

export interface ConcatStatement extends BaseNode {
  type: 'ConcatStatement';
  parts: PresentArray<TextNode | MustacheStatement>;
}

export type ExpressionName = 'SubExpression' | 'PathExpression' | LiteralName;

export interface SubExpression extends Call {
  type: 'SubExpression';
  path: Expression;
  params: Expression[];
  hash: Hash;
}

export interface ThisHead {
  type: 'ThisHead';
  loc: src.SourceLocation;
}

export interface AtHead {
  type: 'AtHead';
  name: string;
  loc: src.SourceLocation;
}

export interface VarHead {
  type: 'VarHead';
  name: string;
  loc: src.SourceLocation;
}

export type PathHead = ThisHead | AtHead | VarHead;

export interface MinimalPathExpression extends BaseNode {
  type: 'PathExpression';
  head: PathHead;
  tail: string[];
}

export interface PathExpression extends MinimalPathExpression {
  type: 'PathExpression';
  original: string;
  head: PathHead;
  tail: string[];
  /**
   * @deprecated use `head` and `tail` instead
   */
  parts: string[];
  /**
   * @deprecated use `head.type` instead
   */
  this: boolean;
  /**
   * @deprecated use `head.type' instead
   */
  data: boolean;
}

export type LiteralName =
  | 'StringLiteral'
  | 'BooleanLiteral'
  | 'NumberLiteral'
  | 'UndefinedLiteral'
  | 'NullLiteral';

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
  original: string;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
  original: boolean;
}

export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;
  original: number;
}

export interface UndefinedLiteral extends BaseNode {
  type: 'UndefinedLiteral';
  value: undefined;
  original: undefined;
}

export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
  value: null;
  original: null;
}

export interface Hash extends BaseNode {
  type: 'Hash';
  pairs: HashPair[];
}

export interface HashPair extends BaseNode {
  type: 'HashPair';
  key: string;
  value: Expression;
}

/**
 * a param inside the pipes of elements or mustache blocks,
 * <Foo as |bar|>... bar is a BlockParam.
 * {{#Foo as |bar|}}... bar is a BlockParam.
 */
export interface BlockParam extends BaseNode {
  type: 'BlockParam';
  value: string;
}

export interface StripFlags {
  open: boolean;
  close: boolean;
}

export type SharedNodes = {
  CommentStatement: CommentStatement;
  MustacheCommentStatement: MustacheCommentStatement;
  TextNode: TextNode;
  StringLiteral: StringLiteral;
  BooleanLiteral: BooleanLiteral;
  NumberLiteral: NumberLiteral;
  NullLiteral: NullLiteral;
  UndefinedLiteral: UndefinedLiteral;
  MustacheStatement: MustacheStatement;
  ElementModifierStatement: ElementModifierStatement;
  PartialStatement: PartialStatement;
  AttrNode: AttrNode;
  ConcatStatement: ConcatStatement;
};

export type Nodes = SharedNodes & {
  ElementEndNode: ElementEndNode;
  ElementStartNode: ElementStartNode;
  ElementPartNode: ElementPartNode;
  ElementNameNode: ElementNameNode;
  Program: Program;
  Template: Template;
  Block: Block;
  BlockStatement: BlockStatement;
  ElementNode: ElementNode;
  SubExpression: SubExpression;
  PathExpression: PathExpression;
  Hash: Hash;
  HashPair: HashPair;
  BlockParam: BlockParam;
};

export type NodeType = keyof Nodes;
export type Node = Nodes[NodeType];

export type Statement = Nodes[StatementName];
export type Statements = Pick<Nodes, StatementName>;
export type Literal = Nodes[LiteralName];
export type Expression = Nodes[ExpressionName];
export type Expressions = Pick<Nodes, ExpressionName>;
export type TopLevelStatement = Statement | Nodes['Block'];

export type ParentNode = Template | Block | ElementNode;
