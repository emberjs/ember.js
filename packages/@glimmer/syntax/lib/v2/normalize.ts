import type { PresentArray } from '@glimmer/interfaces';
import { asPresentArray, assert, isPresentArray } from '@glimmer/debug-util';
import { assign } from '@glimmer/util';

import type {
  PrecompileOptions,
  PrecompileOptionsWithLexicalScope,
} from '../parser/tokenizer-event-handlers';
import type { SourceLocation } from '../source/location';
import type { Source } from '../source/source';
import type { SourceSpan } from '../source/span';
import type { BlockSymbolTable, ProgramSymbolTable } from '../symbol-table';
import type * as ASTv1 from '../v1/api';
import type { BuildElement, CallParts } from './builders';
import type { Resolution } from './loose-resolution';

import Printer from '../generation/printer';
import { preprocess } from '../parser/tokenizer-event-handlers';
import { SourceSlice } from '../source/slice';
import { SpanList } from '../source/span-list';
import { SymbolTable } from '../symbol-table';
import { generateSyntaxError } from '../syntax-error';
import { isLowerCase, isUpperCase } from '../utils';
import b from '../v1/parser-builders';
import * as ASTv2 from './api';
import { Builder } from './builders';
import {
  AppendSyntaxContext,
  AttrValueSyntaxContext,
  BlockSyntaxContext,
  ComponentSyntaxContext,
  ModifierSyntaxContext,
  SexpSyntaxContext,
} from './loose-resolution';

export function normalize(
  source: Source,
  options: PrecompileOptionsWithLexicalScope = { lexicalScope: () => false }
): [ast: ASTv2.Template, locals: string[]] {
  let ast = preprocess(source, options);

  let normalizeOptions = {
    strictMode: false,
    ...options,
    locals: ast.blockParams,
    keywords: options.keywords ?? [],
  };

  let top = SymbolTable.top(normalizeOptions.locals, normalizeOptions.keywords, {
    customizeComponentName: options.customizeComponentName ?? ((name) => name),
    lexicalScope: options.lexicalScope,
  });
  let block = new BlockContext(source, normalizeOptions, top);
  let normalizer = new StatementNormalizer(block);

  let astV2 = new TemplateChildren(
    block.loc(ast.loc),
    ast.body.map((b) => normalizer.normalize(b)),
    block
  ).assertTemplate(top);

  let locals = top.getUsedTemplateLocals();

  return [astV2, locals];
}

/**
 * A `BlockContext` represents the block that a particular AST node is contained inside of.
 *
 * `BlockContext` is aware of template-wide options (such as strict mode), as well as the bindings
 * that are in-scope within that block.
 *
 * Concretely, it has the `PrecompileOptions` and current `SymbolTable`, and provides
 * facilities for working with those options.
 *
 * `BlockContext` is stateless.
 */
export class BlockContext<Table extends SymbolTable = SymbolTable> {
  readonly builder: Builder;

  constructor(
    readonly source: Source,
    private readonly options: PrecompileOptions,
    readonly table: Table
  ) {
    this.builder = new Builder();
  }

  get strict(): boolean {
    return this.options.strictMode || false;
  }

  loc(loc: SourceLocation): SourceSpan {
    return this.source.spanFor(loc);
  }

  resolutionFor<N extends ASTv1.CallNode | ASTv1.PathExpression>(
    node: N,
    resolution: Resolution<N>
  ): { result: ASTv2.FreeVarResolution } | { result: 'error'; path: string; head: string } {
    if (this.strict) {
      return { result: ASTv2.STRICT_RESOLUTION };
    }

    if (this.isFreeVar(node)) {
      let r = resolution(node);

      if (r === null) {
        return {
          result: 'error',
          path: printPath(node),
          head: printHead(node),
        };
      }

      return { result: r };
    } else {
      return { result: ASTv2.STRICT_RESOLUTION };
    }
  }

  isLexicalVar(variable: string): boolean {
    return this.table.hasLexical(variable);
  }

  isKeyword(name: string): boolean {
    return this.strict && !this.table.hasLexical(name) && this.table.hasKeyword(name);
  }

