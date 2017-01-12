import { CompiledProgram, CompiledBlock } from './compiled/blocks';
import { builder } from './compiler';
import OpcodeBuilder from './compiled/opcodes/builder';
import Environment from './environment';
import { Option } from '@glimmer/util';
import { EMPTY_ARRAY } from './utils';
import { TemplateMeta } from '@glimmer/wire-format';
import * as WireFormat from '@glimmer/wire-format';
import { entryPoint as entryPointTable, layout as layoutTable, block as blockTable } from './symbol-table';
import { Opaque, SymbolTable, ProgramSymbolTable } from '@glimmer/interfaces';
import { ComponentDefinition } from './component/interfaces';

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

export abstract class Template {
  constructor(public symbolTable: SymbolTable) {}

  abstract compile(env: Environment): CompiledBlock;
}

function compileStatements(statements: BaselineSyntax.AnyStatement[], env: Environment, table: SymbolTable) {
  let b = builder(env, table);
  for (let statement of statements) {
    let refined = SPECIALIZE.specialize(statement, table);
    STATEMENTS.compile(refined, b);
  }

  return b;
}

export class EntryPoint extends Template {
  private compiled: Option<CompiledProgram> = null;

  public symbolTable: ProgramSymbolTable;

  constructor(public statements: BaselineSyntax.AnyStatement[], symbolTable: ProgramSymbolTable) {
    super(symbolTable);
  }

  compile(env: Environment): CompiledProgram {
    let compiled = this.compiled;

    if (!compiled) {
      let builder = compileStatements(this.statements, env, this.symbolTable);

      let start = builder.start;
      let end = builder.finalize();

       compiled = this.compiled = new CompiledProgram(start, end, this.symbolTable.size);
    }

    return compiled;
  }
}

export class Layout extends EntryPoint {
  public symbolTable: ProgramSymbolTable;

  constructor(prelude: BaselineSyntax.AnyStatement[], head: BaselineSyntax.AnyStatement[], body: BaselineSyntax.AnyStatement[], symbolTable: ProgramSymbolTable) {
    let [, tag] = prelude.pop() as WireFormat.Statements.OpenElement;
    prelude.push([Ops.OpenComponentElement, tag]);

    let statements = prelude
      .concat([[Ops.Yield, '%attrs%', EMPTY_ARRAY]])
      .concat(head)
      .concat(body);

    super(statements, symbolTable);
  }
}

export class InlineBlock extends Template {
  private compiled: Option<CompiledBlock> = null;

  constructor(public statements: BaselineSyntax.AnyStatement[], symbolTable: SymbolTable) {
    super(symbolTable);
  }

  splat(builder: OpcodeBuilder) {
    let table = builder.symbolTable;

    for (let statement of this.statements) {
      let refined = SPECIALIZE.specialize(statement, table);
      STATEMENTS.compile(refined, builder);
    }
  }

  compile(env: Environment): CompiledBlock {
    let { compiled } = this;

    if (!compiled) {
      let builder = compileStatements(this.statements, env, this.symbolTable);

      let start = builder.start;
      let end = builder.finalize();

       compiled = this.compiled = new CompiledBlock(start, end);
    }

    return compiled;
  }

  toJSON() {
    return { GlimmerDebug: '<block>' };
  }
}

export default class Scanner {
  constructor(private block: BaselineSyntax.SerializedTemplateBlock, private meta: TemplateMeta, private env: Environment) {
  }

  scanEntryPoint(): EntryPoint {
    let { block, meta } = this;

    let statements;
    if (block.prelude && block.head) {
      statements = block.prelude.concat(block.head).concat(block.statements);
    } else {
      statements = block.statements;
    }

    let symbolTable = entryPointTable(meta);
    let child = scanBlock(statements, symbolTable, this.env);
    return new EntryPoint(child.statements, symbolTable);
  }

  scanLayout(): Layout {
    let { block, meta } = this;
    let { named, yields, hasPartials } = block;

    if (!block.prelude || !block.head) {
      throw new Error(`A layout must have a top-level element`);
    }

    let symbolTable = layoutTable(meta, named, yields, hasPartials);
    let { statements: prelude } = scanBlock(block.prelude, symbolTable, this.env);
    let { statements: head } = scanBlock(block.head, symbolTable, this.env);
    let { statements: body } = scanBlock(block.statements, symbolTable, this.env);

    return new Layout(prelude, head, body, symbolTable);
  }

  scanPartial(symbolTable: SymbolTable): EntryPoint {
    let { block } = this;

    let child = scanBlock(block.statements, symbolTable, this.env);

    return new EntryPoint(child.statements, symbolTable);
  }
}

export function scanBlock(statements: BaselineSyntax.AnyStatement[], symbolTable: SymbolTable, env: Environment): InlineBlock {
  return new RawInlineBlock(env, symbolTable, statements).scan();
}

import { PublicVM } from './vm';
import { VersionedPathReference } from '@glimmer/reference';

export namespace BaselineSyntax {
  import Core = WireFormat.Core;

  const { Ops } = WireFormat;

