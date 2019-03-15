import b from '../builders';
import { appendChild, isLiteral, printLiteral } from '../utils';
import * as AST from '../types/nodes';
import * as HBS from '../types/handlebars-ast';
import { Parser, Tag, Attribute } from '../parser';
import SyntaxError from '../errors/syntax-error';
import { Option } from '@glimmer/util';
import { Recast } from '@glimmer/interfaces';
import { TokenizerState } from 'simple-html-tokenizer';

export abstract class HandlebarsNodeVisitors extends Parser {
  abstract appendToCommentData(s: string): void;
  abstract beginAttributeValue(quoted: boolean): void;
  abstract finishAttributeValue(): void;

  cursorCount = 0;

  cursor() {
    return `%cursor:${this.cursorCount++}%`;
  }

  private get isTopLevel() {
    return this.elementStack.length === 0;
  }

  Program(program: HBS.Program): AST.Block;
  Program(program: HBS.Program): AST.Template;
  Program(program: HBS.Program): AST.Template | AST.Block;
  Program(program: HBS.Program): AST.Block | AST.Template {
    let body: AST.Statement[] = [];
    this.cursorCount = 0;

    let node;

    if (this.isTopLevel) {
      node = b.template(body, program.blockParams, program.loc);
    } else {
      node = b.blockItself(body, program.blockParams, program.loc);
    }

    let i,
      l = program.body.length;

    this.elementStack.push(node);

    if (l === 0) {
      return this.elementStack.pop() as AST.Block | AST.Template;
    }

    for (i = 0; i < l; i++) {
      this.acceptNode(program.body[i]);
    }

    // Ensure that that the element stack is balanced properly.
    let poppedNode = this.elementStack.pop();
    if (poppedNode !== node) {
      let elementNode = poppedNode as AST.ElementNode;

      throw new SyntaxError(
        'Unclosed element `' + elementNode.tag + '` (on line ' + elementNode.loc!.start.line + ').',
        elementNode.loc
      );
    }

    return node;
  }

  BlockStatement(block: HBS.BlockStatement): AST.BlockStatement | void {
    if (this.tokenizer['state'] === 'comment') {
      this.appendToCommentData(this.sourceForNode(block));
      return;
    }

    if (
      this.tokenizer['state'] !== 'comment' &&
      this.tokenizer['state'] !== 'data' &&
      this.tokenizer['state'] !== 'beforeData'
    ) {
      throw new SyntaxError(
        'A block may only be used inside an HTML element or another block.',
        block.loc
      );
    }

    let { path, params, hash } = acceptCallNodes(this, block);
    let program = this.Program(block.program);
    let inverse = block.inverse ? this.Program(block.inverse) : null;

    if (path.original === 'in-element') {
      hash = addInElementHash(this.cursor(), hash, block.loc);
    }

    let node = b.block(path, params, hash, program, inverse, block.loc);

    let parentProgram = this.currentElement();

    appendChild(parentProgram, node);
  }

  MustacheStatement(rawMustache: HBS.MustacheStatement): AST.MustacheStatement | void {
    let { tokenizer } = this;

    if (tokenizer.state === 'comment') {
      this.appendToCommentData(this.sourceForNode(rawMustache));
      return;
    }

    let mustache: AST.MustacheStatement;
    let { escaped, loc } = rawMustache;

    if (isLiteral(rawMustache.path)) {
      mustache = {
        type: 'MustacheStatement',
        path: this.acceptNode<AST.Literal>(rawMustache.path),
        params: [],
        hash: b.hash(),
        escaped,
        loc,
      };
    } else {
      let { path, params, hash } = acceptCallNodes(this, rawMustache as HBS.MustacheStatement & {
        path: HBS.PathExpression;
      });
      mustache = b.mustache(path, params, hash, !escaped, loc);
    }

    switch (tokenizer.state) {
      // Tag helpers
      case TokenizerState.tagOpen:
      case TokenizerState.tagName:
        throw new SyntaxError(
          `Cannot use mustaches in an elements tagname: \`${this.sourceForNode(
            rawMustache,
            rawMustache.path
          )}\` at L${loc.start.line}:C${loc.start.column}`,
          mustache.loc
        );

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
        appendDynamicAttributeValuePart(this.currentAttribute!, mustache);
        tokenizer.transitionTo(TokenizerState.attributeValueUnquoted);
        break;
      case TokenizerState.attributeValueDoubleQuoted:
      case TokenizerState.attributeValueSingleQuoted:
      case TokenizerState.attributeValueUnquoted:
        appendDynamicAttributeValuePart(this.currentAttribute!, mustache);
        break;

      // TODO: Only append child when the tokenizer state makes
      // sense to do so, otherwise throw an error.
      default:
        appendChild(this.currentElement(), mustache);
    }

    return mustache;
  }