  private isFreeVar(callee: ASTv1.CallNode | ASTv1.PathExpression): boolean {
    if (callee.type === 'PathExpression') {
      if (callee.head.type !== 'VarHead') {
        return false;
      }

      return !this.table.has(callee.head.name);
    } else if (callee.path.type === 'PathExpression') {
      return this.isFreeVar(callee.path);
    } else {
      return false;
    }
  }

  hasBinding(name: string): boolean {
    return this.table.has(name) || this.table.hasLexical(name);
  }

  child(blockParams: string[]): BlockContext<BlockSymbolTable> {
    return new BlockContext(this.source, this.options, this.table.child(blockParams));
  }

  customizeComponentName(input: string): string {
    if (this.options.customizeComponentName) {
      return this.options.customizeComponentName(input);
    } else {
      return input;
    }
  }
}

/**
 * An `ExpressionNormalizer` normalizes expressions within a block.
 *
 * `ExpressionNormalizer` is stateless.
 */
class ExpressionNormalizer {
  constructor(private block: BlockContext) {}

  /**
   * The `normalize` method takes an arbitrary expression and its original syntax context and
   * normalizes it to an ASTv2 expression.
   *
   * @see {SyntaxContext}
   */
  normalize(expr: ASTv1.Literal): ASTv2.LiteralExpression;
  normalize(expr: ASTv1.SubExpression): ASTv2.CallExpression;
  normalize(
    expr: ASTv1.MinimalPathExpression,
    resolution: ASTv2.FreeVarResolution
  ): ASTv2.PathExpression;
  normalize(expr: ASTv1.Expression, resolution: ASTv2.FreeVarResolution): ASTv2.ExpressionNode;
  normalize(
    expr: ASTv1.Expression | ASTv1.MinimalPathExpression,
    resolution?: ASTv2.FreeVarResolution
  ): ASTv2.ExpressionNode {
    switch (expr.type) {
      case 'NullLiteral':
      case 'BooleanLiteral':
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'UndefinedLiteral':
        return this.block.builder.literal(expr.value, this.block.loc(expr.loc));
      case 'PathExpression':
        assert(resolution, '[BUG] resolution is required');
        return this.path(expr, resolution);
      case 'SubExpression': {
        // expr.path used to incorrectly have the type ASTv1.Expression
        if (isLiteral(expr.path)) {
          assertIllegalLiteral(expr.path, expr.loc);
        }

        let resolution = this.block.resolutionFor(expr, SexpSyntaxContext);

        if (resolution.result === 'error') {
          throw generateSyntaxError(
            `You attempted to invoke a path (\`${resolution.path}\`) but ${resolution.head} was not in scope`,
            expr.loc
          );
        }

        return this.block.builder.sexp(
          this.callParts(expr, resolution.result),
          this.block.loc(expr.loc)
        );
      }
    }
  }

  private path(
    expr: ASTv1.MinimalPathExpression,
    resolution: ASTv2.FreeVarResolution
  ): ASTv2.KeywordExpression | ASTv2.PathExpression {
    let loc = this.block.loc(expr.loc);

    if (
      expr.head.type === 'VarHead' &&
      expr.tail.length === 0 &&
      this.block.isKeyword(expr.head.name)
    ) {
      return this.block.builder.keyword(
        expr.head.name,
        this.block.table.getKeyword(expr.head.name),
        loc
      );
    }

    let headOffsets = this.block.loc(expr.head.loc);

    let tail = [];

    // start with the head
    let offset = headOffsets;

    for (let part of expr.tail) {
      offset = offset.sliceStartChars({ chars: part.length, skipStart: 1 });
      tail.push(
        new SourceSlice({
          loc: offset,
          chars: part,
        })
      );
    }

    return this.block.builder.path(this.ref(expr.head, resolution), tail, loc);
  }

