import { Option, Recast } from '@glimmer/interfaces';
import { TokenizerState } from 'simple-html-tokenizer';

import { Parser, ParserNodeBuilder, Tag } from '../parser';
import { NON_EXISTENT_LOCATION } from '../source/location';
import { GlimmerSyntaxError } from '../syntax-error';
import { appendChild, isHBSLiteral, printLiteral } from '../utils';
import * as ASTv1 from '../v1/api';
import * as HBS from '../v1/handlebars-ast';
import { PathExpressionImplV1 } from '../v1/legacy-interop';
import b from '../v1/parser-builders';

export abstract class HandlebarsNodeVisitors extends Parser {
  abstract appendToCommentData(s: string): void;
  abstract beginAttributeValue(quoted: boolean): void;
  abstract finishAttributeValue(): void;

  private get isTopLevel() {
    return this.elementStack.length === 0;
  }

  Program(program: HBS.Program): ASTv1.Block;
  Program(program: HBS.Program): ASTv1.Template;
  Program(program: HBS.Program): ASTv1.Template | ASTv1.Block;
  Program(program: HBS.Program): ASTv1.Block | ASTv1.Template {
    let body: ASTv1.Statement[] = [];
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
      this.acceptNode(program.body[i]);
    }

    // Ensure that that the element stack is balanced properly.
    let poppedNode = this.elementStack.pop();
    if (poppedNode !== node) {
      let elementNode = poppedNode as ASTv1.ElementNode;

      throw new GlimmerSyntaxError(`Unclosed element \`${elementNode.tag}\``, elementNode.loc);
    }