  ContentStatement(content: HBS.ContentStatement): void {
    updateTokenizerLocation(this.tokenizer, content);

    this.tokenizer.tokenizePart(content.value);
    this.tokenizer.flushData();
  }

  CommentStatement(rawComment: HBS.CommentStatement): Option<AST.MustacheCommentStatement> {
    let { tokenizer } = this;

    if (tokenizer.state === TokenizerState.comment) {
      this.appendToCommentData(this.sourceForNode(rawComment));
      return null;
    }

    let { value, loc } = rawComment;
    let comment = b.mustacheComment(value, loc);

    switch (tokenizer.state) {
      case TokenizerState.beforeAttributeName:
        this.currentStartTag.comments.push(comment);
        break;

      case TokenizerState.beforeData:
      case TokenizerState.data:
        appendChild(this.currentElement(), comment);
        break;

      default:
        throw new SyntaxError(
          `Using a Handlebars comment when in the \`${
            tokenizer['state']
          }\` state is not supported: "${comment.value}" on line ${loc.start.line}:${
            loc.start.column
          }`,
          rawComment.loc
        );
    }

    return comment;
  }

  PartialStatement(partial: HBS.PartialStatement): never {
    let { loc } = partial;

    throw new SyntaxError(
      `Handlebars partials are not supported: "${this.sourceForNode(partial, partial.name)}" at L${
        loc.start.line
      }:C${loc.start.column}`,
      partial.loc
    );
  }

  PartialBlockStatement(partialBlock: HBS.PartialBlockStatement): never {
    let { loc } = partialBlock;

    throw new SyntaxError(
      `Handlebars partial blocks are not supported: "${this.sourceForNode(
        partialBlock,
        partialBlock.name
      )}" at L${loc.start.line}:C${loc.start.column}`,
      partialBlock.loc
    );
  }

  Decorator(decorator: HBS.Decorator): never {
    let { loc } = decorator;

    throw new SyntaxError(
      `Handlebars decorators are not supported: "${this.sourceForNode(
        decorator,
        decorator.path
      )}" at L${loc.start.line}:C${loc.start.column}`,
      decorator.loc
    );
  }

  DecoratorBlock(decoratorBlock: HBS.DecoratorBlock): never {
    let { loc } = decoratorBlock;

    throw new SyntaxError(
      `Handlebars decorator blocks are not supported: "${this.sourceForNode(
        decoratorBlock,
        decoratorBlock.path
      )}" at L${loc.start.line}:C${loc.start.column}`,
      decoratorBlock.loc
    );
  }

  SubExpression(sexpr: HBS.SubExpression): AST.SubExpression {
    let { path, params, hash } = acceptCallNodes(this, sexpr);
    return b.sexpr(path, params, hash, sexpr.loc);
  }