  /**
   * The `callParts` method takes ASTv1.CallParts as well as a syntax context and normalizes
   * it to an ASTv2 CallParts.
   */
  callParts(parts: ASTv1.CallParts, context: ASTv2.FreeVarResolution): CallParts {
    let { path, params, hash, loc } = parts;

    let callee = this.normalize(path, context);
    let paramList = params.map((p) => this.normalize(p, ASTv2.STRICT_RESOLUTION));
    let paramLoc = SpanList.range(paramList, callee.loc.collapse('end'));
    let namedLoc = this.block.loc(hash.loc);
    let argsLoc = SpanList.range([paramLoc, namedLoc]);

    let positional = this.block.builder.positional(
      params.map((p) => this.normalize(p, ASTv2.STRICT_RESOLUTION)),
      paramLoc
    );

    let named = this.block.builder.named(
      hash.pairs.map((p) => this.namedArgument(p)),
      this.block.loc(hash.loc)
    );

    switch (callee.type) {
      case 'Literal':
        throw generateSyntaxError(
          `Invalid invocation of a literal value (\`${callee.value}\`)`,
          loc
        );

      // This really shouldn't be possible, something has gone pretty wrong
      case 'Interpolate':
        throw generateSyntaxError(`Invalid invocation of a interpolated string`, loc);
    }

    return {
      callee,
      args: this.block.builder.args(positional, named, argsLoc),
    };
  }

  private namedArgument(pair: ASTv1.HashPair): ASTv2.NamedArgument {
    let offsets = this.block.loc(pair.loc);

    let keyOffsets = offsets.sliceStartChars({ chars: pair.key.length });

    return this.block.builder.namedArgument(
      new SourceSlice({ chars: pair.key, loc: keyOffsets }),
      this.normalize(pair.value, ASTv2.STRICT_RESOLUTION)
    );
  }

  /**
   * The `ref` method normalizes an `ASTv1.PathHead` into an `ASTv2.VariableReference`.
   * This method is extremely important, because it is responsible for normalizing free
   * variables into an an ASTv2.PathHead *with appropriate context*.
   *
   * The syntax context is originally determined by the syntactic position that this `PathHead`
   * came from, and is ultimately attached to the `ASTv2.VariableReference` here. In ASTv2,
   * the `VariableReference` node bears full responsibility for loose mode rules that control
   * the behavior of free variables.
   */
  private ref(head: ASTv1.PathHead, resolution: ASTv2.FreeVarResolution): ASTv2.VariableReference {
    let { block } = this;
    let { builder, table } = block;
    let offsets = block.loc(head.loc);

    switch (head.type) {
      case 'ThisHead':
        return builder.self(offsets);
      case 'AtHead': {
        let symbol = table.allocateNamed(head.name);
        return builder.at(head.name, symbol, offsets);
      }
      case 'VarHead': {
        if (block.hasBinding(head.name)) {
          let [symbol, isRoot] = table.get(head.name);

          return block.builder.localVar(head.name, symbol, isRoot, offsets);
        } else {
          let context = block.strict ? ASTv2.STRICT_RESOLUTION : resolution;
          let symbol = block.table.allocateFree(head.name, context);

          return block.builder.freeVar({
            name: head.name,
            context,
            symbol,
            loc: offsets,
          });
        }
      }
    }
  }
}

/**
 * `TemplateNormalizer` normalizes top-level ASTv1 statements to ASTv2.
 */
class StatementNormalizer {
  constructor(private readonly block: BlockContext) {}

  normalize(node: ASTv1.Statement): ASTv2.ContentNode | ASTv2.NamedBlock {
    switch (node.type) {
      case 'BlockStatement':
        return this.BlockStatement(node);
      case 'ElementNode':
        return new ElementNormalizer(this.block).ElementNode(node);
      case 'MustacheStatement':
        return this.MustacheStatement(node);

      // These are the same in ASTv2
      case 'MustacheCommentStatement':
        return this.MustacheCommentStatement(node);

      case 'CommentStatement': {
        let loc = this.block.loc(node.loc);
        return new ASTv2.HtmlComment({
          loc,
          text: loc.slice({ skipStart: 4, skipEnd: 3 }).toSlice(node.value),
        });
      }

      case 'TextNode':
        return new ASTv2.HtmlText({
          loc: this.block.loc(node.loc),
          chars: node.chars,
        });
    }
  }

  MustacheCommentStatement(node: ASTv1.MustacheCommentStatement): ASTv2.GlimmerComment {
    let loc = this.block.loc(node.loc);
    let textLoc: SourceSpan;

    if (loc.asString().slice(0, 5) === '{{!--') {
      textLoc = loc.slice({ skipStart: 5, skipEnd: 4 });
    } else {
      textLoc = loc.slice({ skipStart: 3, skipEnd: 2 });
    }

    return new ASTv2.GlimmerComment({
      loc,
      text: textLoc.toSlice(node.value),
    });
  }

