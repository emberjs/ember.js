/**
 * @module
 *
 * This file contains types for the raw AST returned from the Handlebars parser.
 * These types were originally imported from
 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/handlebars/index.d.ts.
 */

import * as AST from './nodes';

export interface CommonNode {
  loc: SourceLocation;
}

export interface NodeMap {
  Program: { input: Program; output: AST.Template | AST.Block };
  MustacheStatement: { input: MustacheStatement; output: AST.MustacheStatement | void };
  Decorator: { input: Decorator; output: never };
  BlockStatement: { input: BlockStatement; output: AST.BlockStatement | void };
  DecoratorBlock: { input: DecoratorBlock; output: never };
  PartialStatement: { input: PartialStatement; output: never };
  PartialBlockStatement: { input: PartialBlockStatement; output: never };
  ContentStatement: { input: ContentStatement; output: void };
  CommentStatement: { input: CommentStatement; output: AST.MustacheCommentStatement | null };
  SubExpression: { input: SubExpression; output: AST.SubExpression };
  PathExpression: { input: PathExpression; output: AST.PathExpression };
  StringLiteral: { input: StringLiteral; output: AST.StringLiteral };
  BooleanLiteral: { input: BooleanLiteral; output: AST.BooleanLiteral };
  NumberLiteral: { input: NumberLiteral; output: AST.NumberLiteral };
  UndefinedLiteral: { input: UndefinedLiteral; output: AST.UndefinedLiteral };
  NullLiteral: { input: NullLiteral; output: AST.NullLiteral };
}

export type NodeType = keyof NodeMap;
export type Node<T extends NodeType = NodeType> = NodeMap[T]['input'];

export type Output<T extends NodeType> = NodeMap[T]['output'];

export interface SourceLocation {
  source: string;
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
}

export interface Program extends CommonNode {
  type: 'Program';
  body: Statement[];
  blockParams: string[];
}

export type Statement =
  | MustacheStatement
  | BlockStatement
  | DecoratorBlock
  | PartialStatement
  | PartialBlockStatement
  | ContentStatement
  | CommentStatement;

export interface CommonMustache extends CommonNode {
  path: PathExpression | Literal;
  params: Expression[];
  hash: Hash;
  escaped: boolean;
  strip: StripFlags;
}

export interface MustacheStatement extends CommonMustache {
  type: 'MustacheStatement';
}

export interface Decorator extends CommonMustache {
  type: 'DecoratorStatement';
}

export interface CommonBlock extends CommonNode {
  chained: boolean;
  path: PathExpression;
  params: Expression[];
  hash: Hash;
  program: Program;
  inverse: Program;
  openStrip: StripFlags;
  inverseStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface BlockStatement extends CommonBlock {
  type: 'BlockStatement';
}

export interface DecoratorBlock extends CommonBlock {
  type: 'DecoratorBlock';
}

export interface PartialStatement extends CommonNode {
  type: 'PartialStatement';
  name: PathExpression | SubExpression;
  params: Expression[];
  hash: Hash;
  indent: string;
  strip: StripFlags;
}

export interface PartialBlockStatement extends CommonNode {
  type: 'PartialBlockStatement';
  name: PathExpression | SubExpression;
  params: Expression[];
  hash: Hash;
  program: Program;
  openStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface ContentStatement extends CommonNode {
  type: 'ContentStatement';
  value: string;
  original: StripFlags;
}

export interface CommentStatement extends CommonNode {
  type: 'CommentStatement';
  value: string;
  strip: StripFlags;
}

export type Expression = SubExpression | PathExpression | Literal;

export interface SubExpression extends CommonNode {
  type: 'SubExpression';
  path: PathExpression;
  params: Expression[];
  hash: Hash;
}

export interface PathExpression extends CommonNode {
  type: 'PathExpression';
  data: boolean;
  depth: number;
  parts: string[];
  original: string;
}

export type Literal =
  | StringLiteral
  | BooleanLiteral
  | NumberLiteral
  | UndefinedLiteral
  | NullLiteral;

export interface StringLiteral extends CommonNode {
  type: 'StringLiteral';
  value: string;
  original: string;
}

export interface BooleanLiteral extends CommonNode {
  type: 'BooleanLiteral';
  value: boolean;
  original: boolean;
}

export interface NumberLiteral extends CommonNode {
  type: 'NumberLiteral';
  value: number;
  original: number;
}

export interface UndefinedLiteral extends CommonNode {
  type: 'UndefinedLiteral';
}

export interface NullLiteral extends CommonNode {
  type: 'NullLiteral';
}

export interface Hash extends CommonNode {
  pairs: HashPair[];
}

export interface HashPair extends CommonNode {
  key: string;
  value: Expression;
}

export interface StripFlags {
  open: boolean;
  close: boolean;
}
