import type { PresentArray } from '@glimmer/interfaces';
import { assert, assertPresent, assign } from '@glimmer/util';

import { SourceSlice } from '../source/slice';
import { SourceSpan } from '../source/span';
import { SpanList } from '../source/span-list';
import { BlockSymbolTable, ProgramSymbolTable, SymbolTable } from '../symbol-table';
import * as ASTv2 from './api';

export interface CallParts {
  callee: ASTv2.ExpressionNode;
  args: ASTv2.Args;
}

export class Builder {
  // TEMPLATE //

  template(
    symbols: ProgramSymbolTable,
    body: ASTv2.ContentNode[],
    loc: SourceSpan
  ): ASTv2.Template {
    return new ASTv2.Template({
      table: symbols,
      body,
      loc,
    });
  }

  // INTERNAL (these nodes cannot be reached when doing general-purpose visiting) //

  block(symbols: BlockSymbolTable, body: ASTv2.ContentNode[], loc: SourceSpan): ASTv2.Block {
    return new ASTv2.Block({
      scope: symbols,
      body,
      loc,
    });
  }

  namedBlock(name: SourceSlice, block: ASTv2.Block, loc: SourceSpan): ASTv2.NamedBlock {
    return new ASTv2.NamedBlock({
      name,
      block,
      attrs: [],
      componentArgs: [],
      modifiers: [],
      loc,
    });
  }

  simpleNamedBlock(name: SourceSlice, block: ASTv2.Block, loc: SourceSpan): ASTv2.NamedBlock {
    return new BuildElement({
      selfClosing: false,
      attrs: [],
      componentArgs: [],
      modifiers: [],
      comments: [],
    }).named(name, block, loc);
  }

  slice(chars: string, loc: SourceSpan): SourceSlice {
    return new SourceSlice({
      loc,
      chars,
    });
  }

  args(
    positional: ASTv2.PositionalArguments,
    named: ASTv2.NamedArguments,
    loc: SourceSpan
  ): ASTv2.Args {
    return new ASTv2.Args({
      loc,
      positional,
      named,
    });
  }

  positional(exprs: ASTv2.ExpressionNode[], loc: SourceSpan): ASTv2.PositionalArguments {
    return new ASTv2.PositionalArguments({
      loc,
      exprs,
    });
  }

  namedArgument(key: SourceSlice, value: ASTv2.ExpressionNode): ASTv2.NamedArgument {
    return new ASTv2.NamedArgument({
      name: key,
      value,
    });
  }

  named(entries: ASTv2.NamedArgument[], loc: SourceSpan): ASTv2.NamedArguments {
    return new ASTv2.NamedArguments({
      loc,
      entries,
    });
  }

  attr(
    {
      name,
      value,
      trusting,
    }: { name: SourceSlice; value: ASTv2.ExpressionNode; trusting: boolean },
    loc: SourceSpan
  ): ASTv2.HtmlAttr {
    return new ASTv2.HtmlAttr({
      loc,
      name,
      value,
      trusting,
    });
  }

  splatAttr(symbol: number, loc: SourceSpan): ASTv2.SplatAttr {
    return new ASTv2.SplatAttr({
      symbol,
      loc,
    });
  }

  arg(
    {
      name,
      value,
      trusting,
    }: { name: SourceSlice; value: ASTv2.ExpressionNode; trusting: boolean },
    loc: SourceSpan
  ): ASTv2.ComponentArg {
    return new ASTv2.ComponentArg({
      name,
      value,
      trusting,
      loc,
    });
  }

  // EXPRESSIONS //

  path(head: ASTv2.VariableReference, tail: SourceSlice[], loc: SourceSpan): ASTv2.PathExpression {
    return new ASTv2.PathExpression({
      loc,
      ref: head,
      tail,
    });
  }

  self(loc: SourceSpan): ASTv2.VariableReference {
    return new ASTv2.ThisReference({
      loc,
    });
  }

  at(name: string, symbol: number, loc: SourceSpan): ASTv2.VariableReference {
    // the `@` should be included so we have a complete source range
    assert(name[0] === '@', `call builders.at() with a string that starts with '@'`);

    return new ASTv2.ArgReference({
      loc,
      name: new SourceSlice({ loc, chars: name }),
      symbol,
    });
  }

  freeVar({
    name,
    context,
    symbol,
    loc,
  }: {
    name: string;
    context: ASTv2.FreeVarResolution;
    symbol: number;
    loc: SourceSpan;
  }): ASTv2.VariableReference {
    assert(
      name !== 'this',
      `You called builders.freeVar() with 'this'. Call builders.this instead`
    );
    assert(
      name[0] !== '@',
      `You called builders.freeVar() with '${name}'. Call builders.at('${name}') instead`
    );

    return new ASTv2.FreeVarReference({
      name,
      resolution: context,
      symbol,
      loc,
    });
  }

  localVar(name: string, symbol: number, loc: SourceSpan): ASTv2.VariableReference {
    assert(name !== 'this', `You called builders.var() with 'this'. Call builders.this instead`);
    assert(
      name[0] !== '@',
      `You called builders.var() with '${name}'. Call builders.at('${name}') instead`
    );

    return new ASTv2.LocalVarReference({
      loc,
      name,
      symbol,
    });
  }

  sexp(parts: CallParts, loc: SourceSpan): ASTv2.CallExpression {
    return new ASTv2.CallExpression({
      loc,
      callee: parts.callee,
      args: parts.args,
    });
  }