    return node;
  }

  BlockStatement(block: HBS.BlockStatement): ASTv1.BlockStatement | void {
    if (this.tokenizer.state === TokenizerState.comment) {
      this.appendToCommentData(this.sourceForNode(block));
      return;
    }

    if (
      this.tokenizer.state !== TokenizerState.data &&
      this.tokenizer.state !== TokenizerState.beforeData
    ) {
      throw new GlimmerSyntaxError(
        'A block may only be used inside an HTML element or another block.',
        this.source.spanFor(block.loc)
      );
    }

    let { path, params, hash } = acceptCallNodes(this, block);

    // These are bugs in Handlebars upstream
    if (!block.program.loc) {
      block.program.loc = NON_EXISTENT_LOCATION;
    }

    if (block.inverse && !block.inverse.loc) {
      block.inverse.loc = NON_EXISTENT_LOCATION;
    }

    let program = this.Program(block.program);
    let inverse = block.inverse ? this.Program(block.inverse) : null;

    let node = b.block({
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

    let parentProgram = this.currentElement();

    appendChild(parentProgram, node);
  }

  MustacheStatement(rawMustache: HBS.MustacheStatement): ASTv1.MustacheStatement | void {
    let { tokenizer } = this;

    if (tokenizer.state === 'comment') {
      this.appendToCommentData(this.sourceForNode(rawMustache));
      return;
    }

    let mustache: ASTv1.MustacheStatement;
    let { escaped, loc, strip } = rawMustache;

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
      let { path, params, hash } = acceptCallNodes(
        this,
        rawMustache as HBS.MustacheStatement & {
          path: HBS.PathExpression;
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
      case TokenizerState.tagOpen:
      case TokenizerState.tagName:
        throw new GlimmerSyntaxError(`Cannot use mustaches in an elements tagname`, mustache.loc);

      case TokenizerState.beforeAttributeName:
        addElementModifier(this.currentStartTag, mustache);
        break;
      case TokenizerState.attributeName:
      case TokenizerState.afterAttributeName:
        this.beginAttributeValue(false);
        this.finishAttributeValue();
        addElementModifier(this.currentStartTag, mustache);
        tokenizer.transitionTo(TokenizerState.beforeAttributeName);
        break;
      case TokenizerState.afterAttributeValueQuoted:
        addElementModifier(this.currentStartTag, mustache);
        tokenizer.transitionTo(TokenizerState.beforeAttributeName);
        break;

      // Attribute values
      case TokenizerState.beforeAttributeValue:
        this.beginAttributeValue(false);
        this.appendDynamicAttributeValuePart(mustache);
        tokenizer.transitionTo(TokenizerState.attributeValueUnquoted);
        break;
      case TokenizerState.attributeValueDoubleQuoted:
      case TokenizerState.attributeValueSingleQuoted:
      case TokenizerState.attributeValueUnquoted:
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
    let attr = this.currentAttr;
    attr.isDynamic = true;
    attr.parts.push(part);
  }

  finalizeTextPart(): void {
    let attr = this.currentAttr;
    let text = attr.currentPart;
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

  CommentStatement(rawComment: HBS.CommentStatement): Option<ASTv1.MustacheCommentStatement> {
    let { tokenizer } = this;

    if (tokenizer.state === TokenizerState.comment) {
      this.appendToCommentData(this.sourceForNode(rawComment));
      return null;
    }

    let { value, loc } = rawComment;
    let comment = b.mustacheComment(value, this.source.spanFor(loc));

    switch (tokenizer.state) {
      case TokenizerState.beforeAttributeName:
        this.currentStartTag.comments.push(comment);
        break;

      case TokenizerState.beforeData:
      case TokenizerState.data:
        appendChild(this.currentElement(), comment);
        break;

      default:
        throw new GlimmerSyntaxError(
          `Using a Handlebars comment when in the \`${tokenizer['state']}\` state is not supported`,
          this.source.spanFor(rawComment.loc)
        );
    }

    return comment;
  }

  PartialStatement(partial: HBS.PartialStatement): never {
    throw new GlimmerSyntaxError(
      `Handlebars partials are not supported`,
      this.source.spanFor(partial.loc)
    );
  }

  PartialBlockStatement(partialBlock: HBS.PartialBlockStatement): never {
    throw new GlimmerSyntaxError(
      `Handlebars partial blocks are not supported`,
      this.source.spanFor(partialBlock.loc)
    );
  }

  Decorator(decorator: HBS.Decorator): never {
    throw new GlimmerSyntaxError(
      `Handlebars decorators are not supported`,
      this.source.spanFor(decorator.loc)
    );
  }

  DecoratorBlock(decoratorBlock: HBS.DecoratorBlock): never {
    throw new GlimmerSyntaxError(
      `Handlebars decorator blocks are not supported`,
      this.source.spanFor(decoratorBlock.loc)
    );
  }

  SubExpression(sexpr: HBS.SubExpression): ASTv1.SubExpression {
    let { path, params, hash } = acceptCallNodes(this, sexpr);
    return b.sexpr({ path, params, hash, loc: this.source.spanFor(sexpr.loc) });
  }

  PathExpression(path: HBS.PathExpression): ASTv1.PathExpression {
    let { original } = path;
    let parts: string[];

    if (original.indexOf('/') !== -1) {
      if (original.slice(0, 2) === './') {
        throw new GlimmerSyntaxError(
          `Using "./" is not supported in Glimmer and unnecessary`,
          this.source.spanFor(path.loc)
        );
      }
      if (original.slice(0, 3) === '../') {
        throw new GlimmerSyntaxError(
          `Changing context using "../" is not supported in Glimmer`,
          this.source.spanFor(path.loc)
        );
      }
      if (original.indexOf('.') !== -1) {
        throw new GlimmerSyntaxError(
          `Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths`,
          this.source.spanFor(path.loc)
        );
      }
      parts = [path.parts.join('/')];
    } else if (original === '.') {
      throw new GlimmerSyntaxError(
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
    if (original.match(/^this(\..+)?$/)) {
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
      let head = parts.shift();

      if (head === undefined) {
        throw new GlimmerSyntaxError(
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
      let head = parts.shift();

      if (head === undefined) {
        throw new GlimmerSyntaxError(
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
    let pairs: ASTv1.HashPair[] = [];

    for (let i = 0; i < hash.pairs.length; i++) {
      let pair = hash.pairs[i];
      pairs.push(
        b.pair({
          key: pair.key,
          value: this.acceptNode(pair.value),
          loc: this.source.spanFor(pair.loc),
        })
      );
    }

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
  let difference = original.split(value)[0];
  let lines = difference.split(/\n/);
  let lineCount = lines.length - 1;

  return {
    lines: lineCount,
    columns: lines[lineCount].length,
  };
}

function updateTokenizerLocation(tokenizer: Parser['tokenizer'], content: HBS.ContentStatement) {
  let line = content.loc.start.line;
  let column = content.loc.start.column;

  let offsets = calculateRightStrippedOffsets(
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
    path: HBS.PathExpression;
    params: HBS.Expression[];
    hash: HBS.Hash;
  }
): { path: ASTv1.PathExpression; params: ASTv1.Expression[]; hash: ASTv1.Hash } {
  let path = compiler.PathExpression(node.path);
  let params = node.params ? node.params.map((e) => compiler.acceptNode<ASTv1.Expression>(e)) : [];

  // if there is no hash, position it as a collapsed node immediately after the last param (or the
  // path, if there are also no params)
  let end = params.length > 0 ? params[params.length - 1].loc : path.loc;

  let hash = node.hash
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
  let { path, params, hash, loc } = mustache;

  if (isHBSLiteral(path)) {
    let modifier = `{{${printLiteral(path)}}}`;
    let tag = `<${element.name} ... ${modifier} ...`;

    throw new GlimmerSyntaxError(`In ${tag}, ${modifier} is not a valid modifier`, mustache.loc);
  }

  let modifier = b.elementModifier({ path, params, hash, loc });
  element.modifiers.push(modifier);
}