  /**
   * Normalizes an ASTv1.MustacheStatement to an ASTv2.AppendStatement
   */
  MustacheStatement(mustache: ASTv1.MustacheStatement): ASTv2.AppendContent {
    let { path, params, hash, trusting } = mustache;
    let loc = this.block.loc(mustache.loc);
    let value: ASTv2.ExpressionNode;

    if (isLiteral(path)) {
      if (params.length === 0 && hash.pairs.length === 0) {
        value = this.expr.normalize(path);
      } else {
        assertIllegalLiteral(path, loc);
      }
    } else {
      let resolution = this.block.resolutionFor(mustache, AppendSyntaxContext);

      if (resolution.result === 'error') {
        throw generateSyntaxError(
          `You attempted to render a path (\`{{${resolution.path}}}\`), but ${resolution.head} was not in scope`,
          loc
        );
      }

      // Normalize the call parts in AppendSyntaxContext
      let callParts = this.expr.callParts(
        {
          path,
          params,
          hash,
          loc,
        },
        resolution.result
      );

      value = callParts.args.isEmpty() ? callParts.callee : this.block.builder.sexp(callParts, loc);
    }

    return this.block.builder.append(
      {
        table: this.block.table,
        trusting,
        value,
      },
      loc
    );
  }

  /**
   * Normalizes a ASTv1.BlockStatement to an ASTv2.BlockStatement
   */
  BlockStatement(block: ASTv1.BlockStatement): ASTv2.InvokeBlock {
    let { program, inverse } = block;
    let loc = this.block.loc(block.loc);

    // block.path used to incorrectly have the type ASTv1.Expression
    if (isLiteral(block.path)) {
      assertIllegalLiteral(block.path, loc);
    }

    let resolution = this.block.resolutionFor(block, BlockSyntaxContext);

    if (resolution.result === 'error') {
      throw generateSyntaxError(
        `You attempted to invoke a path (\`{{#${resolution.path}}}\`) but ${resolution.head} was not in scope`,
        loc
      );
    }

    let callParts = this.expr.callParts(block, resolution.result);

    return this.block.builder.blockStatement(
      assign(
        {
          symbols: this.block.table,
          program: this.Block(program),
          inverse: inverse ? this.Block(inverse) : null,
        },
        callParts
      ),
      loc
    );
  }

  Block({ body, loc, blockParams }: ASTv1.Block): ASTv2.Block {
    let child = this.block.child(blockParams);
    let normalizer = new StatementNormalizer(child);
    return new BlockChildren(
      this.block.loc(loc),
      body.map((b) => normalizer.normalize(b)),
      this.block
    ).assertBlock(child.table);
  }

  private get expr(): ExpressionNormalizer {
    return new ExpressionNormalizer(this.block);
  }
}

class ElementNormalizer {
  constructor(private readonly ctx: BlockContext) {}

  /**
   * Normalizes an ASTv1.ElementNode to:
   *
   * - ASTv2.NamedBlock if the tag name begins with `:`
   * - ASTv2.Component if the tag name matches the component heuristics
   * - ASTv2.SimpleElement if the tag name doesn't match the component heuristics
   *
   * A tag name represents a component if:
   *
   * - it begins with `@`
   * - it is exactly `this` or begins with `this.`
   * - the part before the first `.` is a reference to an in-scope variable binding
   * - it begins with an uppercase character
   */
  ElementNode(element: ASTv1.ElementNode): ASTv2.ElementNode {
    let { tag, selfClosing, comments } = element;
    let loc = this.ctx.loc(element.loc);

    let [tagHead, ...rest] = asPresentArray(tag.split('.'));

    // the head, attributes and modifiers are in the current scope
    let path = this.classifyTag(tagHead, rest, element.loc);

    let attrs = element.attributes.filter((a) => a.name[0] !== '@').map((a) => this.attr(a));
    let args = element.attributes.filter((a) => a.name[0] === '@').map((a) => this.arg(a));

    let modifiers = element.modifiers.map((m) => this.modifier(m));

    // the element's block params are in scope for the children
    let child = this.ctx.child(element.blockParams);
    let normalizer = new StatementNormalizer(child);

    let childNodes = element.children.map((s) => normalizer.normalize(s));

    let el = this.ctx.builder.element({
      selfClosing,
      attrs,
      componentArgs: args,
      modifiers,
      comments: comments.map((c) => new StatementNormalizer(this.ctx).MustacheCommentStatement(c)),
    });

    let children = new ElementChildren(el, loc, childNodes, this.ctx);

    let offsets = this.ctx.loc(element.loc);
    let tagOffsets = offsets.sliceStartChars({ chars: tag.length, skipStart: 1 });

    if (path === 'ElementHead') {
      if (tag[0] === ':') {
        return children.assertNamedBlock(
          tagOffsets.slice({ skipStart: 1 }).toSlice(tag.slice(1)),
          child.table
        );
      } else {
        return children.assertElement(tagOffsets.toSlice(tag), element.blockParams.length > 0);
      }
    }

    if (element.selfClosing) {
      return el.selfClosingComponent(path, loc);
    } else {
      let blocks = children.assertComponent(tag, child.table, element.blockParams.length > 0);
      return el.componentWithNamedBlocks(path, blocks, loc);
    }
  }

