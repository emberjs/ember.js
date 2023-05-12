import type { Nullable, Recast } from '@glimmer/interfaces';
import { getLast, isPresentArray, unwrap } from '@glimmer/util';
import type { TokenizerState } from 'simple-html-tokenizer';

import { Parser, type ParserNodeBuilder, type Tag } from '../parser';
import { NON_EXISTENT_LOCATION } from '../source/location';
import { generateSyntaxError } from '../syntax-error';
import { appendChild, isHBSLiteral, printLiteral } from '../utils';
import type * as ASTv1 from '../v1/api';
import type * as HBS from '../v1/handlebars-ast';
import { PathExpressionImplV1 } from '../v1/legacy-interop';
import b from '../v1/parser-builders';

const BEFORE_ATTRIBUTE_NAME = 'beforeAttributeName' as TokenizerState;
const ATTRIBUTE_VALUE_UNQUOTED = 'attributeValueUnquoted' as TokenizerState;

export abstract class HandlebarsNodeVisitors extends Parser {
  abstract override appendToCommentData(s: string): void;
  abstract override beginAttributeValue(quoted: boolean): void;
  abstract override finishAttributeValue(): void;

  private get isTopLevel() {
    return this.elementStack.length === 0;
  }

  Program(program: HBS.Program): ASTv1.Block;
  Program(program: HBS.Program): ASTv1.Template;
  Program(program: HBS.Program): ASTv1.Template | ASTv1.Block;
  Program(program: HBS.Program): ASTv1.Block | ASTv1.Template {
    const body: ASTv1.Statement[] = [];
    let node;

    if (this.isTopLevel) {
      node = b.template({
        body,
        blockParams: program.blockParams,
        loc: this.source.spanFor(program.loc),
      });
    } else {
      node = b.blockItself({
        body,
        blockParams: program.blockParams,
        chained: program.chained,
        loc: this.source.spanFor(program.loc),
      });
    }

    let i,
      l = program.body.length;

    this.elementStack.push(node);

    if (l === 0) {
      return this.elementStack.pop() as ASTv1.Block | ASTv1.Template;
    }

    for (i = 0; i < l; i++) {
      this.acceptNode(unwrap(program.body[i]));
    }

    // Ensure that that the element stack is balanced properly.
    const poppedNode = this.elementStack.pop();
    if (poppedNode !== node) {
      const elementNode = poppedNode as ASTv1.ElementNode;

      throw generateSyntaxError(`Unclosed element \`${elementNode.tag}\``, elementNode.loc);
    }

    return node;
  }

  BlockStatement(block: HBS.BlockStatement): ASTv1.BlockStatement | void {
    if (this.tokenizer.state === 'comment') {
      this.appendToCommentData(this.sourceForNode(block));
      return;
    }

    if (this.tokenizer.state !== 'data' && this.tokenizer.state !== 'beforeData') {
      throw generateSyntaxError(
        'A block may only be used inside an HTML element or another block.',
        this.source.spanFor(block.loc)
      );
    }

    const { path, params, hash } = acceptCallNodes(this, block);

    // These are bugs in Handlebars upstream
    if (!block.program.loc) {
      block.program.loc = NON_EXISTENT_LOCATION;
    }

    if (block.inverse && !block.inverse.loc) {
      block.inverse.loc = NON_EXISTENT_LOCATION;
    }

    const program = this.Program(block.program);
    const inverse = block.inverse ? this.Program(block.inverse) : null;

    const node = b.block({
      path,
      params,
      hash,
      defaultBlock: program,
      elseBlock: inverse,
      loc: this.source.spanFor(block.loc),
      openStrip: block.openStrip,
      inverseStrip: block.inverseStrip,
      closeStrip: block.closeStrip,
    });

    const parentProgram = this.currentElement();

    appendChild(parentProgram, node);
  }

