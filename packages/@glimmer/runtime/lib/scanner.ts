import { CompiledDynamicTemplate, CompiledStaticTemplate } from './compiled/blocks';
import { builder } from './compiler';
import OpcodeBuilder from './compiled/opcodes/builder';
import Environment, { Helper } from './environment';
import { Option } from '@glimmer/util';
import { EMPTY_ARRAY } from './utils';
import * as WireFormat from '@glimmer/wire-format';
import { Opaque, SymbolTable, ProgramSymbolTable, BlockSymbolTable } from '@glimmer/interfaces';
import { ComponentDefinition } from './component/interfaces';
import { debugSlice } from './opcodes';
import { CompilationMeta } from '@glimmer/interfaces';

import {
  STATEMENTS
} from './syntax/functions';

import {
  SPECIALIZE
} from './syntax/specialize';

export type DeserializedStatement = WireFormat.Statement | WireFormat.Statements.Attribute | WireFormat.Statements.Argument;

export function compileStatement(statement: WireFormat.Statement, builder: OpcodeBuilder) {
  let refined = SPECIALIZE.specialize(statement);
  STATEMENTS.compile(refined, builder);
}

export interface ScannedTemplate<S extends SymbolTable> {
  compileStatic(env: Environment): CompiledStaticTemplate;
  compileDynamic(env: Environment): CompiledDynamicTemplate<S>;
}

export class CompilableTemplate<S extends SymbolTable> implements ScannedTemplate<S> {
  private compiledStatic: Option<CompiledStaticTemplate> = null;
  private compiledDynamic: Option<CompiledDynamicTemplate<S>> = null;

  constructor(public statements: WireFormat.Statement[], public symbolTable: S) {}

  compileStatic(env: Environment): CompiledStaticTemplate {
    let { compiledStatic } = this;

    if (!compiledStatic) {
      let builder = compileStatements(this.statements, this.symbolTable.meta, env);

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

export type Template = CompilableTemplate<SymbolTable>;
export type Program = CompilableTemplate<ProgramSymbolTable>;
export type Block = CompilableTemplate<BlockSymbolTable>;

export type ScannedProgram = ScannedTemplate<ProgramSymbolTable>;
export type ScannedBlock = ScannedTemplate<BlockSymbolTable>;

function compileStatements(statements: WireFormat.Statement[], meta: CompilationMeta, env: Environment) {
  let b = builder(env, meta);
  for (let statement of statements) {
    let refined = SPECIALIZE.specialize(statement);
    STATEMENTS.compile(refined, b);
  }

  return b;
}

export const ATTRS_BLOCK = '&attrs';

export function layout(prelude: WireFormat.Statement[], head: WireFormat.Statement[], body: WireFormat.Statement[], symbolTable: ProgramSymbolTable) {
  let [, tag] = prelude.pop() as WireFormat.Statements.OpenElement;
  prelude.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tag]);

  let attrsSymbol = symbolTable.symbols.length + 1;
  symbolTable.symbols.push(ATTRS_BLOCK);

  let statements = prelude
    .concat([[Ops.Yield, attrsSymbol, EMPTY_ARRAY]])
    .concat(head)
    .concat(body);

  return new CompilableTemplate(statements, symbolTable);
}

export default class Scanner {
  constructor(private block: WireFormat.SerializedTemplateBlock, private env: Environment) {
  }

  scanEntryPoint(meta: CompilationMeta): Program {
    let { block, env } = this;

    let statements;
    if (block.prelude && block.head) {
      statements = block.prelude.concat(block.head).concat(block.statements);
    } else {
      statements = block.statements;
    }

    return new RawProgram(env, meta, statements, block.symbols, block.hasEval).scan();
  }

  scanBlock(meta: CompilationMeta): Block {
    let { block, env } = this;

    let statements;
    if (block.prelude && block.head) {
      statements = block.prelude.concat(block.head).concat(block.statements);
    } else {
      statements = block.statements;
    }

    return new RawInlineBlock(env, meta, statements, EMPTY_ARRAY).scan();
  }