  private modifier(m: ASTv1.ElementModifierStatement): ASTv2.ElementModifier {
    // modifier.path used to incorrectly have the type ASTv1.Expression
    if (isLiteral(m.path)) {
      assertIllegalLiteral(m.path, m.loc);
    }

    let resolution = this.ctx.resolutionFor(m, ModifierSyntaxContext);

    if (resolution.result === 'error') {
      throw generateSyntaxError(
        `You attempted to invoke a path (\`{{${resolution.path}}}\`) as a modifier, but ${resolution.head} was not in scope`,
        m.loc
      );
    }

    let callParts = this.expr.callParts(m, resolution.result);
    return this.ctx.builder.modifier(callParts, this.ctx.loc(m.loc));
  }

  /**
   * This method handles attribute values that are curlies, as well as curlies nested inside of
   * interpolations:
   *
   * ```hbs
   * <a href={{url}} />
   * <a href="{{url}}.html" />
   * ```
   */
  private mustacheAttr(mustache: ASTv1.MustacheStatement): ASTv2.ExpressionNode {
    let { path, params, hash, loc } = mustache;

    if (isLiteral(path)) {
      if (params.length === 0 && hash.pairs.length === 0) {
        return this.expr.normalize(path);
      } else {
        assertIllegalLiteral(path, loc);
      }
    }

    // Normalize the call parts in AttrValueSyntaxContext
    let resolution = this.ctx.resolutionFor(mustache, AttrValueSyntaxContext);

    if (resolution.result === 'error') {
      throw generateSyntaxError(
        `You attempted to render a path (\`{{${resolution.path}}}\`), but ${resolution.head} was not in scope`,
        mustache.loc
      );
    }

    let sexp = this.ctx.builder.sexp(
      this.expr.callParts(mustache as ASTv1.CallParts, resolution.result),
      this.ctx.loc(mustache.loc)
    );

    // If there are no params or hash, just return the function part as its own expression
    if (sexp.args.isEmpty()) {
      return sexp.callee;
    } else {
      return sexp;
    }
  }

  /**
   * attrPart is the narrowed down list of valid attribute values that are also
   * allowed as a concat part (you can't nest concats).
   */
  private attrPart(part: ASTv1.MustacheStatement | ASTv1.TextNode): {
    expr: ASTv2.ExpressionNode;
    trusting: boolean;
  } {
    switch (part.type) {
      case 'MustacheStatement':
        return { expr: this.mustacheAttr(part), trusting: part.trusting };
      case 'TextNode':
        return {
          expr: this.ctx.builder.literal(part.chars, this.ctx.loc(part.loc)),
          trusting: true,
        };
    }
  }

  private attrValue(part: ASTv1.MustacheStatement | ASTv1.TextNode | ASTv1.ConcatStatement): {
    expr: ASTv2.ExpressionNode;
    trusting: boolean;
  } {
    switch (part.type) {
      case 'ConcatStatement': {
        let parts = part.parts.map((p) => this.attrPart(p).expr);
        return {
          expr: this.ctx.builder.interpolate(parts, this.ctx.loc(part.loc)),
          trusting: false,
        };
      }
      default:
        return this.attrPart(part);
    }
  }