  MustacheStatement(rawMustache: HBS.MustacheStatement): ASTv1.MustacheStatement | void {
    const { tokenizer } = this;

    if (tokenizer.state === 'comment') {
      this.appendToCommentData(this.sourceForNode(rawMustache));
      return;
    }

    let mustache: ASTv1.MustacheStatement;
    const { escaped, loc, strip } = rawMustache;

    if (isHBSLiteral(rawMustache.path)) {
      mustache = b.mustache({
        path: this.acceptNode<ASTv1.Literal>(rawMustache.path),
        params: [],
        hash: b.hash([], this.source.spanFor(rawMustache.path.loc).collapse('end')),
        trusting: !escaped,
        loc: this.source.spanFor(loc),
        strip,
      });
    } else {
      const { path, params, hash } = acceptCallNodes(
        this,
        rawMustache as HBS.MustacheStatement & {
          path: HBS.PathExpression | HBS.SubExpression;
        }
      );
      mustache = b.mustache({
        path,
        params,
        hash,
        trusting: !escaped,
        loc: this.source.spanFor(loc),
        strip,
      });
    }

    switch (tokenizer.state) {
      // Tag helpers
      case 'tagOpen':
      case 'tagName':
        throw generateSyntaxError(`Cannot use mustaches in an elements tagname`, mustache.loc);

      case 'beforeAttributeName':
        addElementModifier(this.currentStartTag, mustache);
        break;
      case 'attributeName':
      case 'afterAttributeName':
        this.beginAttributeValue(false);
        this.finishAttributeValue();
        addElementModifier(this.currentStartTag, mustache);
        tokenizer.transitionTo(BEFORE_ATTRIBUTE_NAME);
        break;
      case 'afterAttributeValueQuoted':
        addElementModifier(this.currentStartTag, mustache);
        tokenizer.transitionTo(BEFORE_ATTRIBUTE_NAME);
        break;

      // Attribute values
      case 'beforeAttributeValue':
        this.beginAttributeValue(false);
        this.appendDynamicAttributeValuePart(mustache);
        tokenizer.transitionTo(ATTRIBUTE_VALUE_UNQUOTED);
        break;
      case 'attributeValueDoubleQuoted':
      case 'attributeValueSingleQuoted':
      case 'attributeValueUnquoted':
        this.appendDynamicAttributeValuePart(mustache);
        break;

      // TODO: Only append child when the tokenizer state makes
      // sense to do so, otherwise throw an error.
      default:
        appendChild(this.currentElement(), mustache);
    }

    return mustache;
  }

  appendDynamicAttributeValuePart(part: ASTv1.MustacheStatement): void {
    this.finalizeTextPart();
    const attr = this.currentAttr;
    attr.isDynamic = true;
    attr.parts.push(part);
  }

  finalizeTextPart(): void {
    const attr = this.currentAttr;
    const text = attr.currentPart;
    if (text !== null) {
      this.currentAttr.parts.push(text);
      this.startTextPart();
    }
  }

  startTextPart(): void {
    this.currentAttr.currentPart = null;
  }

  ContentStatement(content: HBS.ContentStatement): void {
    updateTokenizerLocation(this.tokenizer, content);

    this.tokenizer.tokenizePart(content.value);
    this.tokenizer.flushData();
  }

  CommentStatement(rawComment: HBS.CommentStatement): Nullable<ASTv1.MustacheCommentStatement> {
    const { tokenizer } = this;

    if (tokenizer.state === 'comment') {
      this.appendToCommentData(this.sourceForNode(rawComment));
      return null;
    }

    const { value, loc } = rawComment;
    const comment = b.mustacheComment(value, this.source.spanFor(loc));

    switch (tokenizer.state) {
      case 'beforeAttributeName':
      case 'afterAttributeName':
        this.currentStartTag.comments.push(comment);
        break;

      case 'beforeData':
      case 'data':
        appendChild(this.currentElement(), comment);
        break;

      default:
        throw generateSyntaxError(
          `Using a Handlebars comment when in the \`${tokenizer['state']}\` state is not supported`,
          this.source.spanFor(rawComment.loc)
        );
    }

    return comment;
  }

  PartialStatement(partial: HBS.PartialStatement): never {
    throw generateSyntaxError(
      `Handlebars partials are not supported`,
      this.source.spanFor(partial.loc)
    );
  }

  PartialBlockStatement(partialBlock: HBS.PartialBlockStatement): never {
    throw generateSyntaxError(
      `Handlebars partial blocks are not supported`,
      this.source.spanFor(partialBlock.loc)
    );
  }

  Decorator(decorator: HBS.Decorator): never {
    throw generateSyntaxError(
      `Handlebars decorators are not supported`,
      this.source.spanFor(decorator.loc)
    );
  }