  PathExpression(path: HBS.PathExpression): AST.PathExpression {
    let { original, loc } = path;
    let parts: string[];

    if (original.indexOf('/') !== -1) {
      if (original.slice(0, 2) === './') {
        throw new SyntaxError(
          `Using "./" is not supported in Glimmer and unnecessary: "${path.original}" on line ${
            loc.start.line
          }.`,
          path.loc
        );
      }
      if (original.slice(0, 3) === '../') {
        throw new SyntaxError(
          `Changing context using "../" is not supported in Glimmer: "${path.original}" on line ${
            loc.start.line
          }.`,
          path.loc
        );
      }
      if (original.indexOf('.') !== -1) {
        throw new SyntaxError(
          `Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: "${
            path.original
          }" on line ${loc.start.line}.`,
          path.loc
        );
      }
      parts = [path.parts.join('/')];
    } else if (original === '.') {
      let locationInfo = `L${loc.start.line}:C${loc.start.column}`;
      throw new SyntaxError(
        `'.' is not a supported path in Glimmer; check for a path with a trailing '.' at ${locationInfo}.`,
        path.loc
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

    return {
      type: 'PathExpression',
      original: path.original,
      this: thisHead,
      parts,
      data: path.data,
      loc: path.loc,
    };
  }

  Hash(hash: HBS.Hash): AST.Hash {
    let pairs: AST.HashPair[] = [];

    for (let i = 0; i < hash.pairs.length; i++) {
      let pair = hash.pairs[i];
      pairs.push(b.pair(pair.key, this.acceptNode(pair.value), pair.loc));
    }

    return b.hash(pairs, hash.loc);
  }

  StringLiteral(string: HBS.StringLiteral): AST.StringLiteral {
    return b.literal('StringLiteral', string.value, string.loc);
  }

  BooleanLiteral(boolean: HBS.BooleanLiteral): AST.BooleanLiteral {
    return b.literal('BooleanLiteral', boolean.value, boolean.loc);
  }

  NumberLiteral(number: HBS.NumberLiteral): AST.NumberLiteral {
    return b.literal('NumberLiteral', number.value, number.loc);
  }

  UndefinedLiteral(undef: HBS.UndefinedLiteral): AST.UndefinedLiteral {
    return b.literal('UndefinedLiteral', undefined, undef.loc);
  }

  NullLiteral(nul: HBS.NullLiteral): AST.NullLiteral {
    return b.literal('NullLiteral', null, nul.loc);
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
): { path: AST.PathExpression; params: AST.Expression[]; hash: AST.Hash } {
  let path = compiler.PathExpression(node.path);

  let params = node.params ? node.params.map(e => compiler.acceptNode<AST.Expression>(e)) : [];
  let hash = node.hash ? compiler.Hash(node.hash) : b.hash();

  return { path, params, hash };
}

function addElementModifier(element: Tag<'StartTag'>, mustache: AST.MustacheStatement) {
  let { path, params, hash, loc } = mustache;

  if (isLiteral(path)) {
    let modifier = `{{${printLiteral(path)}}}`;
    let tag = `<${element.name} ... ${modifier} ...`;

    throw new SyntaxError(
      `In ${tag}, ${modifier} is not a valid modifier: "${path.original}" on line ${loc &&
        loc.start.line}.`,
      mustache.loc
    );
  }

  let modifier = b.elementModifier(path, params, hash, loc);
  element.modifiers.push(modifier);
}

function addInElementHash(cursor: string, hash: AST.Hash, loc: AST.SourceLocation) {
  let hasNextSibling = false;
  hash.pairs.forEach(pair => {
    if (pair.key === 'guid') {
      throw new SyntaxError('Cannot pass `guid` from user space', loc);
    }

    if (pair.key === 'nextSibling') {
      hasNextSibling = true;
    }
  });

  let guid = b.literal('StringLiteral', cursor);
  let guidPair = b.pair('guid', guid);
  hash.pairs.unshift(guidPair);

  if (!hasNextSibling) {
    let nullLiteral = b.literal('NullLiteral', null);
    let nextSibling = b.pair('nextSibling', nullLiteral);
    hash.pairs.push(nextSibling);
  }

  return hash;
}

function appendDynamicAttributeValuePart(attribute: Attribute, part: AST.MustacheStatement) {
  attribute.isDynamic = true;
  attribute.parts.push(part);
}