  private attr(m: ASTv1.AttrNode): ASTv2.HtmlOrSplatAttr {
    assert(m.name[0] !== '@', 'An attr name must not start with `@`');

    if (m.name === '...attributes') {
      return this.ctx.builder.splatAttr(this.ctx.table.allocateBlock('attrs'), this.ctx.loc(m.loc));
    }

    let offsets = this.ctx.loc(m.loc);
    let nameSlice = offsets.sliceStartChars({ chars: m.name.length }).toSlice(m.name);
    let value = this.attrValue(m.value);

    return this.ctx.builder.attr(
      { name: nameSlice, value: value.expr, trusting: value.trusting },
      offsets
    );
  }

  // An arg curly <Foo @bar={{...}} /> is the same as an attribute curly for
  // our purposes, except that in loose mode <Foo @bar={{baz}} /> is an error:
  private checkArgCall(arg: ASTv1.AttrNode): void {
    let { value } = arg;

    if (value.type !== 'MustacheStatement') {
      return;
    }

    if (value.params.length !== 0 || value.hash.pairs.length !== 0) {
      return;
    }

    let { path } = value;

    if (path.type !== 'PathExpression') {
      return;
    }

    if (path.tail.length > 0) {
      return;
    }

    let resolution = this.ctx.resolutionFor(path, () => {
      // We deliberately don't want this to resolve anything. The purpose of
      // calling `resolutionFor` here is to check for strict mode, in-scope
      // local variables, etc.
      return null;
    });

    if (resolution.result === 'error' && resolution.path !== 'has-block') {
      throw generateSyntaxError(
        `You attempted to pass a path as argument (\`${arg.name}={{${resolution.path}}}\`) but ${resolution.head} was not in scope. Try:\n` +
          `* \`${arg.name}={{this.${resolution.path}}}\` if this is meant to be a property lookup, or\n` +
          `* \`${arg.name}={{(${resolution.path})}}\` if this is meant to invoke the resolved helper, or\n` +
          `* \`${arg.name}={{helper "${resolution.path}"}}\` if this is meant to pass the resolved helper by value`,
        arg.loc
      );
    }
  }

  private arg(arg: ASTv1.AttrNode): ASTv2.ComponentArg {
    assert(arg.name[0] === '@', 'An arg name must start with `@`');
    this.checkArgCall(arg);

    let offsets = this.ctx.loc(arg.loc);
    let nameSlice = offsets.sliceStartChars({ chars: arg.name.length }).toSlice(arg.name);
    let value = this.attrValue(arg.value);

    return this.ctx.builder.arg(
      { name: nameSlice, value: value.expr, trusting: value.trusting },
      offsets
    );
  }

  /**
   * This function classifies the head of an ASTv1.Element into an ASTv2.PathHead (if the
   * element is a component) or `'ElementHead'` (if the element is a simple element).
   *
   * Rules:
   *
   * 1. If the variable is an `@arg`, return an `AtHead`
   * 2. If the variable is `this`, return a `ThisHead`
   * 3. If the variable is in the current scope:
   *   a. If the scope is the root scope, then return a Free `LocalVarHead`
   *   b. Else, return a standard `LocalVarHead`
   * 4. If the tag name is a path and the variable is not in the current scope, Syntax Error
   * 5. If the variable is uppercase return a FreeVar(ResolveAsComponentHead)
   * 6. Otherwise, return `'ElementHead'`
   */
  private classifyTag(
    variable: string,
    tail: string[],
    loc: SourceSpan
  ): ASTv2.ExpressionNode | 'ElementHead' {
    let uppercase = isUpperCase(variable);
    let inScope = variable[0] === '@' || variable === 'this' || this.ctx.hasBinding(variable);

    if (this.ctx.strict && !inScope) {
      if (uppercase) {
        throw generateSyntaxError(
          `Attempted to invoke a component that was not in scope in a strict mode template, \`<${variable}>\`. If you wanted to create an element with that name, convert it to lowercase - \`<${variable.toLowerCase()}>\``,
          loc
        );
      }

      // In strict mode, values are always elements unless they are in scope
      return 'ElementHead';
    }

    // Since the parser handed us the HTML element name as a string, we need
    // to convert it into an ASTv1 path so it can be processed using the
    // expression normalizer.
    let isComponent = inScope || uppercase;

    let variableLoc = loc.sliceStartChars({ skipStart: 1, chars: variable.length });

    let tailLength = tail.reduce((accum, part) => accum + 1 + part.length, 0);
    let pathEnd = variableLoc.getEnd().move(tailLength);
    let pathLoc = variableLoc.withEnd(pathEnd);

    if (isComponent) {
      let path = b.path({
        head: b.head({ original: variable, loc: variableLoc }),
        tail,
        loc: pathLoc,
      });

      let resolution = this.ctx.isLexicalVar(variable)
        ? { result: ASTv2.STRICT_RESOLUTION }
        : this.ctx.resolutionFor(path, ComponentSyntaxContext);

      if (resolution.result === 'error') {
        throw generateSyntaxError(
          `You attempted to invoke a path (\`<${resolution.path}>\`) but ${resolution.head} was not in scope`,
          loc
        );
      }

      return new ExpressionNormalizer(this.ctx).normalize(path, resolution.result);
    } else {
      this.ctx.table.allocateFree(variable, ASTv2.STRICT_RESOLUTION);
    }

    // If the tag name wasn't a valid component but contained a `.`, it's
    // a syntax error.
    if (tail.length > 0) {
      throw generateSyntaxError(
        `You used ${variable}.${tail.join('.')} as a tag name, but ${variable} is not in scope`,
        loc
      );
    }

    return 'ElementHead';
  }

