import { Slice, LinkedList, InternedString } from 'glimmer-util';
import { OpSeqBuilder, Opcode } from './opcodes';
import { BindNamedArgsOpcode, BindBlocksOpcode, BindPositionalArgsOpcode } from './compiled/opcodes/vm';
import { Statement as StatementSyntax, Attribute as AttributeSyntax, CompileInto } from './syntax';
import { Environment } from './environment';
import { ComponentDefinition } from './component/interfaces';
import SymbolTable from './symbol-table';
import { Block, EntryPoint, InlineBlock, Layout } from './compiled/blocks';

abstract class Compiler {
  public env: Environment;
  protected block: Block;
  protected symbolTable: SymbolTable;
  protected current: StatementSyntax;

  constructor(block: Block, env: Environment) {
    this.block = block;
    this.current = block.program.head();
    this.env = env;
    this.symbolTable = block.symbolTable;
  }

  protected compileStatement(statement: StatementSyntax, ops: CompileIntoList) {
    this.env.statement(statement).compile(ops, this.env);
  }

}

export default Compiler;

export class EntryPointCompiler extends Compiler {
  private ops: CompileIntoList;
  protected block: EntryPoint;

  constructor(template: EntryPoint, env: Environment) {
    super(template, env);
    this.ops = new CompileIntoList(template.symbolTable);
  }

  compile(): OpSeqBuilder {
    let { block, ops } = this;
    let { program } = block;

    let current = program.head();

    while (current) {
      let next = program.nextNode(current);
      this.compileStatement(current, ops);
      current = next;
    }

    return ops;
  }

  append(op: Opcode) {
    this.ops.append(op);
  }

  getSymbol(name: InternedString): number {
    return this.symbolTable.get(name);
  }

  getYieldSymbol(name: InternedString): number {
    return this.symbolTable.getYield(name);
  }
}

export class InlineBlockCompiler extends Compiler {
  private ops: CompileIntoList;
  protected block: InlineBlock;
  protected current: StatementSyntax;

  constructor(block: InlineBlock, env: Environment) {
    super(block, env);
    this.ops = new CompileIntoList(block.symbolTable);
  }

  compile(): CompileIntoList {
    let { block, ops } = this;
    let { program } = block;

    if (block.hasPositionalParameters()) {
      ops.append(new BindPositionalArgsOpcode({ block }));
    }

    let current = program.head();

    while (current) {
      let next = program.nextNode(current);
      this.compileStatement(current, ops);
      current = next;
    }

    return ops;
  }
}

export interface ComponentParts {
  tag: InternedString;
  attrs: Slice<AttributeSyntax>;
  body: Slice<StatementSyntax>;
}

export interface CompiledComponentParts {
  tag: InternedString;
  preamble: CompileIntoList;
  main: CompileIntoList;
}

export class LayoutCompiler extends Compiler {
  private preamble: CompileIntoList;
  private body: CompileIntoList;
  private definition: ComponentDefinition;
  protected block: Layout;

  constructor(layout: Layout, env: Environment, definition: ComponentDefinition) {
    super(layout, env);
    this.definition = definition;
  }

  compile(): CompiledComponentParts {
    let { block: layout, env, symbolTable } = this;
    let { tag, attrs, body } = this.definition.compile({ layout, env, symbolTable });

    let preamble = this.preamble = new CompileIntoList(this.symbolTable);
    let main = this.body = new CompileIntoList(this.symbolTable);

    if (layout.hasNamedParameters()) {
      preamble.append(BindNamedArgsOpcode.create(layout));
    }

    if (layout.hasYields()) {
      preamble.append(BindBlocksOpcode.create(layout));
    }

    attrs.forEachNode(attr => {
      this.compileStatement(attr, preamble);
    });

    body.forEachNode(statement => {
      this.compileStatement(statement, main);
    });

    return { tag, preamble, main };
  }

  getSymbol(name: InternedString): number {
    return this.symbolTable.get(name);
  }

  getBlockSymbol(name: InternedString): number {
    return this.symbolTable.getYield(name);
  }
}

export class CompileIntoList extends LinkedList<Opcode> implements CompileInto {
  private symbolTable: SymbolTable;

  constructor(symbolTable: SymbolTable) {
    super();
    this.symbolTable = symbolTable;
  }

  getSymbol(name: InternedString): number {
    return this.symbolTable.get(name);
  }

  getBlockSymbol(name: InternedString): number {
    return this.symbolTable.getYield(name);
  }
}