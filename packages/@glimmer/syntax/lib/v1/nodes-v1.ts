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
}

export interface Block extends CommonProgram {
  type: 'Block';
  blockParams: string[];
  chained?: boolean;
}

export type EntityEncodingState = 'transformed' | 'raw';

export interface Template extends CommonProgram {
  type: 'Template';
  readonly locals: readonly string[];

  /**
   * @deprecated use locals instead
   */
  readonly blockParams: readonly string[];
}

/**
 * @deprecated use Template or Block instead
 */
export type Program = Template | Block;

export type CallableExpression = SubExpression | PathExpression;

export interface CallParts {
  path: CallableExpression;
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
  trusting: boolean;
  strip: StripFlags;

  /**
   * @deprecated use trusting instead
   */
  escaped: boolean;
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  path: CallableExpression;
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
  path: CallableExpression;
  params: Expression[];
  hash: Hash;
}

export interface CommentStatement extends BaseNode {
  type: 'CommentStatement';
  value: string;
}

export interface MustacheCommentStatement extends BaseNode {
  type: 'MustacheCommentStatement';
  value: string;
}

export interface ElementNode extends BaseNode {
  type: 'ElementNode';
  tag: string;
  selfClosing: boolean;
  attributes: AttrNode[];
  blockParams: string[];
  modifiers: ElementModifierStatement[];
  comments: MustacheCommentStatement[];
  children: Statement[];
}

export type StatementName =
  | 'MustacheStatement'
  | 'CommentStatement'
  | 'BlockStatement'
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

export interface SubExpression extends BaseNode {
  type: 'SubExpression';
  path: CallableExpression;
  params: Expression[];
  hash: Hash;
}

export interface ThisHead {
  type: 'ThisHead';
  loc: src.SourceSpan;
}

export interface AtHead {
  type: 'AtHead';
  name: string;
  loc: src.SourceSpan;
}

export interface VarHead {
  type: 'VarHead';
  name: string;
  loc: src.SourceSpan;
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
  parts: readonly string[];
  /**
   * @deprecated use `head.type` instead
   */
  readonly this: boolean;
  /**
   * @deprecated use `head.type' instead
   */
  readonly data: boolean;
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

  /**
   * @deprecated use value instead
   */
  original: string;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;

  /**
   * @deprecated use value instead
   */
  original: boolean;
}

export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;

  /**
   * @deprecated use value instead
   */
  original: number;
}

export interface UndefinedLiteral extends BaseNode {
  type: 'UndefinedLiteral';
  value: undefined;

  /**
   * @deprecated use value instead
   */
  original: undefined;
}

export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
  value: null;

  /**
   * @deprecated use value instead
   */
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

export interface StripFlags {
  open: boolean;
  close: boolean;
}

export type Nodes = {
  Template: Template;
  Block: Block;

  MustacheStatement: MustacheStatement;
  BlockStatement: BlockStatement;
  ElementModifierStatement: ElementModifierStatement;
  CommentStatement: CommentStatement;
  MustacheCommentStatement: MustacheCommentStatement;
  ElementNode: ElementNode;
  AttrNode: AttrNode;
  TextNode: TextNode;

  ConcatStatement: ConcatStatement;
  SubExpression: SubExpression;
  PathExpression: PathExpression;

  StringLiteral: StringLiteral;
  BooleanLiteral: BooleanLiteral;
  NumberLiteral: NumberLiteral;
  NullLiteral: NullLiteral;
  UndefinedLiteral: UndefinedLiteral;

  Hash: Hash;
  HashPair: HashPair;
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
