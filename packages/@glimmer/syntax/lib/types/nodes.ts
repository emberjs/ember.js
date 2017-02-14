export interface BaseNode {
  // Every leaf interface that extends BaseNode must specify a type property.
  // The type property should be a string literal. For example, Identifier
  // has: `type: "Identifier"`
  type: string;
  loc: SourceLocation;
}

export interface SourceLocation {
  source?: string;
  start: Position;
  end: Position;
}

export interface Position {
  /** >= 1 */
  line: number;
  /** >= 0 */
  column: number;
}

export interface Program extends BaseNode {
  type: 'Program';
  body: Statement[];
  blockParams: string[];
}

export type Statement = MustacheStatement | BlockStatement | PartialStatement | MustacheCommentStatement;

export interface Call extends BaseNode {
  path: PathExpression;
  params: Expression[];
  hash: Hash;
}

export interface MustacheStatement extends BaseNode {
  type: 'MustacheStatement';
  path: PathExpression | Literal;
  params: Expression[];
  hash: Hash;
  escaped: boolean;
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  path: PathExpression;
  params: Expression[];
  hash: Hash;
  program: Program;
  inverse?: Program;
}

export interface ElementModifierStatement extends BaseNode {
  type: 'ElementModifierStatement';
  path: PathExpression;
  params: Expression[];
  hash: Hash;
}

export interface PartialStatement extends BaseNode {
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

export interface ElementNode extends BaseNode {
  type: 'ElementNode';
  tag: string;
  attributes: AttrNode[];
  blockParams: string[];
  modifiers: ElementModifierStatement[];
  comments: MustacheCommentStatement[];
  children: Statement[];
}

export interface AttrNode extends BaseNode {
  type: 'AttrNode';
  name: string;
  value: TextNode | MustacheStatement | ConcatStatement;
}

export interface TextNode extends BaseNode {
  type: 'TextNode';
  chars: string;
}

export interface ConcatStatement extends BaseNode {
  type: 'ConcatStatement';
  parts: (TextNode | MustacheStatement)[];
}

export type Expression = SubExpression | PathExpression | Literal;

export interface SubExpression extends Call {
  type: 'SubExpression';
  path: PathExpression;
  params: Expression[];
  hash: Hash;
}

export interface PathExpression extends BaseNode {
  type: 'PathExpression';
  data: boolean;
  original: string;
  parts: string[];
}

export type Literal = StringLiteral | BooleanLiteral | NumberLiteral | UndefinedLiteral | NullLiteral;

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
