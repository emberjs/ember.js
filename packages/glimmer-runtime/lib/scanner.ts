import { CompiledProgram, CompiledBlock } from './compiled/blocks';
import { Opcode } from './opcodes';
import { builder } from './compiler';
import OpcodeBuilder from './compiled/opcodes/builder';
import Environment from './environment';
import { EMPTY_SLICE, Slice, Option, LinkedList, Stack, expect } from 'glimmer-util';
import { SerializedTemplateBlock, TemplateMeta, SerializedBlock, Statement as SerializedStatement } from 'glimmer-wire-format';
import * as WireFormat from 'glimmer-wire-format';
import { entryPoint as entryPointTable, layout as layoutTable, block as blockTable } from './symbol-table';
import { Opaque, SymbolTable, ProgramSymbolTable } from 'glimmer-interfaces';

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
  abstract compile(env: Environment): CompiledBlock;

  constructor(public statements: BaselineSyntax.AnyStatement[], public symbolTable: SymbolTable) {}
}

export class EntryPoint extends Template {
  public symbolTable: ProgramSymbolTable;

  compile(env: Environment): CompiledProgram {
    let table = this.symbolTable;

    let b = builder(env, table);
    for (let statement of this.statements) {
      let refined = SPECIALIZE.specialize(statement, table);
      STATEMENTS.compile(refined, b);
    }
    return new CompiledProgram(b.toOpSeq(), this.symbolTable.size);
  }
}

export class InlineBlock extends Template {
  compile(env: Environment): CompiledBlock {
    let table = this.symbolTable;
    let b = builder(env, table);

    let locals = table.getSymbols().locals;

    if (locals) {
      b.pushChildScope();
      b.bindPositionalArgsForLocals(locals);
    }

    for (let statement of this.statements) {
      let refined = SPECIALIZE.specialize(statement, table);
      STATEMENTS.compile(refined, b);
    }

    if (locals) {
      b.popScope();
    }

    return new CompiledBlock(b.toOpSeq());
  }
}

export class Layout extends Template {
  public symbolTable: ProgramSymbolTable;

  compile(env: Environment): CompiledProgram {
    return new CompiledProgram(new LinkedList<Opcode>(), 0);
  }
}

export class PartialBlock extends Layout {
  public symbolTable: ProgramSymbolTable;

  compile(env: Environment): CompiledProgram {
    let table = this.symbolTable;
    let b = builder(env, table);

    for (let statement of this.statements) {
      let refined = SPECIALIZE.specialize(statement, table);
      STATEMENTS.compile(refined, b);
    }

    return new CompiledProgram(b.toOpSeq(), table.size);
  }
}

export default class Scanner {
  constructor(private block: SerializedTemplateBlock, private meta: TemplateMeta, private env: Environment) {
  }

  scanEntryPoint(): EntryPoint {
    let { block, meta } = this;

    let symbolTable = entryPointTable(meta);
    let program = buildStatements(block, block.blocks, symbolTable, this.env);
    return new EntryPoint(program, symbolTable);
  }

  scanLayout(): Layout {
    let { block, meta } = this;
    let { blocks, named, yields, hasPartials } = block;

    let symbolTable = layoutTable(meta, named, yields, hasPartials);
    let program = buildStatements(block, blocks, symbolTable, this.env);

    return new Layout(program, symbolTable);
  }

  scanPartial(symbolTable: SymbolTable): PartialBlock {
    let { block } = this;
    let { blocks, locals } = block;

    let program = buildStatements(block, blocks, symbolTable, this.env);

    return new PartialBlock(program, symbolTable);
  }
}

function buildStatements({ statements }: SerializedBlock, blocks: SerializedBlock[], symbolTable: SymbolTable, env: Environment): BaselineSyntax.Program {
  if (statements.length === 0) return EMPTY_PROGRAM;
  return new BlockScanner(statements, blocks, symbolTable, env).scan();
}

const EMPTY_PROGRAM: BaselineSyntax.Program = [];

