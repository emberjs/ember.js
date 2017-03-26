import { CompiledDynamicTemplate, CompiledStaticTemplate } from './compiled/blocks';
import { builder } from './compiler';
import OpcodeBuilder from './compiled/opcodes/builder';
import Environment from './environment';
import { Option, EMPTY_ARRAY } from '@glimmer/util';
import * as WireFormat from '@glimmer/wire-format';
import { Opaque, SymbolTable, ProgramSymbolTable, BlockSymbolTable } from '@glimmer/interfaces';
import { CompilationMeta } from '@glimmer/interfaces';

import {
  STATEMENTS
} from './syntax/functions';

export type DeserializedStatement = WireFormat.Statement | WireFormat.Statements.Attribute | WireFormat.Statements.Argument;

export function compileStatement(statement: WireFormat.Statement, builder: OpcodeBuilder) {
  STATEMENTS.compile(statement, builder);
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
}

export type Template = CompilableTemplate<SymbolTable>;
export type Program = CompilableTemplate<ProgramSymbolTable>;
export type Block = CompilableTemplate<BlockSymbolTable>;

export type ScannedProgram = ScannedTemplate<ProgramSymbolTable>;
export type ScannedBlock = ScannedTemplate<BlockSymbolTable>;

function compileStatements(statements: WireFormat.Statement[], meta: CompilationMeta, env: Environment) {
  let b = builder(env, meta);

  for (let statement of statements) {
    compileStatement(statement, b);
  }

  return b;
}

export const ATTRS_BLOCK = '&attrs';

export function layout(prelude: WireFormat.Statement[], head: WireFormat.Statement[], body: WireFormat.Statement[], symbolTable: ProgramSymbolTable) {
  let [, tag] = prelude.pop() as WireFormat.Statements.OpenElement;
  prelude.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tag]);
  prelude.push([Ops.ClientSideStatement, ClientSide.Ops.DidCreateElement]);

  let attrsSymbol = symbolTable.symbols.length + 1;
  symbolTable.symbols.push(ATTRS_BLOCK);

  let statements = prelude
    .concat([[Ops.Yield, attrsSymbol, EMPTY_ARRAY]])
    .concat(head)
    .concat(body)
    .concat([[Ops.ClientSideStatement, ClientSide.Ops.DidRenderLayout]]);

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
    OpenComponentElement,
    DidCreateElement,
    DidRenderLayout,
    OptimizedAppend,
    UnoptimizedAppend,
    StaticPartial,
    DynamicPartial,
    NestedBlock,
    ScannedBlock,

    FunctionExpression
  }

  export function is<T extends any[]>(variant: Ops): (value: any[]) => value is T {
    return function(value: any[]): value is T {
      return value[0] === WireFormat.Ops.ClientSideExpression || value[0] === WireFormat.Ops.ClientSideStatement && value[1] === variant;
    };
  }

  import ClientSideStatement = WireFormat.Ops.ClientSideStatement;
  import ClientSideExpression = WireFormat.Ops.ClientSideExpression;

  export type OpenComponentElement  = [ClientSideStatement, Ops.OpenComponentElement, string];
  export type DidCreateElement      = [ClientSideStatement, Ops.DidCreateElement];
  export type DidRenderLayout       = [ClientSideStatement, Ops.DidRenderLayout];
  export type OptimizedAppend       = [ClientSideStatement, Ops.OptimizedAppend, WireFormat.Expression, boolean];
  export type UnoptimizedAppend     = [ClientSideStatement, Ops.UnoptimizedAppend, WireFormat.Expression, boolean];
  export type StaticPartial         = [ClientSideStatement, Ops.StaticPartial, string, WireFormat.Core.EvalInfo];
  export type DynamicPartial        = [ClientSideStatement, Ops.DynamicPartial, WireFormat.Expression, WireFormat.Core.EvalInfo];

  export type FunctionExpression    = [ClientSideExpression, Ops.FunctionExpression, FunctionExpressionCallback<Opaque>];

  export type FunctionExpressionCallback<T> = (VM: PublicVM, symbolTable: SymbolTable) => VersionedPathReference<T>;

  export type ClientSideStatement =
    | OpenComponentElement
    | DidCreateElement
    | DidRenderLayout
    | OptimizedAppend
    | UnoptimizedAppend
    | StaticPartial
    | DynamicPartial
    ;

  export type ClientSideExpression =
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
      buffer.push(statement);
    }

    return buffer;
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
