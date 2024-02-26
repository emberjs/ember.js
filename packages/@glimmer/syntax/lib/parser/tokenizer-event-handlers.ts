import type { Nullable } from '@glimmer/interfaces';
import { assertPresentArray, assign, getFirst, getLast, isPresentArray } from '@glimmer/util';
import { parse, parseWithoutProcessing } from '@handlebars/parser';
import { EntityParser } from 'simple-html-tokenizer';

import type { Tag } from '../parser';
import type { NodeVisitor } from '../traversal/visitor';
import type * as ASTv1 from '../v1/api';
import type * as HBS from '../v1/handlebars-ast';

import print from '../generation/print';
import { voidMap } from '../generation/printer';
import * as src from '../source/api';
import { generateSyntaxError } from '../syntax-error';
import traverse from '../traversal/traverse';
import Walker from '../traversal/walker';
import { appendChild, parseElementBlockParams } from '../utils';
import b from '../v1/parser-builders';
import publicBuilder from '../v1/public-builders';
import { HandlebarsNodeVisitors } from './handlebars-node-visitors';

export class TokenizerEventHandlers extends HandlebarsNodeVisitors {
  private tagOpenLine = 0;
  private tagOpenColumn = 0;

  reset(): void {
    this.currentNode = null;
  }

  // Comment

  beginComment(): void {
    this.currentNode = {
      type: 'CommentStatement',
      value: '',
      start: this.source.offsetFor(this.tagOpenLine, this.tagOpenColumn),
    };
  }

  appendToCommentData(char: string): void {
    this.currentComment.value += char;
  }

  finishComment(): void {
    appendChild(this.currentElement(), b.comment(this.finish(this.currentComment)));
  }

  // Data

  beginData(): void {
    this.currentNode = {
      type: 'TextNode',
      chars: '',
      start: this.offset(),
    };
  }

  appendToData(char: string): void {
    this.currentData.chars += char;
  }

  finishData(): void {
    appendChild(this.currentElement(), b.text(this.finish(this.currentData)));
  }

  // Tags - basic

  tagOpen(): void {
    this.tagOpenLine = this.tokenizer.line;
    this.tagOpenColumn = this.tokenizer.column;
  }

  beginStartTag(): void {
    this.currentNode = {
      type: 'StartTag',
      name: '',
      attributes: [],
      modifiers: [],
      comments: [],
      selfClosing: false,
      start: this.source.offsetFor(this.tagOpenLine, this.tagOpenColumn),
    };
  }

  beginEndTag(): void {
    this.currentNode = {
      type: 'EndTag',
      name: '',
      attributes: [],
      modifiers: [],
      comments: [],
      selfClosing: false,
      start: this.source.offsetFor(this.tagOpenLine, this.tagOpenColumn),
    };
  }

  finishTag(): void {
    let tag = this.finish(this.currentTag);

    if (tag.type === 'StartTag') {
      this.finishStartTag();

      if (tag.name === ':') {
        throw generateSyntaxError(
          'Invalid named block named detected, you may have created a named block without a name, or you may have began your name with a number. Named blocks must have names that are at least one character long, and begin with a lower case letter',
          this.source.spanFor({
            start: this.currentTag.start.toJSON(),
            end: this.offset().toJSON(),
          })
        );
      }

      if (voidMap.has(tag.name) || tag.selfClosing) {
        this.finishEndTag(true);
      }
    } else if (tag.type === 'EndTag') {
      this.finishEndTag(false);
    }
  }

  finishStartTag(): void {
    let { name, attributes, modifiers, comments, selfClosing, loc } = this.finish(
      this.currentStartTag
    );

    let element = b.element({
      tag: name,
      selfClosing,
      attributes,
      modifiers,
      comments,
      children: [],
      blockParams: [],
      loc,
    });
    this.elementStack.push(element);
  }

  finishEndTag(isVoid: boolean): void {
    let tag = this.finish(this.currentTag);

    let element = this.elementStack.pop() as ASTv1.ElementNode;

    this.validateEndTag(tag, element, isVoid);
    let parent = this.currentElement();

    element.loc = element.loc.withEnd(this.offset());
    parseElementBlockParams(element);
    appendChild(parent, b.element(element));
  }

  markTagAsSelfClosing(): void {
    this.currentTag.selfClosing = true;
  }

