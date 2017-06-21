import b, { SYNTHETIC } from "../builders";
import { appendChild, parseElementBlockParams } from "../utils";
import { HandlebarsNodeVisitors } from './handlebars-node-visitors';
import { SourceLocation } from "../types/nodes";
import * as AST from "../types/nodes";
import SyntaxError from '../errors/syntax-error';
import { Tag } from "../parser";
import builders from "../builders";
import traverse, { NodeVisitor } from "../traversal/traverse";
import print from "../generation/print";
import Walker from "../traversal/walker";
import * as handlebars from "handlebars";
import { assign } from '@glimmer/util';

const voidMap: {
  [tagName: string]: boolean
} = Object.create(null);

let voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
voidTagNames.split(" ").forEach(tagName => {
  voidMap[tagName] = true;
});

export class TokenizerEventHandlers extends HandlebarsNodeVisitors {
  private tagOpenLine = 0;
  private tagOpenColumn = 0;

  reset() {
    this.currentNode = null;
  }

  // Comment

  beginComment() {
    this.currentNode = b.comment("");
    this.currentNode.loc = {
      source: null,
      start: b.pos(this.tagOpenLine, this.tagOpenColumn),
      end: null
    } as any as SourceLocation;
  }

  appendToCommentData(char: string) {
    this.currentComment.value += char;
  }

  finishComment() {
    this.currentComment.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);

    appendChild(this.currentElement(), this.currentComment);
  }

  // Data

  beginData() {
    this.currentNode = b.text();
    this.currentNode.loc = {
      source: null,
      start: b.pos(this.tokenizer.line, this.tokenizer.column),
      end: null
    } as any as SourceLocation;
  }

  appendToData(char: string) {
    this.currentData.chars += char;
  }

  finishData() {
    this.currentData.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);

    appendChild(this.currentElement(), this.currentData);
  }

  // Tags - basic

  tagOpen() {
    this.tagOpenLine = this.tokenizer.line;
    this.tagOpenColumn = this.tokenizer.column;
  }

  beginStartTag() {
    this.currentNode = {
      type: 'StartTag',
      name: "",
      attributes: [],
      modifiers: [],
      comments: [],
      selfClosing: false,
      loc: SYNTHETIC
    };
  }

  beginEndTag() {
    this.currentNode = {
      type: 'EndTag',
      name: "",
      attributes: [],
      modifiers: [],
      comments: [],
      selfClosing: false,
      loc: SYNTHETIC
    };
  }

  finishTag() {
    let { line, column } = this.tokenizer;

    let tag = this.currentTag;
    tag.loc = b.loc(this.tagOpenLine, this.tagOpenColumn, line, column);

    if (tag.type === 'StartTag') {
      this.finishStartTag();

      if (voidMap[tag.name] || tag.selfClosing) {
        this.finishEndTag(true);
      }
    } else if (tag.type === 'EndTag') {
      this.finishEndTag(false);
    }
  }

  finishStartTag() {
    let { name, attributes, modifiers, comments } = this.currentStartTag;

    let loc = b.loc(this.tagOpenLine, this.tagOpenColumn);
    let element = b.element(name, attributes, modifiers, [], comments, loc);
    this.elementStack.push(element);
  }

  finishEndTag(isVoid: boolean) {
    let tag = this.currentTag;

    let element = this.elementStack.pop() as AST.ElementNode;
    let parent = this.currentElement();

    validateEndTag(tag, element, isVoid);

    element.loc.end.line = this.tokenizer.line;
    element.loc.end.column = this.tokenizer.column;

    parseElementBlockParams(element);
    appendChild(parent, element);
  }

  markTagAsSelfClosing() {
    this.currentTag.selfClosing = true;
  }

  // Tags - name

  appendToTagName(char: string) {
    this.currentTag.name += char;
  }

  // Tags - attributes

  beginAttribute() {
    let tag = this.currentTag;
    if (tag.type === 'EndTag') {
       throw new SyntaxError(
        `Invalid end tag: closing tag must not have attributes, ` +
        `in \`${tag.name}\` (on line ${this.tokenizer.line}).`,
        tag.loc
      );
    }

    this.currentAttribute = {
      name: "",
      parts: [],
      isQuoted: false,
      isDynamic: false,
      start: b.pos(this.tokenizer.line, this.tokenizer.column),
      valueStartLine: 0,
      valueStartColumn: 0
    };
  }

  appendToAttributeName(char: string) {
    this.currentAttr.name += char;
  }

  beginAttributeValue(isQuoted: boolean) {
    this.currentAttr.isQuoted = isQuoted;
    this.currentAttr.valueStartLine = this.tokenizer.line;
    this.currentAttr.valueStartColumn = this.tokenizer.column;
  }

  appendToAttributeValue(char: string) {
    let parts = this.currentAttr.parts;
    let lastPart = parts[parts.length - 1];

    if (lastPart && lastPart.type === 'TextNode') {
      lastPart.chars += char;

      // update end location for each added char
      lastPart.loc.end.line = this.tokenizer.line;
      lastPart.loc.end.column = this.tokenizer.column;
    } else {
      // initially assume the text node is a single char
      let loc = b.loc(
        this.tokenizer.line, this.tokenizer.column,
        this.tokenizer.line, this.tokenizer.column
      );

      // correct for `\n` as first char
      if (char === '\n') {
        loc.start.line -= 1;
        loc.start.column = lastPart ? lastPart.loc.end.column : this.currentAttr.valueStartColumn;
      }

      let text = b.text(char, loc);
      parts.push(text);
    }
  }

  finishAttributeValue() {
    let { name, parts, isQuoted, isDynamic, valueStartLine, valueStartColumn } = this.currentAttr;
    let value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);
    value.loc = b.loc(
      valueStartLine, valueStartColumn,
      this.tokenizer.line, this.tokenizer.column
    );

    let loc = b.loc(
      this.currentAttr.start.line, this.currentAttr.start.column,
      this.tokenizer.line, this.tokenizer.column
    );

    let attribute = b.attr(name, value, loc);

    this.currentStartTag.attributes.push(attribute);
  }

  reportSyntaxError(message: string) {
    throw new SyntaxError(`Syntax error at line ${this.tokenizer.line} col ${this.tokenizer.column}: ${message}`, b.loc(this.tokenizer.line, this.tokenizer.column));
  }
};

