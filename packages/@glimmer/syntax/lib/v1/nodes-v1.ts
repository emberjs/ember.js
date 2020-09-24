import { Dict, Option, PresentArray, WireFormat } from '@glimmer/interfaces';

import { SourceLocation } from '../source/location';
import { SourceSpan } from '../source/span';

export interface Symbols {
  symbols: string[];

  has(name: string): boolean;
  get(name: string): number;

  getLocalsMap(): Dict<number>;
  getEvalInfo(): WireFormat.Core.EvalInfo;

  allocateFree(name: string): number;
  allocateNamed(name: string): number;
  allocateBlock(name: string): number;
  allocate(identifier: string): number;

  child(locals: string[]): BlockSymbols;
}

export interface BlockSymbols extends Symbols {
  slots: number[];
}

export interface ProgramSymbols extends Symbols {
  freeVariables: string[];
}

export interface BaseNode {
  // Every leaf interface that extends BaseNode must specify a type property.
  // The type property should be a string literal. For example, Identifier
  // has: `type: "Identifier"`
  type: NodeType;
  loc: SourceSpan;
}

export interface CommonProgram extends BaseNode {
  body: Statement[];
  blockParams: string[];
  chained?: boolean;
}

export interface Program extends CommonProgram {
  type: 'Program';
  symbols?: Symbols;
}

export interface Block extends CommonProgram {
  type: 'Block';
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
  inverse?: Option<Block>;
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

export interface NamedBlockName {
  type: 'NamedBlockName';
  name: string;
  loc: SourceLocation;
}

export interface ElementName {
  type: 'ElementName';
  name: string;
  loc: SourceLocation;
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
  | 'PartialStatement'
  | 'MustacheCommentStatement'
  | 'TextNode'
  | 'ElementNode';

export interface AttrNode extends BaseNode {
  type: 'AttrNode';
  name: string;
  value: TextNode | MustacheStatement | ConcatStatement;
}

export type AttrValue = TextNode | MustacheStatement | ConcatStatement;

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
  loc: SourceLocation;
}

export interface AtHead {
  type: 'AtHead';
  name: string;
  loc: SourceLocation;
}

export interface VarHead {
  type: 'VarHead';
  name: string;
  loc: SourceLocation;
}

export interface FreeVarHead {
  type: 'FreeVarHead';
  name: string;
  loc: SourceLocation;
}

export interface LocalVarHead {
  type: 'LocalVarHead';
  name: string;
  loc: SourceLocation;
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
  Program: Program;
  Template: Template;
  Block: Block;
  BlockStatement: BlockStatement;
  ElementNode: ElementNode;
  SubExpression: SubExpression;
  PathExpression: PathExpression;
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