  // Tags - name

  appendToTagName(char: string): void {
    this.currentTag.name += char;
  }

  // Tags - attributes

  beginAttribute(): void {
    let offset = this.offset();

    this.currentAttribute = {
      name: '',
      parts: [],
      currentPart: null,
      isQuoted: false,
      isDynamic: false,
      start: offset,
      valueSpan: offset.collapsed(),
    };
  }

  appendToAttributeName(char: string): void {
    this.currentAttr.name += char;
  }

  beginAttributeValue(isQuoted: boolean): void {
    this.currentAttr.isQuoted = isQuoted;
    this.startTextPart();
    this.currentAttr.valueSpan = this.offset().collapsed();
  }

  appendToAttributeValue(char: string): void {
    let parts = this.currentAttr.parts;
    let lastPart = parts[parts.length - 1];

    let current = this.currentAttr.currentPart;

    if (current) {
      current.chars += char;

      // update end location for each added char
      current.loc = current.loc.withEnd(this.offset());
    } else {
      // initially assume the text node is a single char
      let loc: src.SourceOffset = this.offset();

      // the tokenizer line/column have already been advanced, correct location info
      if (char === '\n') {
        loc = lastPart ? lastPart.loc.getEnd() : this.currentAttr.valueSpan.getStart();
      } else {
        loc = loc.move(-1);
      }

      this.currentAttr.currentPart = b.text({ chars: char, loc: loc.collapsed() });
    }
  }

  finishAttributeValue(): void {
    this.finalizeTextPart();

    let tag = this.currentTag;
    let tokenizerPos = this.offset();

    if (tag.type === 'EndTag') {
      throw generateSyntaxError(
        `Invalid end tag: closing tag must not have attributes`,
        this.source.spanFor({ start: tag.start.toJSON(), end: tokenizerPos.toJSON() })
      );
    }

    let { name, parts, start, isQuoted, isDynamic, valueSpan } = this.currentAttr;
    let value = this.assembleAttributeValue(parts, isQuoted, isDynamic, start.until(tokenizerPos));
    value.loc = valueSpan.withEnd(tokenizerPos);

    let attribute = b.attr({ name, value, loc: start.until(tokenizerPos) });

    this.currentStartTag.attributes.push(attribute);
  }

  reportSyntaxError(message: string): void {
    throw generateSyntaxError(message, this.offset().collapsed());
  }

  assembleConcatenatedValue(
    parts: (ASTv1.MustacheStatement | ASTv1.TextNode)[]
  ): ASTv1.ConcatStatement {
    for (const part of parts) {
      if (part.type !== 'MustacheStatement' && part.type !== 'TextNode') {
        throw generateSyntaxError(
          `Unsupported node in quoted attribute value: ${part['type'] as string}`,
          (part as ASTv1.BaseNode).loc
        );
      }
    }

    assertPresentArray(parts, `the concatenation parts of an element should not be empty`);

    let first = getFirst(parts);
    let last = getLast(parts);

    return b.concat({
      parts,
      loc: this.source.spanFor(first.loc).extend(this.source.spanFor(last.loc)),
    });
  }

  validateEndTag(
    tag: Tag<'StartTag' | 'EndTag'>,
    element: ASTv1.ElementNode,
    selfClosing: boolean
  ): void {
    if (voidMap.has(tag.name) && !selfClosing) {
      // EngTag is also called by StartTag for void and self-closing tags (i.e.
      // <input> or <br />, so we need to check for that here. Otherwise, we would
      // throw an error for those cases.
      throw generateSyntaxError(
        `<${tag.name}> elements do not need end tags. You should remove it`,
        tag.loc
      );
    } else if (element.tag === undefined) {
      throw generateSyntaxError(`Closing tag </${tag.name}> without an open tag`, tag.loc);
    } else if (element.tag !== tag.name) {
      throw generateSyntaxError(
        `Closing tag </${tag.name}> did not match last open tag <${element.tag}> (on line ${element.loc.startPosition.line})`,
        tag.loc
      );
    }
  }