  interpolate(parts: ASTv2.ExpressionNode[], loc: SourceSpan): ASTv2.InterpolateExpression {
    assertPresent(parts);

    return new ASTv2.InterpolateExpression({
      loc,
      parts,
    });
  }

  literal(value: string, loc: SourceSpan): ASTv2.LiteralExpression & { value: string };
  literal(value: number, loc: SourceSpan): ASTv2.LiteralExpression & { value: number };
  literal(value: boolean, loc: SourceSpan): ASTv2.LiteralExpression & { value: boolean };
  literal(value: null, loc: SourceSpan): ASTv2.LiteralExpression & { value: null };
  literal(value: undefined, loc: SourceSpan): ASTv2.LiteralExpression & { value: undefined };
  literal(
    value: string | number | boolean | null | undefined,
    loc: SourceSpan
  ): ASTv2.LiteralExpression;
  literal(
    value: string | number | boolean | null | undefined,
    loc: SourceSpan
  ): ASTv2.LiteralExpression {
    return new ASTv2.LiteralExpression({
      loc,
      value,
    });
  }

  // STATEMENTS //

  append(
    {
      table,
      trusting,
      value,
    }: { table: SymbolTable; trusting: boolean; value: ASTv2.ExpressionNode },
    loc: SourceSpan
  ): ASTv2.AppendContent {
    return new ASTv2.AppendContent({
      table,
      trusting,
      value,
      loc,
    });
  }

  modifier({ callee, args }: CallParts, loc: SourceSpan): ASTv2.ElementModifier {
    return new ASTv2.ElementModifier({
      loc,
      callee,
      args,
    });
  }

  namedBlocks(blocks: ASTv2.NamedBlock[], loc: SourceSpan): ASTv2.NamedBlocks {
    return new ASTv2.NamedBlocks({
      loc,
      blocks,
    });
  }

  blockStatement(
    {
      symbols,
      program,
      inverse = null,
      ...call
    }: {
      symbols: SymbolTable;
      program: ASTv2.Block;
      inverse?: ASTv2.Block | null;
    } & CallParts,
    loc: SourceSpan
  ): ASTv2.InvokeBlock {
    let blocksLoc = program.loc;
    let blocks: PresentArray<ASTv2.NamedBlock> = [
      this.namedBlock(SourceSlice.synthetic('default'), program, program.loc),
    ];
    if (inverse) {
      blocksLoc = blocksLoc.extend(inverse.loc);
      blocks.push(this.namedBlock(SourceSlice.synthetic('else'), inverse, inverse.loc));
    }

    return new ASTv2.InvokeBlock({
      loc,
      blocks: this.namedBlocks(blocks, blocksLoc),
      callee: call.callee,
      args: call.args,
    });
  }

  element(options: BuildBaseElement): BuildElement {
    return new BuildElement(options);
  }
}

export interface BuildBaseElement {
  selfClosing: boolean;
  attrs: ASTv2.HtmlOrSplatAttr[];
  componentArgs: ASTv2.ComponentArg[];
  modifiers: ASTv2.ElementModifier[];
  comments: ASTv2.GlimmerComment[];
}

export class BuildElement {
  readonly builder: Builder;
  constructor(readonly base: BuildBaseElement) {
    this.builder = new Builder();
  }

  simple(tag: SourceSlice, body: ASTv2.ContentNode[], loc: SourceSpan): ASTv2.SimpleElement {
    return new ASTv2.SimpleElement(
      assign(
        {
          tag,
          body,
          componentArgs: [],
          loc,
        },
        this.base
      )
    );
  }

  named(name: SourceSlice, block: ASTv2.Block, loc: SourceSpan): ASTv2.NamedBlock {
    return new ASTv2.NamedBlock(
      assign(
        {
          name,
          block,
          componentArgs: [],
          loc,
        },
        this.base
      )
    );
  }

  selfClosingComponent(callee: ASTv2.ExpressionNode, loc: SourceSpan): ASTv2.InvokeComponent {
    return new ASTv2.InvokeComponent(
      assign(
        {
          loc,
          callee,
          // point the empty named blocks at the `/` self-closing tag
          blocks: new ASTv2.NamedBlocks({
            blocks: [],
            loc: loc.sliceEndChars({ skipEnd: 1, chars: 1 }),
          }),
        },
        this.base
      )
    );
  }

  componentWithDefaultBlock(
    callee: ASTv2.ExpressionNode,
    children: ASTv2.ContentNode[],
    symbols: BlockSymbolTable,
    loc: SourceSpan
  ): ASTv2.InvokeComponent {
    let block = this.builder.block(symbols, children, loc);
    let namedBlock = this.builder.namedBlock(SourceSlice.synthetic('default'), block, loc); // BUILDER.simpleNamedBlock('default', children, symbols, loc);

    return new ASTv2.InvokeComponent(
      assign(
        {
          loc,
          callee,
          blocks: this.builder.namedBlocks([namedBlock], namedBlock.loc),
        },
        this.base
      )
    );
  }

  componentWithNamedBlocks(
    callee: ASTv2.ExpressionNode,
    blocks: PresentArray<ASTv2.NamedBlock>,
    loc: SourceSpan
  ): ASTv2.InvokeComponent {
    return new ASTv2.InvokeComponent(
      assign(
        {
          loc,
          callee,
          blocks: this.builder.namedBlocks(blocks, SpanList.range(blocks)),
        },
        this.base
      )
    );
  }
}
