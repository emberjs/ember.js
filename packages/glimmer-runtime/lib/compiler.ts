import { Slice, LinkedList, InternedString } from 'glimmer-util';
import { OpSeq, OpSeqBuilder, Opcode } from './opcodes';
import { BindNamedArgsOpcode, BindBlocksOpcode, BindPositionalArgsOpcode } from './compiled/opcodes/vm';
import { OpenPrimitiveElementOpcode, CloseElementOpcode } from './compiled/opcodes/dom';
import { ShadowAttributesOpcode } from './compiled/opcodes/component';
import { Program, Statement as StatementSyntax, Attribute as AttributeSyntax, CompileInto } from './syntax';
import { Environment } from './environment';
import { ComponentDefinition } from './component/interfaces';
import SymbolTable from './symbol-table';

export interface RawTemplateOptions {
  children: RawTemplate[];
}

export abstract class RawTemplate {
  public program: Program;
  public ops: OpSeq = null;
  public symbolTable: SymbolTable = null;
  public locals: InternedString[];
  public named: InternedString[];
  public yields: InternedString[];
  public children: RawTemplate[];

  constructor({ children }: RawTemplateOptions) {
    this.children = children;
  }
}

export interface RawBlockOptions extends RawTemplateOptions {
  locals: InternedString[];
  program?: Program;
  ops?: OpSeq;
}

export class RawBlock extends RawTemplate {
  constructor({ children, ops, locals, program }: RawBlockOptions) {
    super({ children });
    this.ops = ops || null;
    this.locals = locals;
    this.program = program || null;
  }

  compile(env: Environment) {
    this.ops = this.ops || new BlockCompiler(this, env).compile();
  }

  hasPositionalParameters(): boolean {
    return !!this.locals;
  }
}

export interface RawEntryPointOptions extends RawTemplateOptions {
  ops?: OpSeq;
  program?: Program;
}

export class RawEntryPoint extends RawTemplate {
  constructor({ children, ops, program }: RawEntryPointOptions) {
    super({ children });
    this.ops = ops || null;
    this.program = program || null;
  }

  compile(env: Environment) {
    this.ops = this.ops || new EntryPointCompiler(this, env).compile();
  }
}

export interface RawLayoutOptions extends RawTemplateOptions {
  parts?: CompiledComponentParts;
  named: InternedString[];
  yields: InternedString[];
  program?: Program;
}

export class RawLayout extends RawTemplate {
  private parts: CompiledComponentParts;

  constructor({ children, parts, named, yields, program }: RawLayoutOptions) {
    super({ children });
    this.parts = parts;
    // positional params in Ember may want this
    // this.locals = locals;
    this.named = named;
    this.yields = yields;
    this.program = program || null;
  }

  compile(definition: ComponentDefinition, env: Environment) {
    if (this.ops) return;

    this.parts = this.parts || new LayoutCompiler(this, env, definition).compile();
    let { tag, preamble, main } = this.parts;

    let ops = new LinkedList<Opcode>();
    ops.append(new OpenPrimitiveElementOpcode({ tag }));
    ops.spliceList(preamble.clone(), null);
    ops.append(new ShadowAttributesOpcode());
    ops.spliceList(main.clone(), null);
    ops.append(new CloseElementOpcode());
    this.ops = ops;
  }

  hasNamedParameters(): boolean {
    return !!this.named;
  }

  hasYields(): boolean {
    return !!this.yields;
  }
}

abstract class Compiler {
  public env: Environment;
  protected template: RawTemplate;
  protected symbolTable: SymbolTable;
  protected current: StatementSyntax;

  constructor(template: RawTemplate, env: Environment) {
    this.template = template;
    this.current = template.program.head();
    this.env = env;
    this.symbolTable = template.symbolTable;
  }

  protected compileStatement(statement: StatementSyntax, ops: CompileIntoList) {
    this.env.statement(statement).compile(ops, this.env);
  }

}

export default Compiler;

export class EntryPointCompiler extends Compiler {
  private ops: CompileIntoList;

  constructor(template: RawTemplate, env: Environment) {
    super(template, env);
    this.ops = new CompileIntoList(template.symbolTable);
  }

  compile(): OpSeqBuilder {
    let { template, ops } = this;
    let { program } = template;

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

export class BlockCompiler extends Compiler {
  private ops: CompileIntoList;
  protected template: RawBlock;
  protected current: StatementSyntax;

  constructor(template: RawBlock, env: Environment) {
    super(template, env);
    this.ops = new CompileIntoList(template.symbolTable);
  }

  compile(): CompileIntoList {
    let { template, ops } = this;
    let { program } = template;

    if (template.hasPositionalParameters()) {
      ops.append(new BindPositionalArgsOpcode({ template }));
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

interface CompiledComponentParts {
  tag: InternedString;
  preamble: CompileIntoList;
  main: CompileIntoList;
}

export class LayoutCompiler extends Compiler {
  private preamble: CompileIntoList;
  private body: CompileIntoList;
  private definition: ComponentDefinition;
  protected template: RawLayout;

  constructor(layout: RawLayout, env: Environment, definition: ComponentDefinition) {
    super(layout, env);
    this.definition = definition;
  }

  compile(): CompiledComponentParts {
    let { template, env, symbolTable } = this;
    let { tag, attrs, body } = this.definition.compile({ template, env, symbolTable });

    let preamble = this.preamble = new CompileIntoList(this.symbolTable);
    let main = this.body = new CompileIntoList(this.symbolTable);

    if (template.hasNamedParameters()) {
      preamble.append(BindNamedArgsOpcode.create(template));
    }

    if (template.hasYields()) {
      preamble.append(BindBlocksOpcode.create(template));
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