  assembleAttributeValue(
    parts: ASTv1.AttrPart[],
    isQuoted: boolean,
    isDynamic: boolean,
    span: src.SourceSpan
  ): ASTv1.AttrValue {
    if (isDynamic) {
      if (isQuoted) {
        return this.assembleConcatenatedValue(parts);
      } else {
        assertPresentArray(parts);

        const [head, a] = parts;
        if (a === undefined || (a.type === 'TextNode' && a.chars === '/')) {
          return head;
        } else {
          throw generateSyntaxError(
            `An unquoted attribute value must be a string or a mustache, ` +
              `preceded by whitespace or a '=' character, and ` +
              `followed by whitespace, a '>' character, or '/>'`,
            span
          );
        }
      }
    } else if (isPresentArray(parts)) {
      return parts[0];
    } else {
      return b.text({ chars: '', loc: span });
    }
  }
}

/**
  ASTPlugins can make changes to the Glimmer template AST before
  compilation begins.
*/
export interface ASTPluginBuilder<TEnv extends ASTPluginEnvironment = ASTPluginEnvironment> {
  (env: TEnv): ASTPlugin;
}

export interface ASTPlugin {
  name: string;
  visitor: NodeVisitor;
}

export interface ASTPluginEnvironment {
  meta?: object;
  syntax: Syntax;
}

interface HandlebarsParseOptions {
  srcName?: string;
  ignoreStandalone?: boolean;
}

export interface TemplateIdFn {
  (src: string): Nullable<string>;
}

export interface PrecompileOptions extends PreprocessOptions {
  id?: TemplateIdFn;
  customizeComponentName?: ((input: string) => string) | undefined;
}

export interface PrecompileOptionsWithLexicalScope extends PrecompileOptions {
  lexicalScope: (variable: string) => boolean;
}

export interface PreprocessOptions {
  strictMode?: boolean;
  locals?: string[];
  meta?: {
    moduleName?: string;
  };
  plugins?: {
    ast?: ASTPluginBuilder[];
  };
  parseOptions?: HandlebarsParseOptions;
  customizeComponentName?: ((input: string) => string) | undefined;

  /**
    Useful for specifying a group of options together.

    When `'codemod'` we disable all whitespace control in handlebars
    (to preserve as much as possible) and we also avoid any
    escaping/unescaping of HTML entity codes.
   */
  mode?: 'codemod' | 'precompile';
}

export interface Syntax {
  parse: typeof preprocess;
  builders: typeof publicBuilder;
  print: typeof print;
  traverse: typeof traverse;
  Walker: typeof Walker;
}

const syntax: Syntax = {
  parse: preprocess,
  builders: publicBuilder,
  print,
  traverse,
  Walker,
};

class CodemodEntityParser extends EntityParser {
  // match upstream types, but never match an entity
  constructor() {
    super({});
  }

  override parse(): string | undefined {
    return undefined;
  }
}

export function preprocess(
  input: string | src.Source | HBS.Program,
  options: PreprocessOptions = {}
): ASTv1.Template {
  let mode = options.mode || 'precompile';

  let source: src.Source;
  let ast: HBS.Program;
  if (typeof input === 'string') {
    source = new src.Source(input, options.meta?.moduleName);

    if (mode === 'codemod') {
      ast = parseWithoutProcessing(input, options.parseOptions) as HBS.Program;
    } else {
      ast = parse(input, options.parseOptions) as HBS.Program;
    }
  } else if (input instanceof src.Source) {
    source = input;

    if (mode === 'codemod') {
      ast = parseWithoutProcessing(input.source, options.parseOptions) as HBS.Program;
    } else {
      ast = parse(input.source, options.parseOptions) as HBS.Program;
    }
  } else {
    source = new src.Source('', options.meta?.moduleName);
    ast = input;
  }

  let entityParser = undefined;
  if (mode === 'codemod') {
    entityParser = new CodemodEntityParser();
  }

  let offsets = src.SourceSpan.forCharPositions(source, 0, source.source.length);
  ast.loc = {
    source: '(program)',
    start: offsets.startPosition,
    end: offsets.endPosition,
  };

  let template = new TokenizerEventHandlers(source, entityParser, mode).acceptTemplate(ast);

  if (options.strictMode && options.locals?.length) {
    template = b.template({ ...template, locals: options.locals });
  }

  if (options?.plugins?.ast) {
    for (const transform of options.plugins.ast) {
      let env: ASTPluginEnvironment = assign({}, options, { syntax }, { plugins: undefined });

      let pluginResult = transform(env);

      traverse(template, pluginResult.visitor);
    }
  }

  return template;
}
