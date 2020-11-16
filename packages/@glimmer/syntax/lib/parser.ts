import { Option } from '@glimmer/interfaces';
import { assert, assign, expect } from '@glimmer/util';
import {
  EntityParser,
  EventedTokenizer,
  HTML5NamedCharRefs as namedCharRefs,
} from 'simple-html-tokenizer';

import { SourcePosition } from './source/location';
import { Source } from './source/source';
import { SourceOffset, SourceSpan } from './source/span';
import * as ASTv1 from './v1/api';
import * as HBS from './v1/handlebars-ast';

export type ParserNodeBuilder<N extends { loc: SourceSpan }> = Omit<N, 'loc'> & {
  loc: SourceOffset;
};

export type Element = ASTv1.Template | ASTv1.Block | ASTv1.ElementNode;

export interface Tag<T extends 'StartTag' | 'EndTag'> {
  readonly type: T;
  name: string;
  readonly attributes: ASTv1.AttrNode[];
  readonly modifiers: ASTv1.ElementModifierStatement[];
  readonly comments: ASTv1.MustacheCommentStatement[];
  selfClosing: boolean;
  readonly loc: SourceSpan;
}

export interface Attribute {
  name: string;
  currentPart: ASTv1.TextNode | null;
  parts: (ASTv1.MustacheStatement | ASTv1.TextNode)[];
  isQuoted: boolean;
  isDynamic: boolean;
  start: SourceOffset;
  valueSpan: SourceSpan;
}

export abstract class Parser {
  protected elementStack: Element[] = [];
  private lines: string[];
  readonly source: Source;
  public currentAttribute: Option<Attribute> = null;
  public currentNode: Option<
    Readonly<
      | ParserNodeBuilder<ASTv1.CommentStatement>
      | ASTv1.TextNode
      | ParserNodeBuilder<Tag<'StartTag'>>
      | ParserNodeBuilder<Tag<'EndTag'>>
    >
  > = null;
  public tokenizer: EventedTokenizer;

  constructor(
    source: Source,
    entityParser = new EntityParser(namedCharRefs),
    mode: 'precompile' | 'codemod' = 'precompile'
  ) {
    this.source = source;
    this.lines = source.source.split(/(?:\r\n?|\n)/g);
    this.tokenizer = new EventedTokenizer(this, entityParser, mode);
  }

  offset(): SourceOffset {
    let { line, column } = this.tokenizer;
    return this.source.offsetFor(line, column);
  }

  pos({ line, column }: SourcePosition): SourceOffset {
    return this.source.offsetFor(line, column);
  }

  finish<T extends { loc: SourceSpan }>(node: ParserNodeBuilder<T>): T {
    return (assign({}, node, {
      loc: node.loc.until(this.offset()),
    } as const) as unknown) as T;

    // node.loc = node.loc.withEnd(end);
  }

  abstract Program(node: HBS.Program): HBS.Output<'Program'>;
  abstract MustacheStatement(node: HBS.MustacheStatement): HBS.Output<'MustacheStatement'>;
  abstract Decorator(node: HBS.Decorator): HBS.Output<'Decorator'>;
  abstract BlockStatement(node: HBS.BlockStatement): HBS.Output<'BlockStatement'>;
  abstract DecoratorBlock(node: HBS.DecoratorBlock): HBS.Output<'DecoratorBlock'>;
  abstract PartialStatement(node: HBS.PartialStatement): HBS.Output<'PartialStatement'>;
  abstract PartialBlockStatement(
    node: HBS.PartialBlockStatement
  ): HBS.Output<'PartialBlockStatement'>;
  abstract ContentStatement(node: HBS.ContentStatement): HBS.Output<'ContentStatement'>;
  abstract CommentStatement(node: HBS.CommentStatement): HBS.Output<'CommentStatement'>;
  abstract SubExpression(node: HBS.SubExpression): HBS.Output<'SubExpression'>;
  abstract PathExpression(node: HBS.PathExpression): HBS.Output<'PathExpression'>;
  abstract StringLiteral(node: HBS.StringLiteral): HBS.Output<'StringLiteral'>;
  abstract BooleanLiteral(node: HBS.BooleanLiteral): HBS.Output<'BooleanLiteral'>;
  abstract NumberLiteral(node: HBS.NumberLiteral): HBS.Output<'NumberLiteral'>;
  abstract UndefinedLiteral(node: HBS.UndefinedLiteral): HBS.Output<'UndefinedLiteral'>;
  abstract NullLiteral(node: HBS.NullLiteral): HBS.Output<'NullLiteral'>;

