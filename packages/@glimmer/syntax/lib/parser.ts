import {
  EventedTokenizer,
  EntityParser,
  HTML5NamedCharRefs as namedCharRefs
} from 'simple-html-tokenizer';
import { Program } from './types/nodes';
import * as AST from './types/nodes';
import * as HandlebarsAST from './types/handlebars-ast';
import { Option } from '@glimmer/interfaces';
import { assert, expect } from '@glimmer/util';

const entityParser = new EntityParser(namedCharRefs);

export type Element = AST.Program | AST.ElementNode;

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
    assert(
      node && (node.type === 'StartTag' || node.type === 'EndTag'),
      'expected tag'
    );
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

  acceptNode(node: HandlebarsAST.Program): Program;
  acceptNode<U extends AST.Node>(node: HandlebarsAST.Node): U;
  acceptNode(node: HandlebarsAST.Node): any {
    return this[node.type](node);
  }

  currentElement(): Element {
    return this.elementStack[this.elementStack.length - 1];
  }

  sourceForNode(
    node: HandlebarsAST.Node,
    endNode?: { loc: HandlebarsAST.SourceLocation }
  ): string {
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