  DecoratorBlock(decoratorBlock: HBS.DecoratorBlock): never {
    throw generateSyntaxError(
      `Handlebars decorator blocks are not supported`,
      this.source.spanFor(decoratorBlock.loc)
    );
  }

  SubExpression(sexpr: HBS.SubExpression): ASTv1.SubExpression {
    const { path, params, hash } = acceptCallNodes(this, sexpr);
    return b.sexpr({ path, params, hash, loc: this.source.spanFor(sexpr.loc) });
  }

  PathExpression(path: HBS.PathExpression): ASTv1.PathExpression {
    const { original } = path;
    let parts: string[];

    if (original.indexOf('/') !== -1) {
      if (original.slice(0, 2) === './') {
        throw generateSyntaxError(
          `Using "./" is not supported in Glimmer and unnecessary`,
          this.source.spanFor(path.loc)
        );
      }
      if (original.slice(0, 3) === '../') {
        throw generateSyntaxError(
          `Changing context using "../" is not supported in Glimmer`,
          this.source.spanFor(path.loc)
        );
      }
      if (original.indexOf('.') !== -1) {
        throw generateSyntaxError(
          `Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths`,
          this.source.spanFor(path.loc)
        );
      }
      parts = [path.parts.join('/')];
    } else if (original === '.') {
      throw generateSyntaxError(
        `'.' is not a supported path in Glimmer; check for a path with a trailing '.'`,
        this.source.spanFor(path.loc)
      );
    } else {
      parts = path.parts;
    }

    let thisHead = false;

    // This is to fix a bug in the Handlebars AST where the path expressions in
    // `{{this.foo}}` (and similarly `{{foo-bar this.foo named=this.foo}}` etc)
    // are simply turned into `{{foo}}`. The fix is to push it back onto the
    // parts array and let the runtime see the difference. However, we cannot
    // simply use the string `this` as it means literally the property called
    // "this" in the current context (it can be expressed in the syntax as
    // `{{[this]}}`, where the square bracket are generally for this kind of
    // escaping – such as `{{foo.["bar.baz"]}}` would mean lookup a property
    // named literally "bar.baz" on `this.foo`). By convention, we use `null`
    // for this purpose.
    if (/^this(?:\..+)?$/u.test(original)) {
      thisHead = true;
    }

    let pathHead: ASTv1.PathHead;
    if (thisHead) {
      pathHead = {
        type: 'ThisHead',
        loc: {
          start: path.loc.start,
          end: { line: path.loc.start.line, column: path.loc.start.column + 4 },
        },
      };
    } else if (path.data) {
      const head = parts.shift();

      if (head === undefined) {
        throw generateSyntaxError(
          `Attempted to parse a path expression, but it was not valid. Paths beginning with @ must start with a-z.`,
          this.source.spanFor(path.loc)
        );
      }

      pathHead = {
        type: 'AtHead',
        name: `@${head}`,
        loc: {
          start: path.loc.start,
          end: { line: path.loc.start.line, column: path.loc.start.column + head.length + 1 },
        },
      };
    } else {
      const head = parts.shift();

      if (head === undefined) {
        throw generateSyntaxError(
          `Attempted to parse a path expression, but it was not valid. Paths must start with a-z or A-Z.`,
          this.source.spanFor(path.loc)
        );
      }

      pathHead = {
        type: 'VarHead',
        name: head,
        loc: {
          start: path.loc.start,
          end: { line: path.loc.start.line, column: path.loc.start.column + head.length },
        },
      };
    }

    return new PathExpressionImplV1(path.original, pathHead, parts, this.source.spanFor(path.loc));
  }

  Hash(hash: HBS.Hash): ASTv1.Hash {
    const pairs = hash.pairs.map((pair) =>
      b.pair({
        key: pair.key,
        value: this.acceptNode(pair.value),
        loc: this.source.spanFor(pair.loc),
      })
    );

    return b.hash(pairs, this.source.spanFor(hash.loc));
  }

  StringLiteral(string: HBS.StringLiteral): ASTv1.StringLiteral {
    return b.literal({ type: 'StringLiteral', value: string.value, loc: string.loc });
  }

  BooleanLiteral(boolean: HBS.BooleanLiteral): ASTv1.BooleanLiteral {
    return b.literal({ type: 'BooleanLiteral', value: boolean.value, loc: boolean.loc });
  }

  NumberLiteral(number: HBS.NumberLiteral): ASTv1.NumberLiteral {
    return b.literal({ type: 'NumberLiteral', value: number.value, loc: number.loc });
  }

