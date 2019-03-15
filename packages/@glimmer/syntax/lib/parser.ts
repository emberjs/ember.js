import {
  EventedTokenizer,
  EntityParser,
  HTML5NamedCharRefs as namedCharRefs,
} from 'simple-html-tokenizer';
import * as AST from './types/nodes';
import * as HBS from './types/handlebars-ast';
import { Option } from '@glimmer/interfaces';
import { assert, expect } from '@glimmer/util';

const entityParser = new EntityParser(namedCharRefs);

export type Element = AST.Template | AST.Block | AST.ElementNode;

export interface Tag<T extends 'StartTag' | 'EndTag'> {
  type: T;
  name: string;
  attributes: any[];
  modifiers: any[];
  comments: any[];
  selfClosing: boolean;
  loc: AST.SourceLocation;
}

export interface Attribute {
  name: string;
  parts: (AST.MustacheStatement | AST.TextNode)[];
  isQuoted: boolean;
  isDynamic: boolean;
  start: AST.Position;
  valueStartLine: number;
  valueStartColumn: number;
}

export abstract class Parser {
  protected elementStack: Element[] = [];
  private source: string[];
  public currentAttribute: Option<Attribute> = null;
  public currentNode: Option<
    AST.CommentStatement | AST.TextNode | Tag<'StartTag' | 'EndTag'>
  > = null;
  public tokenizer = new EventedTokenizer(this, entityParser);

  constructor(source: string) {
    this.source = source.split(/(?:\r\n?|\n)/g);
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

  get currentTag(): Tag<'StartTag' | 'EndTag'> {
    let node = this.currentNode;
    assert(node && (node.type === 'StartTag' || node.type === 'EndTag'), 'expected tag');
    return node as Tag<'StartTag' | 'EndTag'>;
  }

  get currentStartTag(): Tag<'StartTag'> {
    let node = this.currentNode;
    assert(node && node.type === 'StartTag', 'expected start tag');
    return node as Tag<'StartTag'>;
  }

  get currentEndTag(): Tag<'EndTag'> {
    let node = this.currentNode;
    assert(node && node.type === 'EndTag', 'expected end tag');
    return node as Tag<'EndTag'>;
  }

  get currentComment(): AST.CommentStatement {
    let node = this.currentNode;
    assert(node && node.type === 'CommentStatement', 'expected a comment');
    return node as AST.CommentStatement;
  }

  get currentData(): AST.TextNode {
    let node = this.currentNode;
    assert(node && node.type === 'TextNode', 'expected a text node');
    return node as AST.TextNode;
  }

  acceptTemplate(node: HBS.Program): AST.Template {
    return (this as any)[node.type](node) as AST.Template;
  }

  acceptNode(node: HBS.Program): AST.Block | AST.Template;
  acceptNode<U extends HBS.Node | AST.Node>(node: HBS.Node): U;
  acceptNode(node: HBS.Node): any {
    return (this as any)[node.type](node);
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
      line = this.source[currentLine];

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
