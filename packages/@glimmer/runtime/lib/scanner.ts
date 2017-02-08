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

export function compileStatement(statement: BaselineSyntax.AnyStatement, builder: OpcodeBuilder) {
  let refined = SPECIALIZE.specialize(statement, builder.symbolTable);
  STATEMENTS.compile(refined, builder);
}

export class RawTemplate<S extends SymbolTable> {
  private compiledStatic: Option<CompiledStaticTemplate> = null;
  private compiledDynamic: Option<CompiledDynamicTemplate<S>> = null;

  constructor(public statements: BaselineSyntax.AnyStatement[], public symbolTable: S) {}

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

function compileStatements(statements: BaselineSyntax.AnyStatement[], env: Environment, table: SymbolTable) {
  let b = builder(env, table);
  for (let statement of statements) {
    let refined = SPECIALIZE.specialize(statement, table);
    STATEMENTS.compile(refined, b);
  }

  return b;
}

export function layout(prelude: BaselineSyntax.AnyStatement[], head: BaselineSyntax.AnyStatement[], body: BaselineSyntax.AnyStatement[], symbolTable: ProgramSymbolTable) {
  let [, tag] = prelude.pop() as WireFormat.Statements.OpenElement;
  prelude.push([Ops.OpenComponentElement, tag]);

  let statements = prelude
    .concat([[Ops.Yield, '%attrs%', EMPTY_ARRAY]])
    .concat(head)
    .concat(body);

  return new RawTemplate(statements, symbolTable);
}

export default class Scanner {
  constructor(private block: BaselineSyntax.SerializedTemplateBlock, private meta: TemplateMeta, private env: Environment) {
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

export function scanBlock<S extends SymbolTable>(statements: BaselineSyntax.AnyStatement[], symbolTable: S, env: Environment): RawTemplate<S> {
  return new RawInlineBlock(env, symbolTable, statements).scan();
}

import { PublicVM } from './vm';
import { VersionedPathReference } from '@glimmer/reference';

export namespace BaselineSyntax {
  import Core = WireFormat.Core;
  import Ops = WireFormat.Ops;

  // TODO: use symbols for sexp[0]?
  export type ScannedComponent = [Ops.ScannedComponent, string, RawInlineBlock<BlockSymbolTable>, WireFormat.Core.Hash, Option<RawInlineBlock<BlockSymbolTable>>];
  export const isScannedComponent = WireFormat.is<ScannedComponent>(Ops.ScannedComponent);

  export type ResolvedComponent = [Ops.ResolvedComponent, ComponentDefinition<Opaque>, Option<RawInlineBlock<BlockSymbolTable>>, WireFormat.Core.Args, Option<RawTemplate<BlockSymbolTable>>, Option<RawTemplate<BlockSymbolTable>>];
  export const isResolvedComponent = WireFormat.is<ResolvedComponent>(Ops.ResolvedComponent);

  export type ResolvedHelper = [Ops.ResolvedHelper, Helper, Core.Params, Core.Hash];
  export const isResolvedHelper = WireFormat.is<ResolvedHelper>(Ops.ResolvedHelper);

  import Params = WireFormat.Core.Params;
  import Hash = WireFormat.Core.Hash;
  export type Block = RawTemplate<BlockSymbolTable>;

  export type OpenComponentElement = [Ops.OpenComponentElement, string];
  export const isOpenComponentElement = WireFormat.is<OpenComponentElement>(Ops.OpenComponentElement);

  export type OpenPrimitiveElement = [Ops.OpenPrimitiveElement, string, string[]];
  export const isPrimitiveElement = WireFormat.is<OpenPrimitiveElement>(Ops.OpenPrimitiveElement);

  export type OpenDynamicElement = [Ops.OpenDynamicElement, BaselineSyntax.AnyExpression];
  export const isDynamicElement = WireFormat.is<OpenDynamicElement>(Ops.OpenDynamicElement);

  export type OptimizedAppend = [Ops.OptimizedAppend, WireFormat.Expression, boolean];
  export const isOptimizedAppend = WireFormat.is<OptimizedAppend>(Ops.OptimizedAppend);

  export type UnoptimizedAppend = [Ops.UnoptimizedAppend, WireFormat.Expression, boolean];
  export const isUnoptimizedAppend = WireFormat.is<UnoptimizedAppend>(Ops.UnoptimizedAppend);

  export type AnyDynamicAttr = [Ops.AnyDynamicAttr, string, WireFormat.Expression, Option<string>, boolean];
  export const isAnyAttr = WireFormat.is<AnyDynamicAttr>(Ops.AnyDynamicAttr);

  export type StaticPartial = [Ops.StaticPartial, string];
  export const isStaticPartial = WireFormat.is<StaticPartial>(Ops.StaticPartial);

  export type DynamicPartial = [Ops.DynamicPartial, WireFormat.Expression];
  export const isDynamicPartial = WireFormat.is<DynamicPartial>(Ops.DynamicPartial);

  export type FunctionExpressionCallback<T> = (VM: PublicVM, symbolTable: SymbolTable) => VersionedPathReference<T>;
  export type FunctionExpression = [Ops.Function, FunctionExpressionCallback<Opaque>];
  export const isFunctionExpression = WireFormat.is<FunctionExpression>(Ops.Function);

  export interface SerializedBlock {
    locals: string[];
    statements: AnyStatement[];
  }

  export interface SerializedTemplateBlock extends SerializedBlock {
    prelude: Option<AnyStatement[]>;
    head: Option<AnyStatement[]>;
    named: string[];
    yields: string[];
    hasPartials: boolean;
  }

  export type BaselineBlock = [Ops.BaselineBlock, WireFormat.Core.Path, AnyExpression[], Option<[string[], AnyExpression[]]>, SerializedBlock, Option<SerializedBlock>];
  export const isBaselineBlock = WireFormat.is<BaselineBlock>(Ops.BaselineBlock);

  export type NestedBlock = [Ops.NestedBlock, WireFormat.Core.Path, WireFormat.Core.Params, WireFormat.Core.Hash, Option<Block>, Option<Block>];
  export const isNestedBlock = WireFormat.is<NestedBlock>(Ops.NestedBlock);

  export type ScannedBlock = [Ops.ScannedBlock, Core.Path, Core.Params, Core.Hash, Option<RawInlineBlock<BlockSymbolTable>>, Option<RawInlineBlock<BlockSymbolTable>>];
  export const isScannedBlock = WireFormat.is<ScannedBlock>(Ops.ScannedBlock);

  export type Debugger = [Ops.Debugger];
  export const isDebugger = WireFormat.is<Debugger>(Ops.Debugger);

  export type Args = [Params, Hash, Option<Block>, Option<Block>];

  export namespace NestedBlock {
    export function defaultBlock(sexp: NestedBlock): Option<RawTemplate<BlockSymbolTable>> {
      return sexp[4];
    }

    export function inverseBlock(sexp: NestedBlock): Option<RawTemplate<BlockSymbolTable>> {
      return sexp[5];
    }

    export function params(sexp: NestedBlock): WireFormat.Core.Params {
      return sexp[2];
    }

    export function hash(sexp: NestedBlock): WireFormat.Core.Hash {
      return sexp[3];
    }
  }

  export type Statement =
      ScannedComponent
    | ResolvedComponent
    | OpenComponentElement
    | OpenPrimitiveElement
    | OpenDynamicElement
    | OptimizedAppend
    | UnoptimizedAppend
    | StaticPartial
    | DynamicPartial
    | AnyDynamicAttr
    | NestedBlock
    | ScannedBlock
    | Debugger
    | BaselineBlock
    ;

  export type AnyStatement = Statement | WireFormat.Statement;
  export type AnyExpression = FunctionExpression | ResolvedHelper | WireFormat.Expression;

  export type Program = AnyStatement[];
}

const { Ops } = WireFormat;

export class RawInlineBlock<S extends SymbolTable> {
  constructor(private env: Environment, private table: S, private statements: BaselineSyntax.AnyStatement[]) {}

  scan(): RawTemplate<S> {
    let buffer: BaselineSyntax.AnyStatement[] = [];
    let statements = this.statements;
    for (let statement of statements) {
      if (WireFormat.Statements.isBlock(statement) || BaselineSyntax.isBaselineBlock(statement)) {
        buffer.push(this.specializeBlock(statement));
      } else if (WireFormat.Statements.isComponent(statement)) {
        buffer.push(...this.specializeComponent(statement));
      } else {
        buffer.push(statement);
      }
    }

    return new RawTemplate<S>(buffer, this.table);
  }

  private specializeBlock(block: WireFormat.Statements.Block | BaselineSyntax.BaselineBlock): BaselineSyntax.ScannedBlock {
    let [, path, params, hash, RawTemplate, inverse] = block;
    return [Ops.ScannedBlock, path, params, hash, this.child(RawTemplate), this.child(inverse)];
  }

  private specializeComponent(sexp: WireFormat.Statements.Component): BaselineSyntax.AnyStatement[] {
    let [, tag, component] = sexp;

    if (this.env.hasComponentDefinition(tag, this.table)) {
      let child = this.child(component);
      let attrs = new RawInlineBlock(this.env, this.table, component.attrs);
      return [[Ops.ScannedComponent, tag, attrs, component.args, child]];
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

  child(block: Option<BaselineSyntax.SerializedBlock>): Option<RawInlineBlock<BlockSymbolTable>> {
    if (!block) return null;
    let table = blockTable(this.table, block.locals);
    return new RawInlineBlock(this.env, table, block.statements);
  }
}