import { PublicVM } from './vm';
import { PathReference } from 'glimmer-reference';

export namespace BaselineSyntax {
  // TODO: use symbols for sexp[0]?
  export type Component = ['component', string, string[], WireFormat.Core.Hash, Block];
  export const isComponent = WireFormat.is<Component>('component');

  import Params = WireFormat.Core.Params;
  import Hash = WireFormat.Core.Hash;
  export type Block = InlineBlock;

  export type OpenPrimitiveElement = ['open-primitive-element', string, string[]];
  export const isPrimitiveElement = WireFormat.is<OpenPrimitiveElement>('open-primitive-element');

  export type OptimizedAppend = ['optimized-append', WireFormat.Expression, boolean];
  export const isOptimizedAppend = WireFormat.is<OptimizedAppend>('optimized-append');

  export type AnyDynamicAttr = ['any-dynamic-attr', string, WireFormat.Expression, string, boolean];
  export const isAnyAttr = WireFormat.is<AnyDynamicAttr>('any-dynamic-attr');

  export type StaticPartial = ['static-partial', string];
  export const isStaticPartial = WireFormat.is<StaticPartial>('static-partial');
  export type DynamicPartial = ['dynamic-partial', WireFormat.Expression];
  export const isDynamicPartial = WireFormat.is<DynamicPartial>('dynamic-partial');

  export type FunctionExpressionCallback<T> = (VM: PublicVM, symbolTable: SymbolTable) => PathReference<T>;
  export type FunctionExpression = ['function', FunctionExpressionCallback<Opaque>];
  export const isFunctionExpression = WireFormat.is<FunctionExpression>('function');

  export type NestedBlock = ['nested-block', WireFormat.Core.Path, WireFormat.Core.Params, WireFormat.Core.Hash, Option<Block>, Option<Block>];
  export const isNestedBlock = WireFormat.is<NestedBlock>('nested-block');

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
      Component
    | OpenPrimitiveElement
    | OptimizedAppend
    | StaticPartial
    | DynamicPartial
    | AnyDynamicAttr
    | NestedBlock
    ;

  export type AnyStatement = Statement | WireFormat.Statement;
  export type AnyExpression = FunctionExpression | WireFormat.Expression;

  export type Program = AnyStatement[];
}

export class BlockScanner {
  public env: Environment;

  private stack = new Stack<ChildBlockScanner>();
  private reader: SyntaxReader;

  constructor(statements: SerializedStatement[], private blocks: SerializedBlock[], private symbolTable: SymbolTable, env: Environment) {
    this.stack.push(new ChildBlockScanner(symbolTable));
    this.reader = new SyntaxReader(statements, symbolTable, this);
    this.env = env;
  }

  private get blockScanner(): ChildBlockScanner {
    return expect(this.stack.current, 'The scanner should have a block on the stack when used');
  }

  scan(): BaselineSyntax.AnyStatement[] {
    let statement: Option<SerializedStatement>;

    while (statement = this.reader.next()) {
      this.addStatement(statement);
    }

    return this.blockScanner.program;
  }

  startBlock(locals: string[]) {
    let childTable = blockTable(this.blockScanner.symbolTable, locals);
    this.stack.push(new ChildBlockScanner(childTable));
  }

  endBlock(locals: string[]): BaselineSyntax.Block {
    let { program: statements, symbolTable: table } = expect(this.stack.pop(), 'ending a block requires a block on the stack');
    let block = new InlineBlock(statements, table);
    this.addChild(block);
    return block;
  }

  addChild(block: BaselineSyntax.Block) {
    this.blockScanner.addChild(block);
  }

  addStatement(statement: SerializedStatement) {
    switch (statement[0]) {
      case 'block':
        this.blockScanner.addStatement(this.scanBlock(statement as WireFormat.Statements.Block));
        break;
      case 'open-element':
        this.blockScanner.addStatement(this.scanOpenElement(statement as WireFormat.Statements.OpenElement));
        break;
      default:
        this.blockScanner.addStatement(statement);
    }
  }