function assembleAttributeValue(parts: (AST.MustacheStatement | AST.TextNode)[], isQuoted: boolean, isDynamic: boolean, line: number) {
  if (isDynamic) {
    if (isQuoted) {
      return assembleConcatenatedValue(parts);
    } else {
      if (parts.length === 1 || (parts.length === 2 && parts[1].type === 'TextNode' && (parts[1] as AST.TextNode).chars === '/')) {
        return parts[0];
      } else {
        throw new SyntaxError(
          `An unquoted attribute value must be a string or a mustache, ` +
          `preceeded by whitespace or a '=' character, and ` +
          `followed by whitespace, a '>' character, or '/>' (on line ${line})`,
          b.loc(line, 0)
        );
      }
    }
  } else {
    return parts.length > 0 ? parts[0] : b.text("");
  }
}

function assembleConcatenatedValue(parts: (AST.MustacheStatement | AST.TextNode)[]) {
  for (let i = 0; i < parts.length; i++) {
    let part: AST.BaseNode = parts[i];

    if (part.type !== 'MustacheStatement' && part.type !== 'TextNode') {
      throw new SyntaxError("Unsupported node in quoted attribute value: " + part['type'], part.loc);
    }
  }

  return b.concat(parts);
}

function validateEndTag(tag: Tag<'StartTag' | 'EndTag'>, element: AST.ElementNode, selfClosing: boolean) {
  let error;

  if (voidMap[tag.name] && !selfClosing) {
    // EngTag is also called by StartTag for void and self-closing tags (i.e.
    // <input> or <br />, so we need to check for that here. Otherwise, we would
    // throw an error for those cases.
    error = "Invalid end tag " + formatEndTagInfo(tag) + " (void elements cannot have end tags).";
  } else if (element.tag === undefined) {
    error = "Closing tag " + formatEndTagInfo(tag) + " without an open tag.";
  } else if (element.tag !== tag.name) {
    error = "Closing tag " + formatEndTagInfo(tag) + " did not match last open tag `" + element.tag + "` (on line " +
            element.loc.start.line + ").";
  }

  if (error) { throw new SyntaxError(error, element.loc); }
}

function formatEndTagInfo(tag: Tag<'StartTag' | 'EndTag'>) {
  return "`" + tag.name + "` (on line " + tag.loc.end.line + ")";
}

export interface Syntax {
  parse: typeof preprocess;
  builders: typeof builders;
  print: typeof print;
  traverse: typeof traverse;
  Walker: typeof Walker;
}

export const syntax: Syntax = {
  parse: preprocess,
  builders,
  print,
  traverse,
  Walker
};

/**
  ASTPlugins can make changes to the Glimmer template AST before
  compilation begins.
*/
export interface ASTPlugin {
  (env: ASTPluginEnvironment): ASTPluginResult;
}

export interface ASTPluginResult {
  name: string;
  visitors: NodeVisitor;
}

export interface ASTPluginEnvironment {
  meta?: any;
  syntax: Syntax;
}

export interface PreprocessOptions {
  plugins?: {
    ast?: ASTPlugin[];
  };
}

export function preprocess(html: string, options?: PreprocessOptions): AST.Program {
  let ast = (typeof html === 'object') ? html : handlebars.parse(html);
  let program = new TokenizerEventHandlers(html, options).acceptNode(ast);

  if (options && options.plugins && options.plugins.ast) {
    for (let i = 0, l = options.plugins.ast.length; i < l; i++) {
      let transform = options.plugins.ast[i];
      let env = assign({}, options, { syntax }, { plugins: undefined });

      let pluginResult = transform(env);

      traverse(program, pluginResult.visitors);
    }
  }

  return program;
}