  // TODO: use symbols for sexp[0]?
  export type ScannedComponent = [number, string, RawInlineBlock, WireFormat.Core.Hash, Option<RawInlineBlock>];
  export const isScannedComponent = WireFormat.is<ScannedComponent>(Ops.ScannedComponent);

  export type ResolvedComponent = [number, ComponentDefinition<Opaque>, Option<RawInlineBlock>, WireFormat.Core.Args, Option<InlineBlock>, Option<InlineBlock>]
  export const isResolvedComponent = WireFormat.is<ResolvedComponent>(Ops.ResolvedComponent);

  import Params = WireFormat.Core.Params;
  import Hash = WireFormat.Core.Hash;
  export type Block = InlineBlock;

  export type OpenComponentElement = [number, string];
  export const isOpenComponentElement = WireFormat.is<OpenComponentElement>(Ops.OpenComponentElement);

  export type OpenPrimitiveElement = [number, string, string[]];
  export const isPrimitiveElement = WireFormat.is<OpenPrimitiveElement>(Ops.OpenPrimitiveElement);

  export type OpenDynamicElement = [number, BaselineSyntax.AnyExpression];
  export const isDynamicElement = WireFormat.is<OpenDynamicElement>(Ops.OpenDynamicElement);

  export type OptimizedAppend = [number, WireFormat.Expression, boolean];
  export const isOptimizedAppend = WireFormat.is<OptimizedAppend>(Ops.OptimizedAppend);

  export type UnoptimizedAppend = [number, WireFormat.Expression, boolean];
  export const isUnoptimizedAppend = WireFormat.is<UnoptimizedAppend>(Ops.UnoptimizedAppend);

  export type AnyDynamicAttr = [number, string, WireFormat.Expression, Option<string>, boolean];
  export const isAnyAttr = WireFormat.is<AnyDynamicAttr>(Ops.AnyDynamicAttr);

  export type StaticPartial = [number, string];
  export const isStaticPartial = WireFormat.is<StaticPartial>(Ops.StaticPartial);
  export type DynamicPartial = [number, WireFormat.Expression];
  export const isDynamicPartial = WireFormat.is<DynamicPartial>(Ops.DynamicPartial);

  export type FunctionExpressionCallback<T> = (VM: PublicVM, symbolTable: SymbolTable) => VersionedPathReference<T>;
  export type FunctionExpression = [number, FunctionExpressionCallback<Opaque>];
  export const isFunctionExpression = WireFormat.is<FunctionExpression>(Ops.Function);

  export interface SerializedBlock {
    locals: string[];
    statements: AnyStatement[];
  }

  export interface SerializedTemplateBlock extends SerializedBlock {
    prelude: AnyStatement[];
    head: AnyStatement[];
    named: string[];
    yields: string[];
    hasPartials: boolean;
  }

  export type BaselineBlock = [number, WireFormat.Core.Path, AnyExpression[], Option<[string[], AnyExpression[]]>, SerializedBlock, Option<SerializedBlock>];
  export const isBaselineBlock = WireFormat.is<BaselineBlock>(Ops.BaselineBlock);

  export type NestedBlock = [number, WireFormat.Core.Path, WireFormat.Core.Params, WireFormat.Core.Hash, Option<Block>, Option<Block>];
  export const isNestedBlock = WireFormat.is<NestedBlock>(Ops.NestedBlock);

  export type ScannedBlock = [number, Core.Path, Core.Params, Core.Hash, Option<RawInlineBlock>, Option<RawInlineBlock>];
  export const isScannedBlock = WireFormat.is<ScannedBlock>(Ops.ScannedBlock);

  export type Debugger = [number];
  export const isDebugger = WireFormat.is<Debugger>(Ops.Debugger);

  export type Args = [Params, Hash, Option<Block>, Option<Block>];

  export namespace NestedBlock {
    export function defaultBlock(sexp: NestedBlock): Option<InlineBlock> {
      return sexp[4];
    }

    export function inverseBlock(sexp: NestedBlock): Option<InlineBlock> {
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
  export type AnyExpression = FunctionExpression | WireFormat.Expression;

  export type Program = AnyStatement[];
}

const { Ops } = WireFormat;

export class RawInlineBlock {
  constructor(private env: Environment, private table: SymbolTable, private statements: BaselineSyntax.AnyStatement[]) {}

  scan(): InlineBlock {
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

    return new InlineBlock(buffer, this.table);
  }

  private specializeBlock(block: WireFormat.Statements.Block | BaselineSyntax.BaselineBlock): BaselineSyntax.ScannedBlock {
    let [, path, params, hash, template, inverse] = block;
    return [Ops.ScannedBlock, path, params, hash, this.child(template), this.child(inverse)];
  }

  private specializeComponent(sexp: WireFormat.Statements.Component): BaselineSyntax.AnyStatement[] {
    let [, tag, component] = sexp;

    if (this.env.hasComponentDefinition([tag], this.table)) {
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

  child(block: Option<BaselineSyntax.SerializedBlock>): Option<RawInlineBlock> {
    if (!block) return null;
    let table = blockTable(this.table, block.locals);
    return new RawInlineBlock(this.env, table, block.statements);
  }
}