  next(): Option<SerializedStatement> {
    return this.reader.next();
  }

  private scanBlock(block: WireFormat.Statements.Block): BaselineSyntax.NestedBlock {
    let [, path, params, hash, _default, inverse] = block;

    let defaultBlock = typeof _default === 'number' ? this.scanBlockStatements(this.blocks[_default]) : null;
    let inverseBlock = typeof inverse === 'number' ? this.scanBlockStatements(this.blocks[inverse]) : null;

    return ['nested-block', path, params, hash, defaultBlock, inverseBlock];
  }

  private scanBlockStatements(block: SerializedBlock): InlineBlock {
    this.startBlock(block.locals);
    for (let statement of block.statements) {
      this.addStatement(statement);
    }
    return this.endBlock(block.locals);
  }

  private scanOpenElement(openElement: WireFormat.Statements.OpenElement): BaselineSyntax.Component | BaselineSyntax.OpenPrimitiveElement {
    let [, tag, blockParams] = openElement;
    let table = blockTable(this.blockScanner.symbolTable, blockParams);

    if (this.env.hasComponentDefinition([tag], table)) {
      let { args, attrs } = this.parameters(openElement);
      this.startBlock(blockParams);
      this.tagContents(openElement);
      let template = this.endBlock(blockParams);
      return ['component', tag, attrs, args, template];
    } else {
      return ['open-primitive-element', tag, []];
    }
  }

  private parameters(openElement: WireFormat.Statements.OpenElement): { args: WireFormat.Statements.Hash, attrs: string[] } {
    let current: Option<SerializedStatement> = this.next();
    let keys: string[] = [];
    let values: WireFormat.Expression[] = [];
    let attrs: string[] = [];

    while (current && current[0] !== 'flush-element') {
      if (current[0] === 'modifier') {
        throw new Error(`Compile Error: Element modifiers are not allowed in components`);
      }

      if (WireFormat.Statements.isAttribute(current)) {
        attrs.push(WireFormat.Statements.getParameterName(current));
      } else if (WireFormat.Statements.isArgument(current)) {
        keys.push(current[1]);
        values.push(current[2]);
      } else {
        throw new Error(`Expected FlushElement, but got ${current}`);
      }

      current = this.next();
    }

    return { args: [keys, values], attrs };
  }

  private tagContents(openElement: WireFormat.Statements.OpenElement) {
    let nesting = 1;

    while (true) {
      let current = expect(this.next(), 'a close-element must be found in the wire format before EOF');
      if (WireFormat.Statements.isCloseElement(current) && --nesting === 0) {
        break;
      }

      this.addStatement(current);

      if (WireFormat.Statements.isOpenElement(current) || BaselineSyntax.isPrimitiveElement(current)) {
        nesting++;
      }
    }
  }
}

class ChildBlockScanner {
  public children: BaselineSyntax.Block[] = [];
  public program: BaselineSyntax.AnyStatement[] = [];

  constructor(public symbolTable: SymbolTable) {}

  addSerializedChild({ statements, locals }: SerializedBlock): BaselineSyntax.Block {
    let table = blockTable(this.symbolTable, locals);
    let block = new InlineBlock(statements, table);
    this.children.push(block);
    return block;
  }

  addChild(block: BaselineSyntax.Block) {
    this.children.push(block);
    return block;
  }

  addStatement(statement: WireFormat.Statement | BaselineSyntax.Statement) {
    this.program.push(statement);
  }
}

class SyntaxReader {
  current: number = 0;
  last: Option<SerializedStatement> = null;

  constructor(private statements: SerializedStatement[], private symbolTable: SymbolTable, private scanner: BlockScanner) {}

  next(): Option<SerializedStatement> {
    let last = this.last;
    if (last) {
      this.last = null;
      return last;
    } else if (this.current === this.statements.length) {
      return null;
    }

    let sexp = this.statements[this.current++];
    return sexp;
  }
}
