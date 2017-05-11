import { CompiledDynamicTemplate, CompiledStaticTemplate } from './compiled/blocks';
import { builder } from './compiler';
import OpcodeBuilder from './compiled/opcodes/builder';
import Environment from './environment';
import { Option, EMPTY_ARRAY } from '@glimmer/util';
import * as WireFormat from '@glimmer/wire-format';
import { Opaque, SymbolTable, ProgramSymbolTable, BlockSymbolTable } from '@glimmer/interfaces';
import { debugSlice } from './opcodes';
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
    compileStatement(statement, b);
  }

  return b;
}

export const ATTRS_BLOCK = '&attrs';

const { Ops } = WireFormat;

export default class Scanner {
  constructor(private block: WireFormat.SerializedTemplateBlock, private env: Environment) {
  }

  scanEntryPoint(meta: CompilationMeta): Program {
    let { env, block } = this;
    return new RawProgram(env, meta, block.statements, block.symbols, block.hasEval).scan();
  }

  scanBlock(meta: CompilationMeta): Block {
    let { env, block } = this;
    return new RawInlineBlock(env, meta, block.statements, EMPTY_ARRAY).scan();
  }

  scanLayout(meta: CompilationMeta, attrs: WireFormat.Statements.Attribute[], componentName?: string): Program {
    let { block } = this;
    let { statements, symbols, hasEval } = block;

    let symbolTable = { meta, hasEval, symbols };

    let newStatements: WireFormat.Statement[] = [];

    let toplevel: string | undefined;
    let inTopLevel = false;

    for(let i = 0; i < statements.length; i++) {
      let statement = statements[i];
      if (WireFormat.Statements.isComponent(statement)) {
        let tagName = statement[1];
        if (!this.env.hasComponentDefinition(tagName, meta.templateMeta)) {
          if (toplevel !== undefined) {
            newStatements.push([Ops.OpenElement, tagName]);
          } else {
            toplevel = tagName;
            decorateTopLevelElement(tagName, symbols, attrs, newStatements);
          }
          addFallback(statement, newStatements);
        }
      } else {
        if (toplevel === undefined && WireFormat.Statements.isOpenElement(statement)) {
          toplevel = statement[1];
          inTopLevel = true;
          decorateTopLevelElement(toplevel, symbols, attrs, newStatements);
        } else {
          if (inTopLevel) {
            if (WireFormat.Statements.isFlushElement(statement)) {
              inTopLevel = false;
            } else if (WireFormat.Statements.isModifier(statement)) {
              throw Error(`Found modifier "${statement[1]}" on the top-level element of "${componentName}"\. Modifiers cannot be on the top-level element`);
            }
          }
          newStatements.push(statement);
        }
      }
    }
    newStatements.push([Ops.ClientSideStatement, ClientSide.Ops.DidRenderLayout]);
    return new CompilableTemplate(newStatements, symbolTable);
  }
}

function addFallback(statement: WireFormat.Statements.Component, buffer: WireFormat.Statement[]) {
  let [, , attrs, , block] = statement;
  for (let i = 0; i < attrs.length; i++) {
    buffer.push(attrs[i]);
  }
  buffer.push([ Ops.FlushElement ]);
  if (block) {
    let { statements } = block;
    for (let i = 0; i < statements.length; i++) {
      buffer.push(statements[i]);
    }
  }
  buffer.push([ Ops.CloseElement ]);
}

function decorateTopLevelElement(
  tagName: string,
  symbols: string[],
  attrs: WireFormat.Statements.Attribute[],
  buffer: WireFormat.Statement[]) {
  let attrsSymbol = symbols.push(ATTRS_BLOCK);
  buffer.push([Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, tagName]);
  buffer.push([Ops.ClientSideStatement, ClientSide.Ops.DidCreateElement]);
  buffer.push([Ops.Yield, attrsSymbol, EMPTY_ARRAY]);
  buffer.push(...attrs);
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
    OpenComponentElement
    | DidCreateElement
    | DidRenderLayout
    | OptimizedAppend
    | UnoptimizedAppend
    | StaticPartial
    | DynamicPartial
    ;

  export type ClientSideExpression = FunctionExpression;
}

export abstract class RawBlock<S extends SymbolTable> {
  constructor(protected env: Environment, protected meta: CompilationMeta, private statements: WireFormat.Statement[]) {}

  scanStatements(): WireFormat.Statement[] {
    return this.statements;
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

class RawProgram extends RawBlock<ProgramSymbolTable> {
  constructor(env: Environment, meta: CompilationMeta, statements: WireFormat.Statement[], private symbols: string[], private hasEval: boolean) {
    super(env, meta, statements);
  }

  scan(): Program {
    let statements = this.scanStatements();
    return new CompilableTemplate(statements, { symbols: this.symbols, hasEval: this.hasEval, meta: this.meta });
  }
}
