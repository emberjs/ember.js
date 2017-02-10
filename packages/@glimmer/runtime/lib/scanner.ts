import { CompiledDynamicTemplate, CompiledStaticTemplate } from './compiled/blocks';
import { builder } from './compiler';
import OpcodeBuilder from './compiled/opcodes/builder';
import Environment, { Helper } from './environment';
import { Option } from '@glimmer/util';
import { EMPTY_ARRAY } from './utils';
import { TemplateMeta } from '@glimmer/wire-format';
import * as WireFormat from '@glimmer/wire-format';
import { entryPoint as entryPointTable, layout as layoutTable, block as blockTable } from './symbol-table';
import { Opaque, SymbolTable, ProgramSymbolTable, BlockSymbolTable } from '@glimmer/interfaces';
import { ComponentDefinition } from './component/interfaces';
import { debugSlice } from './opcodes';

import {
  STATEMENTS
} from './syntax/functions';

import {
  SPECIALIZE
} from './syntax/specialize';

export type DeserializedStatement = WireFormat.Statement | WireFormat.Statements.Attribute | WireFormat.Statements.Argument;

export function compileStatement(statement: WireFormat.Statement, builder: OpcodeBuilder) {
  let refined = SPECIALIZE.specialize(statement, builder.symbolTable);
  STATEMENTS.compile(refined, builder);
}

export class RawTemplate<S extends SymbolTable> {
  private compiledStatic: Option<CompiledStaticTemplate> = null;
  private compiledDynamic: Option<CompiledDynamicTemplate<S>> = null;

  constructor(public statements: WireFormat.Statement[], public symbolTable: S) {}

  compileStatic(env: Environment): CompiledStaticTemplate {
    let { compiledStatic } = this;

    if (!compiledStatic) {
      let builder = compileStatements(this.statements, env, this.symbolTable);

      let start = builder.start;
      let end = builder.finalize();

      debugSlice(env, start, end);

      compiledStatic = this.compiledStatic = new CompiledStaticTemplate(start, end);
    }

    return compiledStatic;
  }

  compileDynamic(env: Environment): CompiledDynamicTemplate<S> {
    let { compiledDynamic } = this;

    if (!compiledDynamic) {
      let staticBlock = this.compileStatic(env);
      compiledDynamic = new CompiledDynamicTemplate(staticBlock.start, staticBlock.end, this.symbolTable);
    }

    return compiledDynamic;
  }

  toJSON() {
    return { GlimmerDebug: '<template>' };
  }
}

export type Template = RawTemplate<SymbolTable>;
export type Program = RawTemplate<ProgramSymbolTable>;
export type Block = RawTemplate<BlockSymbolTable>;

function compileStatements(statements: WireFormat.Statement[], env: Environment, table: SymbolTable) {
  let b = builder(env, table);
  for (let statement of statements) {
    let refined = SPECIALIZE.specialize(statement, table);
    STATEMENTS.compile(refined, b);
  }

  return b;
}

export function layout(prelude: WireFormat.Statement[], head: WireFormat.Statement[], body: WireFormat.Statement[], symbolTable: ProgramSymbolTable) {
  let [, tag] = prelude.pop() as WireFormat.Statements.OpenElement;
  prelude.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tag]);

  let statements = prelude
    .concat([[Ops.Yield, '%attrs%', EMPTY_ARRAY]])
    .concat(head)
    .concat(body);

  return new RawTemplate(statements, symbolTable);
}

export default class Scanner {
  constructor(private block: WireFormat.SerializedTemplateBlock, private meta: TemplateMeta, private env: Environment) {
  }

  scanEntryPoint(): RawTemplate<ProgramSymbolTable> {
    let { block, meta } = this;

    let statements;
    if (block.prelude && block.head) {
      statements = block.prelude.concat(block.head).concat(block.statements);
    } else {
      statements = block.statements;
    }

    let symbolTable = entryPointTable(meta);
    let child = scanBlock(statements, symbolTable, this.env);
    return new RawTemplate(child.statements, symbolTable);
  }

  scanLayout(): RawTemplate<ProgramSymbolTable> {
    let { block, meta } = this;
    let { named, yields, hasPartials } = block;

    if (!block.prelude || !block.head) {
      throw new Error(`A layout must have a top-level element`);
    }

    let symbolTable = layoutTable(meta, named, yields, hasPartials);
    let { statements: prelude } = scanBlock(block.prelude, symbolTable, this.env);
    let { statements: head } = scanBlock(block.head, symbolTable, this.env);
    let { statements: body } = scanBlock(block.statements, symbolTable, this.env);

    return layout(prelude, head, body, symbolTable);
  }

  scanPartial(symbolTable: ProgramSymbolTable): RawTemplate<ProgramSymbolTable> {
    let { block } = this;

    let child = scanBlock(block.statements, symbolTable, this.env);

    return new RawTemplate(child.statements, symbolTable);
  }
}

export function scanBlock<S extends SymbolTable>(statements: WireFormat.Statement[], symbolTable: S, env: Environment): RawTemplate<S> {
  return new RawInlineBlock(env, symbolTable, statements).scan();
}

import { PublicVM } from './vm';
import { VersionedPathReference } from '@glimmer/reference';

export namespace ClientSide {
  export enum Ops {
    ScannedComponent,
    ResolvedComponent,
    OpenComponentElement,
    OpenPrimitiveElement,
    OpenDynamicElement,
    OptimizedAppend,
    UnoptimizedAppend,
    AnyDynamicAttr,
    StaticPartial,
    DynamicPartial,
    NestedBlock,
    ScannedBlock,