  private get expr(): ExpressionNormalizer {
    return new ExpressionNormalizer(this.ctx);
  }
}

class Children {
  readonly namedBlocks: ASTv2.NamedBlock[];
  readonly hasSemanticContent: boolean;
  readonly nonBlockChildren: ASTv2.ContentNode[];

  constructor(
    readonly loc: SourceSpan,
    readonly children: (ASTv2.ContentNode | ASTv2.NamedBlock)[],
    readonly block: BlockContext
  ) {
    this.namedBlocks = children.filter((c): c is ASTv2.NamedBlock => c instanceof ASTv2.NamedBlock);
    this.hasSemanticContent = Boolean(
      children.filter((c): c is ASTv2.ContentNode => {
        if (c instanceof ASTv2.NamedBlock) {
          return false;
        }
        switch (c.type) {
          case 'GlimmerComment':
          case 'HtmlComment':
            return false;
          case 'HtmlText':
            return !/^\s*$/u.test(c.chars);
          default:
            return true;
        }
      }).length
    );
    this.nonBlockChildren = children.filter(
      (c): c is ASTv2.ContentNode => !(c instanceof ASTv2.NamedBlock)
    );
  }
}

class TemplateChildren extends Children {
  assertTemplate(table: ProgramSymbolTable): ASTv2.Template {
    if (isPresentArray(this.namedBlocks)) {
      throw generateSyntaxError(`Unexpected named block at the top-level of a template`, this.loc);
    }

    return this.block.builder.template(table, this.nonBlockChildren, this.block.loc(this.loc));
  }
}

class BlockChildren extends Children {
  assertBlock(table: BlockSymbolTable): ASTv2.Block {
    if (isPresentArray(this.namedBlocks)) {
      throw generateSyntaxError(`Unexpected named block nested in a normal block`, this.loc);
    }

    return this.block.builder.block(table, this.nonBlockChildren, this.loc);
  }
}

class ElementChildren extends Children {
  constructor(
    private el: BuildElement,
    loc: SourceSpan,
    children: (ASTv2.ContentNode | ASTv2.NamedBlock)[],
    block: BlockContext
  ) {
    super(loc, children, block);
  }

