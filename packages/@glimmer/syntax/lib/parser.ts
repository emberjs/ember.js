import {
  EventedTokenizer,
  EntityParser,
  HTML5NamedCharRefs as namedCharRefs
} from "simple-html-tokenizer";
import { Program } from "./types/nodes";
import * as AST from "./types/nodes";
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

export class Parser {
  protected elementStack: Element[] = [];
  private options: Object;
  private source: string[];
  public currentAttribute: Option<Attribute> = null;
  public currentNode: Option<AST.CommentStatement | AST.TextNode | Tag<'StartTag' | 'EndTag'>> = null;
  public tokenizer = new EventedTokenizer(this, entityParser);

  constructor(source: string, options: Object = {}) {
    this.options = options;
    this.source = source.split(/(?:\r\n?|\n)/g);
  }

  get currentAttr(): Attribute {
    return this.currentAttribute;
  }

  get currentTag(): Tag<'StartTag' | 'EndTag'> {
    let node = this.currentNode;
    return node as Tag<'StartTag' | 'EndTag'>;
  }

  get currentStartTag(): Tag<'StartTag'> {
    let node = this.currentNode;
    return node as Tag<'StartTag'>;
  }

  get currentEndTag(): Tag<'EndTag'> {
    let node = this.currentNode;
    return node as Tag<'EndTag'>;
  }

  get currentComment(): AST.CommentStatement {
    let node = this.currentNode;
    return node as AST.CommentStatement;
  }

  get currentData(): AST.TextNode {
    let node = this.currentNode;
    return node as AST.TextNode;

  }

  acceptNode(node: hbs.AST.Program): Program;
  acceptNode<U extends AST.Node>(node: hbs.AST.Node): U;
  acceptNode(node: hbs.AST.Node): any {
    return this[node.type](node);
  }

  currentElement(): Element {
    return this.elementStack[this.elementStack.length - 1];
  }

  sourceForNode(node: hbs.AST.Node, endNode?: { loc: hbs.AST.SourceLocation }): string {
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