  UndefinedLiteral(undef: HBS.UndefinedLiteral): ASTv1.UndefinedLiteral {
    return b.literal({ type: 'UndefinedLiteral', value: undefined, loc: undef.loc });
  }

  NullLiteral(nul: HBS.NullLiteral): ASTv1.NullLiteral {
    return b.literal({ type: 'NullLiteral', value: null, loc: nul.loc });
  }
}

function calculateRightStrippedOffsets(original: string, value: string) {
  if (value === '') {
    // if it is empty, just return the count of newlines
    // in original
    return {
      lines: original.split('\n').length - 1,
      columns: 0,
    };
  }

  // otherwise, return the number of newlines prior to
  // `value`
  const [difference] = original.split(value) as [string];
  const lines = difference.split(/\n/u);
  const lineCount = lines.length - 1;

  return {
    lines: lineCount,
    columns: unwrap(lines[lineCount]).length,
  };
}

function updateTokenizerLocation(tokenizer: Parser['tokenizer'], content: HBS.ContentStatement) {
  let line = content.loc.start.line;
  let column = content.loc.start.column;

  const offsets = calculateRightStrippedOffsets(
    content.original as Recast<HBS.StripFlags, string>,
    content.value
  );

  line = line + offsets.lines;
  if (offsets.lines) {
    column = offsets.columns;
  } else {
    column = column + offsets.columns;
  }

  tokenizer.line = line;
  tokenizer.column = column;
}

function acceptCallNodes(
  compiler: HandlebarsNodeVisitors,
  node: {
    path:
      | HBS.PathExpression
      | HBS.SubExpression
      | HBS.StringLiteral
      | HBS.UndefinedLiteral
      | HBS.NullLiteral
      | HBS.NumberLiteral
      | HBS.BooleanLiteral;
    params: HBS.Expression[];
    hash: HBS.Hash;
  }
): {
  path: ASTv1.PathExpression | ASTv1.SubExpression;
  params: ASTv1.Expression[];
  hash: ASTv1.Hash;
} {
  if (node.path.type.endsWith('Literal')) {
    const path = node.path as unknown as
      | HBS.StringLiteral
      | HBS.UndefinedLiteral
      | HBS.NullLiteral
      | HBS.NumberLiteral
      | HBS.BooleanLiteral;

    let value = '';
    if (path.type === 'BooleanLiteral') {
      value = path.original.toString();
    } else if (path.type === 'StringLiteral') {
      value = `"${path.original}"`;
    } else if (path.type === 'NullLiteral') {
      value = 'null';
    } else if (path.type === 'NumberLiteral') {
      value = path.value.toString();
    } else {
      value = 'undefined';
    }
    throw generateSyntaxError(
      `${path.type} "${
        path.type === 'StringLiteral' ? path.original : value
      }" cannot be called as a sub-expression, replace (${value}) with ${value}`,
      compiler.source.spanFor(path.loc)
    );
  }

  const path =
    node.path.type === 'PathExpression'
      ? compiler.PathExpression(node.path)
      : compiler.SubExpression(node.path as unknown as HBS.SubExpression);
  const params = node.params
    ? node.params.map((e) => compiler.acceptNode<ASTv1.Expression>(e))
    : [];

  // if there is no hash, position it as a collapsed node immediately after the last param (or the
  // path, if there are also no params)
  const end = isPresentArray(params) ? getLast(params).loc : path.loc;

  const hash = node.hash
    ? compiler.Hash(node.hash)
    : ({
        type: 'Hash',
        pairs: [] as ASTv1.HashPair[],
        loc: compiler.source.spanFor(end).collapse('end'),
      } as const);

  return { path, params, hash };
}

function addElementModifier(
  element: ParserNodeBuilder<Tag<'StartTag'>>,
  mustache: ASTv1.MustacheStatement
) {
  const { path, params, hash, loc } = mustache;

  if (isHBSLiteral(path)) {
    const modifier = `{{${printLiteral(path)}}}`;
    const tag = `<${element.name} ... ${modifier} ...`;

    throw generateSyntaxError(`In ${tag}, ${modifier} is not a valid modifier`, mustache.loc);
  }

  const modifier = b.elementModifier({ path, params, hash, loc });
  element.modifiers.push(modifier);
}