  scanLayout(meta: CompilationMeta, attrs: WireFormat.Statements.Attribute[]): Program {
    let { block } = this;
    let { symbols, hasEval } = block;

    if (!block.prelude || !block.head) {
      throw new Error(`A layout must have a top-level element`);
    }

    let symbolTable = { meta, hasEval, symbols };
    let { statements: prelude } = scanBlock({ statements: block.prelude, parameters: EMPTY_ARRAY }, meta, this.env);
    let { statements: head } = scanBlock({ statements: [...attrs, ...block.head], parameters: EMPTY_ARRAY }, meta, this.env);
    let { statements: body } = scanBlock({ statements: block.statements, parameters: EMPTY_ARRAY }, meta, this.env);

    return layout(prelude, head, body, symbolTable);
  }
}

export function scanBlock(block: WireFormat.SerializedInlineBlock, meta: CompilationMeta, env: Environment): Block {
  return new RawInlineBlock(env, meta, block.statements, EMPTY_ARRAY).scan();
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

  export type ScannedComponent      = [ClientSideStatement, Ops.ScannedComponent, string, RawInlineBlock, WireFormat.Core.Hash, Option<RawInlineBlock>];
  export type ResolvedComponent     = [ClientSideStatement, Ops.ResolvedComponent, ComponentDefinition<Opaque>, Option<RawInlineBlock>, WireFormat.Core.Args, Option<Block>, Option<Block>];
  export type OpenComponentElement  = [ClientSideStatement, Ops.OpenComponentElement, string];
  export type OpenPrimitiveElement  = [ClientSideStatement, Ops.OpenPrimitiveElement, string, string[]];
  export type OpenDynamicElement    = [ClientSideStatement, Ops.OpenDynamicElement, WireFormat.Expression];
  export type OptimizedAppend       = [ClientSideStatement, Ops.OptimizedAppend, WireFormat.Expression, boolean];
  export type UnoptimizedAppend     = [ClientSideStatement, Ops.UnoptimizedAppend, WireFormat.Expression, boolean];
  export type AnyDynamicAttr        = [ClientSideStatement, Ops.AnyDynamicAttr, string, WireFormat.Expression, Option<string>, boolean];
  export type StaticPartial         = [ClientSideStatement, Ops.StaticPartial, string, WireFormat.Core.EvalInfo];
  export type DynamicPartial        = [ClientSideStatement, Ops.DynamicPartial, WireFormat.Expression, WireFormat.Core.EvalInfo];
  export type NestedBlock           = [ClientSideStatement, Ops.NestedBlock, string, WireFormat.Core.Params, Option<WireFormat.Core.Hash>, Option<Block>, Option<Block>];
  export type ScannedBlock          = [ClientSideStatement, Ops.ScannedBlock, string, Core.Params, Option<Core.Hash>, Option<RawInlineBlock>, Option<RawInlineBlock>];

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

export abstract class RawBlock<S extends SymbolTable> {
  constructor(protected env: Environment, protected meta: CompilationMeta, private statements: WireFormat.Statement[]) {}

  scanStatements(): WireFormat.Statement[] {
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

    return buffer;
  }

  protected specializeBlock(block: WireFormat.Statements.Block): ClientSide.ScannedBlock {
    let [, name, params, hash, RawTemplate, inverse] = block;
    return [Ops.ClientSideStatement, ClientSide.Ops.ScannedBlock, name, params, hash, this.child(RawTemplate), this.child(inverse)];
  }

  protected specializeComponent(sexp: WireFormat.Statements.Component): WireFormat.Statement[] {
    let [, tag, attrs, args, block] = sexp;

    if (this.env.hasComponentDefinition(tag, this.meta.templateMeta)) {
      let child = this.child(block);
      let attrsBlock = new RawInlineBlock(this.env, this.meta, attrs, EMPTY_ARRAY);
      return [[Ops.ClientSideStatement, ClientSide.Ops.ScannedComponent, tag, attrsBlock, args, child]];
    } else if (block && block.parameters.length) {
      throw new Error(`Compile Error: Cannot find component ${tag}`);
    } else {
      return [
        [Ops.OpenElement, tag],
        ...attrs,
        [Ops.FlushElement],
        ...(block ? block.statements : EMPTY_ARRAY),
        [Ops.CloseElement]
      ];
    }
  }

  child(block: Option<WireFormat.SerializedInlineBlock>): Option<RawInlineBlock> {
    if (!block) return null;
    return new RawInlineBlock(this.env, this.meta, block.statements, block.parameters);
  }

  abstract scan(): CompilableTemplate<S>;
}

export class RawInlineBlock extends RawBlock<BlockSymbolTable> {
  constructor(env: Environment, meta: CompilationMeta, statements: WireFormat.Statement[], private parameters: number[]) {
    super(env, meta, statements);
  }

  scan(): Block {
    let statements = this.scanStatements();
    return new CompilableTemplate(statements, { parameters: this.parameters, meta: this.meta });
  }
}

export class RawProgram extends RawBlock<ProgramSymbolTable> {
  constructor(env: Environment, meta: CompilationMeta, statements: WireFormat.Statement[], private symbols: string[], private hasEval: boolean) {
    super(env, meta, statements);
  }

  scan(): Program {
    let statements = this.scanStatements();
    return new CompilableTemplate(statements, { symbols: this.symbols, hasEval: this.hasEval, meta: this.meta });
  }
}
