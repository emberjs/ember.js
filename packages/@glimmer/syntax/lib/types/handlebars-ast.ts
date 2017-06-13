/**
 * @module
 *
 * This file contains types for the raw AST returned from the Handlebars parser.
 * These types were originally imported from
 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/handlebars/index.d.ts.
 */

export interface Node {
  type: string;
  loc: SourceLocation;
}

export interface SourceLocation {
  source: string;
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
}

export interface Program extends Node {
  body: Statement[];
  blockParams: string[];
}

export interface Statement extends Node { }

export interface MustacheStatement extends Statement {
  path: PathExpression | Literal;
  params: Expression[];
  hash: Hash;
  escaped: boolean;
  strip: StripFlags;
}

export interface Decorator extends MustacheStatement { }

export interface BlockStatement extends Statement {
  path: PathExpression;
  params: Expression[];
  hash: Hash;
  program: Program;
  inverse: Program;
  openStrip: StripFlags;
  inverseStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface DecoratorBlock extends BlockStatement { }

export interface PartialStatement extends Statement {
  name: PathExpression | SubExpression;
  params: Expression[];
  hash: Hash;
  indent: string;
  strip: StripFlags;
}

export interface PartialBlockStatement extends Statement {
  name: PathExpression | SubExpression;
  params: Expression[];
  hash: Hash;
  program: Program;
  openStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface ContentStatement extends Statement {
  value: string;
  original: StripFlags;
}

export interface CommentStatement extends Statement {
  value: string;
  strip: StripFlags;
}

export interface Expression extends Node { }

export interface SubExpression extends Expression {
  path: PathExpression;
  params: Expression[];
  hash: Hash;
}

export interface PathExpression extends Expression {
  data: boolean;
  depth: number;
  parts: string[];
  original: string;
}

export interface Literal extends Expression { }

export interface StringLiteral extends Literal {
  value: string;
  original: string;
}

export interface BooleanLiteral extends Literal {
  value: boolean;
  original: boolean;
}

export interface NumberLiteral extends Literal {
  value: number;
  original: number;
}

export interface UndefinedLiteral extends Literal { }

export interface NullLiteral extends Literal { }

export interface Hash extends Node {
  pairs: HashPair[];
}

export interface HashPair extends Node {
  key: string;
  value: Expression;
}

export interface StripFlags {
  open: boolean;
  close: boolean;
}