    ResolvedHelper,
    FunctionExpression
  }

  export function is<T extends any[]>(variant: Ops): (value: any[]) => value is T {
    return function(value: any[]): value is T {
      return value[0] === WireFormat.Ops.ClientSideExpression || value[0] === WireFormat.Ops.ClientSideStatement && value[1] === variant;
    };
  }

  import ClientSideStatement = WireFormat.Ops.ClientSideStatement;
  import ClientSideExpression = WireFormat.Ops.ClientSideExpression;
  import Core = WireFormat.Core;

  export type ScannedComponent      = [ClientSideStatement, Ops.ScannedComponent, string, RawInlineBlock<BlockSymbolTable>, WireFormat.Core.Hash, Option<RawInlineBlock<BlockSymbolTable>>];
  export type ResolvedComponent     = [ClientSideStatement, Ops.ResolvedComponent, ComponentDefinition<Opaque>, Option<RawInlineBlock<BlockSymbolTable>>, WireFormat.Core.Args, Option<Block>, Option<Block>];
  export type OpenComponentElement  = [ClientSideStatement, Ops.OpenComponentElement, string];
  export type OpenPrimitiveElement  = [ClientSideStatement, Ops.OpenPrimitiveElement, string, string[]];
  export type OpenDynamicElement    = [ClientSideStatement, Ops.OpenDynamicElement, WireFormat.Expression];
  export type OptimizedAppend       = [ClientSideStatement, Ops.OptimizedAppend, WireFormat.Expression, boolean];
  export type UnoptimizedAppend     = [ClientSideStatement, Ops.UnoptimizedAppend, WireFormat.Expression, boolean];
  export type AnyDynamicAttr        = [ClientSideStatement, Ops.AnyDynamicAttr, string, WireFormat.Expression, Option<string>, boolean];
  export type StaticPartial         = [ClientSideStatement, Ops.StaticPartial, string];
  export type DynamicPartial        = [ClientSideStatement, Ops.DynamicPartial, WireFormat.Expression];
  export type NestedBlock           = [ClientSideStatement, Ops.NestedBlock, WireFormat.Core.Path, WireFormat.Core.Params, WireFormat.Core.Hash, Option<Block>, Option<Block>];
  export type ScannedBlock          = [ClientSideStatement, Ops.ScannedBlock, Core.Path, Core.Params, Core.Hash, Option<RawInlineBlock<BlockSymbolTable>>, Option<RawInlineBlock<BlockSymbolTable>>];

  export type ResolvedHelper        = [ClientSideExpression, Ops.ResolvedHelper, Helper, Core.Params, Core.Hash];
  export type FunctionExpression    = [ClientSideExpression, Ops.FunctionExpression, FunctionExpressionCallback<Opaque>];

  export type FunctionExpressionCallback<T> = (VM: PublicVM, symbolTable: SymbolTable) => VersionedPathReference<T>;

  export type ClientSideStatement =
      ScannedComponent
    | ResolvedComponent
    | OpenComponentElement
    | OpenPrimitiveElement
    | OpenDynamicElement
    | OptimizedAppend
    | UnoptimizedAppend
    | AnyDynamicAttr
    | StaticPartial
    | DynamicPartial
    | NestedBlock
    | ScannedBlock
    ;

  export type ClientSideExpression =
      ResolvedHelper
    | FunctionExpression
    ;
}

const { Ops } = WireFormat;

export class RawInlineBlock<S extends SymbolTable> {
  constructor(private env: Environment, private table: S, private statements: WireFormat.Statement[]) {}

  scan(): RawTemplate<S> {
    let buffer: WireFormat.Statement[] = [];
    let statements = this.statements;
    for (let statement of statements) {
      if (WireFormat.Statements.isBlock(statement)) {
        buffer.push(this.specializeBlock(statement));
      } else if (WireFormat.Statements.isComponent(statement)) {
        buffer.push(...this.specializeComponent(statement));
      } else {
        buffer.push(statement);
      }
    }

    return new RawTemplate<S>(buffer, this.table);
  }

  private specializeBlock(block: WireFormat.Statements.Block): ClientSide.ScannedBlock {
    let [, path, params, hash, RawTemplate, inverse] = block;
    return [Ops.ClientSideStatement, ClientSide.Ops.ScannedBlock, path, params, hash, this.child(RawTemplate), this.child(inverse)];
  }

  private specializeComponent(sexp: WireFormat.Statements.Component): WireFormat.Statement[] {
    let [, tag, component] = sexp;

    if (this.env.hasComponentDefinition(tag, this.table)) {
      let child = this.child(component);
      let attrs = new RawInlineBlock(this.env, this.table, component.attrs);
      return [[Ops.ClientSideStatement, ClientSide.Ops.ScannedComponent, tag, attrs, component.args, child]];
    } else {
      return [
        [Ops.OpenElement, tag, EMPTY_ARRAY],
        ...component.attrs,
        [Ops.FlushElement],
        ...component.statements,
        [Ops.CloseElement]
      ];
    }
  }

  child(block: Option<WireFormat.SerializedBlock>): Option<RawInlineBlock<BlockSymbolTable>> {
    if (!block) return null;
    let table = blockTable(this.table, block.locals);
    return new RawInlineBlock(this.env, table, block.statements);
  }
}
