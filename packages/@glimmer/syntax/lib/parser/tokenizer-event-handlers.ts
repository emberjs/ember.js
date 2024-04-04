import type { Nullable } from '@glimmer/interfaces';
import type { TokenizerState } from 'simple-html-tokenizer';
import {
  asPresentArray,
  assert,
  assertPresentArray,
  assign,
  getFirst,
  getLast,
  isPresentArray,
} from '@glimmer/util';
import { parse, parseWithoutProcessing } from '@handlebars/parser';
import { EntityParser } from 'simple-html-tokenizer';

import type { EndTag, StartTag } from '../parser';
import type { NodeVisitor } from '../traversal/visitor';
import type * as ASTv1 from '../v1/api';
import type * as HBS from '../v1/handlebars-ast';

import print from '../generation/print';
import { voidMap } from '../generation/printer';
import * as src from '../source/api';
import { generateSyntaxError } from '../syntax-error';
import traverse from '../traversal/traverse';
import Walker from '../traversal/walker';
import { appendChild } from '../utils';
import b from '../v1/parser-builders';
import publicBuilder from '../v1/public-builders';
import { HandlebarsNodeVisitors } from './handlebars-node-visitors';

// vendored from simple-html-tokenizer because it's unexported
function isSpace(char: string): boolean {
  return /[\t\n\f ]/u.test(char);
}

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
      nameStart: null,
      nameEnd: null,
      attributes: [],
      modifiers: [],
      comments: [],
      params: [],
      selfClosing: false,
      start: this.source.offsetFor(this.tagOpenLine, this.tagOpenColumn),
    };
  }

  beginEndTag(): void {
    this.currentNode = {
      type: 'EndTag',
      name: '',
      start: this.source.offsetFor(this.tagOpenLine, this.tagOpenColumn),
    };
  }

  finishTag(): void {
    let tag = this.finish<StartTag | EndTag>(this.currentTag);

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
    let { name, nameStart, nameEnd } = this.currentStartTag;

    // <> should probably be a syntax error, but s-h-t is currently broken for that case
    assert(name !== '', 'tag name cannot be empty');
    assert(nameStart !== null, 'nameStart unexpectedly null');
    assert(nameEnd !== null, 'nameEnd unexpectedly null');

    let nameLoc = nameStart.until(nameEnd);
    let [head, ...tail] = asPresentArray(name.split('.'));
    let path = b.path({
      head: b.head({ original: head, loc: nameLoc.sliceStartChars({ chars: head.length }) }),
      tail,
      loc: nameLoc,
    });

    let { attributes, modifiers, comments, params, selfClosing, loc } = this.finish(
      this.currentStartTag
    );

    let element = b.element({
      path,
      selfClosing,
      attributes,
      modifiers,
      comments,
      params,
      children: [],
      openTag: loc,
      closeTag: selfClosing ? null : src.SourceSpan.broken(),
      loc,
    });
    this.elementStack.push(element);
  }

  finishEndTag(isVoid: boolean): void {
    let { start: closeTagStart } = this.currentTag;
    let tag = this.finish<StartTag | EndTag>(this.currentTag);

    let element = this.elementStack.pop() as ASTv1.ElementNode;

    this.validateEndTag(tag, element, isVoid);
    let parent = this.currentElement();

    if (isVoid) {
      element.closeTag = null;
    } else if (element.selfClosing) {
      assert(element.closeTag === null, 'element.closeTag unexpectedly present');
    } else {
      element.closeTag = closeTagStart.until(this.offset());
    }

    element.loc = element.loc.withEnd(this.offset());

    appendChild(parent, b.element(element));
  }

  markTagAsSelfClosing(): void {
    let tag = this.currentTag;

    if (tag.type === 'StartTag') {
      tag.selfClosing = true;
    } else {
      throw generateSyntaxError(
        `Invalid end tag: closing tag must not be self-closing`,
        this.source.spanFor({ start: tag.start.toJSON(), end: this.offset().toJSON() })
      );
    }
  }

  // Tags - name

  appendToTagName(char: string): void {
    let tag = this.currentTag;
    tag.name += char;

    if (tag.type === 'StartTag') {
      let offset = this.offset();

      if (tag.nameStart === null) {
        assert(tag.nameEnd === null, 'nameStart and nameEnd must both be null');

        // Note that the tokenizer already consumed the token here
        tag.nameStart = offset.move(-1);
      }

      tag.nameEnd = offset;
    }
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

    // The block params parsing code can actually handle peek=non-space just
    // fine, but this check was added as an optimization, as there is a little
    // bit of setup overhead for the parsing logic just to immediately bail
    if (this.currentAttr.name === 'as') {
      this.parsePossibleBlockParams();
    }
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

    // Just trying to be helpful with `<Hello |foo|>` rather than letting it through as an attribute
    if (name.startsWith('|') && parts.length === 0 && !isQuoted && !isDynamic) {
      throw generateSyntaxError(
        'Invalid block parameters syntax: block parameters must be preceded by the `as` keyword',
        start.until(start.move(name.length))
      );
    }

    let value = this.assembleAttributeValue(parts, isQuoted, isDynamic, start.until(tokenizerPos));
    value.loc = valueSpan.withEnd(tokenizerPos);

    let attribute = b.attr({ name, value, loc: start.until(tokenizerPos) });

    this.currentStartTag.attributes.push(attribute);
  }

  private parsePossibleBlockParams() {
    // const enums that we can't use directly
    const BEFORE_ATTRIBUTE_NAME = 'beforeAttributeName' as TokenizerState.beforeAttributeName;
    const ATTRIBUTE_NAME = 'attributeName' as TokenizerState.attributeName;
    const AFTER_ATTRIBUTE_NAME = 'afterAttributeName' as TokenizerState.afterAttributeName;

    // Regex to validate the identifier for block parameters.
    // Based on the ID validation regex in Handlebars.
    const ID_INVERSE_PATTERN = /[!"#%&'()*+./;<=>@[\\\]^`{|}~]/u;

    type States = {
      PossibleAs: { state: 'PossibleAs' };
      BeforeStartPipe: { state: 'BeforeStartPipe' };
      BeforeBlockParamName: { state: 'BeforeBlockParamName' };
      BlockParamName: {
        state: 'BlockParamName';
        name: string;
        start: src.SourceOffset;
      };
      AfterEndPipe: { state: 'AfterEndPipe' };
      Error: {
        state: 'Error';
        message: string;
        start: src.SourceOffset;
      };
      Done: { state: 'Done' };
    };

    type State = States[keyof States];

    type Handler = (next: string) => void;

    assert(this.tokenizer.state === ATTRIBUTE_NAME, 'must be in TokenizerState.attributeName');

    const element = this.currentStartTag;
    const as = this.currentAttr;

    let state = { state: 'PossibleAs' } as State;

    const handlers = {
      PossibleAs: (next: string) => {
        assert(state.state === 'PossibleAs', 'bug in block params parser');

        if (isSpace(next)) {
          // " as ..."
          state = { state: 'BeforeStartPipe' };
          this.tokenizer.transitionTo(AFTER_ATTRIBUTE_NAME);
          this.tokenizer.consume();
        } else if (next === '|') {
          // " as|..."
          // Following Handlebars and require a space between "as" and the pipe
          throw generateSyntaxError(
            `Invalid block parameters syntax: expecting at least one space character between "as" and "|"`,
            as.start.until(this.offset().move(1))
          );
        } else {
          // " as{{...", " async...", " as=...", " as>...", " as/>..."
          // Don't consume, let the normal tokenizer code handle the next steps
          state = { state: 'Done' };
        }
      },

      BeforeStartPipe: (next: string) => {
        assert(state.state === 'BeforeStartPipe', 'bug in block params parser');

        if (isSpace(next)) {
          this.tokenizer.consume();
        } else if (next === '|') {
          state = { state: 'BeforeBlockParamName' };
          this.tokenizer.transitionTo(BEFORE_ATTRIBUTE_NAME);
          this.tokenizer.consume();
        } else {
          // " as {{...", " as bs...", " as =...", " as ...", " as/>..."
          // Don't consume, let the normal tokenizer code handle the next steps
          state = { state: 'Done' };
        }
      },

      BeforeBlockParamName: (next: string) => {
        assert(state.state === 'BeforeBlockParamName', 'bug in block params parser');

        if (isSpace(next)) {
          this.tokenizer.consume();
        } else if (next === '') {
          // The HTML tokenizer ran out of characters, so we are either
          // encountering mustache or <EOF>
          state = { state: 'Done' };
          this.pendingError = {
            mustache(loc: src.SourceSpan) {
              throw generateSyntaxError(
                `Invalid block parameters syntax: mustaches cannot be used inside parameters list`,
                loc
              );
            },
            eof(loc: src.SourceOffset) {
              throw generateSyntaxError(
                `Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list`,
                as.start.until(loc)
              );
            },
          };
        } else if (next === '|') {
          if (element.params.length === 0) {
            // Following Handlebars and treat empty block params a syntax error
            throw generateSyntaxError(
              `Invalid block parameters syntax: empty parameters list, expecting at least one identifier`,
              as.start.until(this.offset().move(1))
            );
          } else {
            state = { state: 'AfterEndPipe' };
            this.tokenizer.consume();
          }
        } else if (next === '>' || next === '/') {
          throw generateSyntaxError(
            `Invalid block parameters syntax: incomplete parameters list, expecting "|" but the tag was closed prematurely`,
            as.start.until(this.offset().move(1))
          );
        } else {
          // slurp up anything else into the name, validate later
          state = {
            state: 'BlockParamName',
            name: next,
            start: this.offset(),
          };
          this.tokenizer.consume();
        }
      },

      BlockParamName: (next: string) => {
        assert(state.state === 'BlockParamName', 'bug in block params parser');

        if (next === '') {
          // The HTML tokenizer ran out of characters, so we are either
          // encountering mustache or <EOF>, HBS side will attach the error
          // to the next span
          state = { state: 'Done' };
          this.pendingError = {
            mustache(loc: src.SourceSpan) {
              throw generateSyntaxError(
                `Invalid block parameters syntax: mustaches cannot be used inside parameters list`,
                loc
              );
            },
            eof(loc: src.SourceOffset) {
              throw generateSyntaxError(
                `Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list`,
                as.start.until(loc)
              );
            },
          };
        } else if (next === '|' || isSpace(next)) {
          let loc = state.start.until(this.offset());

          if (state.name === 'this' || ID_INVERSE_PATTERN.test(state.name)) {
            throw generateSyntaxError(
              `Invalid block parameters syntax: invalid identifier name \`${state.name}\``,
              loc
            );
          }

          element.params.push(b.var({ name: state.name, loc }));

          state = next === '|' ? { state: 'AfterEndPipe' } : { state: 'BeforeBlockParamName' };
          this.tokenizer.consume();
        } else if (next === '>' || next === '/') {
          throw generateSyntaxError(
            `Invalid block parameters syntax: expecting "|" but the tag was closed prematurely`,
            as.start.until(this.offset().move(1))
          );
        } else {
          // slurp up anything else into the name, validate later
          state.name += next;
          this.tokenizer.consume();
        }
      },

      AfterEndPipe: (next: string) => {
        assert(state.state === 'AfterEndPipe', 'bug in block params parser');

        if (isSpace(next)) {
          this.tokenizer.consume();
        } else if (next === '') {
          // The HTML tokenizer ran out of characters, so we are either
          // encountering mustache or <EOF>, HBS side will attach the error
          // to the next span
          state = { state: 'Done' };
          this.pendingError = {
            mustache(loc: src.SourceSpan) {
              throw generateSyntaxError(
                `Invalid block parameters syntax: modifiers cannot follow parameters list`,
                loc
              );
            },
            eof(loc: src.SourceOffset) {
              throw generateSyntaxError(
                `Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list`,
                as.start.until(loc)
              );
            },
          };
        } else if (next === '>' || next === '/') {
          // Don't consume, let the normal tokenizer code handle the next steps
          state = { state: 'Done' };
        } else {
          // Slurp up the next "token" for the error span
          state = {
            state: 'Error',
            message:
              'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
            start: this.offset(),
          };
          this.tokenizer.consume();
        }
      },

      Error: (next: string) => {
        assert(state.state === 'Error', 'bug in block params parser');

        if (next === '' || next === '/' || next === '>' || isSpace(next)) {
          throw generateSyntaxError(state.message, state.start.until(this.offset()));
        } else {
          // Slurp up the next "token" for the error span
          this.tokenizer.consume();
        }
      },

      Done: () => {
        assert(false, 'This should never be called');
      },
    } as const satisfies {
      [S in keyof States]: Handler;
    };

    let next: string;

    do {
      next = this.tokenizer.peek();
      handlers[state.state](next);
    } while (state.state !== 'Done' && next !== '');

    assert(state.state === 'Done', 'bug in block params parser');
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

  validateEndTag(tag: StartTag | EndTag, element: ASTv1.ElementNode, selfClosing: boolean): void {
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

  let template = new TokenizerEventHandlers(source, entityParser, mode).parse(
    ast,
    options.locals ?? []
  );

  if (options?.plugins?.ast) {
    for (const transform of options.plugins.ast) {
      let env: ASTPluginEnvironment = assign({}, options, { syntax }, { plugins: undefined });

      let pluginResult = transform(env);

      traverse(template, pluginResult.visitor);
    }
  }

  return template;
}