  assertNamedBlock(name: SourceSlice, table: BlockSymbolTable): ASTv2.NamedBlock {
    if (this.el.base.selfClosing) {
      throw generateSyntaxError(
        `<:${name.chars}/> is not a valid named block: named blocks cannot be self-closing`,
        this.loc
      );
    }

    if (isPresentArray(this.namedBlocks)) {
      throw generateSyntaxError(
        `Unexpected named block inside <:${name.chars}> named block: named blocks cannot contain nested named blocks`,
        this.loc
      );
    }

    if (!isLowerCase(name.chars)) {
      throw generateSyntaxError(
        `<:${name.chars}> is not a valid named block, and named blocks must begin with a lowercase letter`,
        this.loc
      );
    }

    if (
      this.el.base.attrs.length > 0 ||
      this.el.base.componentArgs.length > 0 ||
      this.el.base.modifiers.length > 0
    ) {
      throw generateSyntaxError(
        `named block <:${name.chars}> cannot have attributes, arguments, or modifiers`,
        this.loc
      );
    }

    let offsets = SpanList.range(this.nonBlockChildren, this.loc);

    return this.block.builder.namedBlock(
      name,
      this.block.builder.block(table, this.nonBlockChildren, offsets),
      this.loc
    );
  }

  assertElement(name: SourceSlice, hasBlockParams: boolean): ASTv2.SimpleElement {
    if (hasBlockParams) {
      throw generateSyntaxError(
        `Unexpected block params in <${name.chars}>: simple elements cannot have block params`,
        this.loc
      );
    }

    if (isPresentArray(this.namedBlocks)) {
      let names = this.namedBlocks.map((b) => b.name);

      if (names.length === 1) {
        throw generateSyntaxError(
          `Unexpected named block <:foo> inside <${name.chars}> HTML element`,
          this.loc
        );
      } else {
        let printedNames = names.map((n) => `<:${n.chars}>`).join(', ');
        throw generateSyntaxError(
          `Unexpected named blocks inside <${name.chars}> HTML element (${printedNames})`,
          this.loc
        );
      }
    }

    return this.el.simple(name, this.nonBlockChildren, this.loc);
  }

  assertComponent(
    name: string,
    table: BlockSymbolTable,
    hasBlockParams: boolean
  ): PresentArray<ASTv2.NamedBlock> {
    if (isPresentArray(this.namedBlocks) && this.hasSemanticContent) {
      throw generateSyntaxError(
        `Unexpected content inside <${name}> component invocation: when using named blocks, the tag cannot contain other content`,
        this.loc
      );
    }

    if (isPresentArray(this.namedBlocks)) {
      if (hasBlockParams) {
        throw generateSyntaxError(
          `Unexpected block params list on <${name}> component invocation: when passing named blocks, the invocation tag cannot take block params`,
          this.loc
        );
      }

      let seenNames = new Set<string>();

      for (let block of this.namedBlocks) {
        let name = block.name.chars;

        if (seenNames.has(name)) {
          throw generateSyntaxError(
            `Component had two named blocks with the same name, \`<:${name}>\`. Only one block with a given name may be passed`,
            this.loc
          );
        }

        if (
          (name === 'inverse' && seenNames.has('else')) ||
          (name === 'else' && seenNames.has('inverse'))
        ) {
          throw generateSyntaxError(
            `Component has both <:else> and <:inverse> block. <:inverse> is an alias for <:else>`,
            this.loc
          );
        }

        seenNames.add(name);
      }

      return this.namedBlocks;
    } else {
      return [
        this.block.builder.namedBlock(
          SourceSlice.synthetic('default'),
          this.block.builder.block(table, this.nonBlockChildren, this.loc),
          this.loc
        ),
      ];
    }
  }
}

function isLiteral(node: ASTv1.Expression): node is ASTv1.Literal {
  switch (node.type) {
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NumberLiteral':
    case 'UndefinedLiteral':
    case 'NullLiteral':
      return true;
    default:
      return false;
  }
}

function assertIllegalLiteral(node: ASTv1.Literal, loc: SourceSpan): never {
  let value = node.type === 'StringLiteral' ? JSON.stringify(node.value) : String(node.value);
  throw generateSyntaxError(`Unexpected literal \`${value}\``, loc);
}

function printPath(node: ASTv1.PathExpression | ASTv1.CallNode): string {
  if (node.type !== 'PathExpression' && node.path.type === 'PathExpression') {
    return printPath(node.path);
  } else {
    return new Printer({ entityEncoding: 'raw' }).print(node);
  }
}

function printHead(node: ASTv1.PathExpression | ASTv1.CallNode): string {
  if (node.type === 'PathExpression') {
    return node.head.original;
  } else if (node.path.type === 'PathExpression') {
    return printHead(node.path);
  } else {
    return new Printer({ entityEncoding: 'raw' }).print(node);
  }
}