  abstract reset(): void;
  abstract finishData(): void;
  abstract tagOpen(): void;
  abstract beginData(): void;
  abstract appendToData(char: string): void;
  abstract beginStartTag(): void;
  abstract appendToTagName(char: string): void;
  abstract beginAttribute(): void;
  abstract appendToAttributeName(char: string): void;
  abstract beginAttributeValue(quoted: boolean): void;
  abstract appendToAttributeValue(char: string): void;
  abstract finishAttributeValue(): void;
  abstract markTagAsSelfClosing(): void;
  abstract beginEndTag(): void;
  abstract finishTag(): void;
  abstract beginComment(): void;
  abstract appendToCommentData(char: string): void;
  abstract finishComment(): void;
  abstract reportSyntaxError(error: string): void;

  get currentAttr(): Attribute {
    return expect(this.currentAttribute, 'expected attribute');
  }

  get currentTag(): ParserNodeBuilder<Tag<'StartTag' | 'EndTag'>> {
    let node = this.currentNode;
    assert(node && (node.type === 'StartTag' || node.type === 'EndTag'), 'expected tag');
    return node;
  }

  get currentStartTag(): ParserNodeBuilder<Tag<'StartTag'>> {
    let node = this.currentNode;
    assert(node && node.type === 'StartTag', 'expected start tag');
    return node;
  }

  get currentEndTag(): ParserNodeBuilder<Tag<'EndTag'>> {
    let node = this.currentNode;
    assert(node && node.type === 'EndTag', 'expected end tag');
    return node;
  }

  get currentComment(): ParserNodeBuilder<ASTv1.CommentStatement> {
    let node = this.currentNode;
    assert(node && node.type === 'CommentStatement', 'expected a comment');
    return node;
  }

  get currentData(): ASTv1.TextNode {
    let node = this.currentNode;
    assert(node && node.type === 'TextNode', 'expected a text node');
    return node;
  }

  acceptTemplate(node: HBS.Program): ASTv1.Template {
    return this[node.type as 'Program'](node) as ASTv1.Template;
  }

  acceptNode(node: HBS.Program): ASTv1.Block | ASTv1.Template;
  acceptNode<U extends HBS.Node | ASTv1.Node>(node: HBS.Node): U;
  acceptNode<T extends HBS.NodeType>(node: HBS.Node<T>): HBS.Output<T> {
    return (this[node.type as T] as (node: HBS.Node<T>) => HBS.Output<T>)(node);
  }

  currentElement(): Element {
    return this.elementStack[this.elementStack.length - 1];
  }

  sourceForNode(node: HBS.Node, endNode?: { loc: HBS.SourceLocation }): string {
    let firstLine = node.loc.start.line - 1;
    let currentLine = firstLine - 1;
    let firstColumn = node.loc.start.column;
    let string = [];
    let line;

    let lastLine: number;
    let lastColumn: number;

    if (endNode) {
      lastLine = endNode.loc.end.line - 1;
      lastColumn = endNode.loc.end.column;
    } else {
      lastLine = node.loc.end.line - 1;
      lastColumn = node.loc.end.column;
    }

    while (currentLine < lastLine) {
      currentLine++;
      line = this.lines[currentLine];

      if (currentLine === firstLine) {
        if (firstLine === lastLine) {
          string.push(line.slice(firstColumn, lastColumn));
        } else {
          string.push(line.slice(firstColumn));
        }
      } else if (currentLine === lastLine) {
        string.push(line.slice(0, lastColumn));
      } else {
        string.push(line);
      }
    }

    return string.join('\n');
  }
}
