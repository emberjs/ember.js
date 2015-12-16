import { Slice, ListSlice, LinkedList, InternedString, assert, dict } from 'glimmer-util';
import { OpSeq, OpSeqBuilder, Opcode } from './opcodes';
import { BindNamedArgsOpcode, BindPositionalArgsOpcode } from './compiled/opcodes/vm';
import { ATTRIBUTE_SYNTAX, Program, StatementSyntax, AttributeSyntax } from './syntax';
import { Environment } from './environment';
import Template from './template';
import { OpenElement, OpenPrimitiveElement, CloseElement } from './syntax/core';
import SymbolTable from './symbol-table';

export interface RawTemplateOptions {
  ops: OpSeq;
  locals: InternedString[];
  named: InternedString[];
  program?: Program;
}

export class RawTemplate {
  public program: Program;
  public ops: OpSeq = null;
  public symbolTable: SymbolTable = null;
  public locals: InternedString[];
  public named: InternedString[];

  constructor({ ops, locals, named, program }: RawTemplateOptions) {
    this.ops = ops;
    this.locals = locals;
    this.named = named;
    this.program = program || null;
  }

  cloneWith(callback: (builder: LinkedList<StatementSyntax>, table: SymbolTable) => void): RawTemplate {
    let { program, locals, named } = this;

    let newProgram = LinkedList.fromSlice(program);

    let template = new RawTemplate({
      ops: null,
      locals: locals && locals.slice(),
      named: named && named.slice(),
      program: newProgram
    });

    template.symbolTable = this.symbolTable.cloneFor(template);
    callback(newProgram, template.symbolTable);

    return template;
  }

  compile(env: Environment) {
    this.compileSyntax(env);
  }

  private compileSyntax(env: Environment) {
    this.ops = this.ops || new Compiler(this, env).compile();
  }

  isTop(): boolean {
    return this.symbolTable.isTop();
  }

  hasPositionalArgs(): boolean {
    return !!(this.locals);
  }

  hasNamedArgs(): boolean {
    return !!(this.named);
  }
}

export default class Compiler {
  public env: Environment;
  private template: RawTemplate;
  private current: StatementSyntax;
  private ops: OpSeqBuilder;
  private symbolTable: SymbolTable;

  constructor(template: RawTemplate, env: Environment) {
    this.env = env;
    this.template = template;
    this.current = template.program.head();
    this.ops = new LinkedList<Opcode>();
    this.symbolTable = template.symbolTable;
  }

  compile(): OpSeqBuilder {
    let { template, ops, env } = this;
    let { program } = template;

    if (template.hasPositionalArgs()) {
      ops.append(new BindPositionalArgsOpcode(this.template));
    }

    if (template.hasNamedArgs() && template.isTop()) {
      ops.append(new BindNamedArgsOpcode(this.template));
    }

    while (this.current) {
      let current = this.current;
      this.current = program.nextNode(current);
      env.statement(current).compile(this, env);
    }

    return ops;
  }

  append(op: Opcode) {
    this.ops.append(op);
  }

  getSymbol(name: InternedString): number {
    return this.symbolTable.get(name);
  }

  sliceAttributes(): Slice<AttributeSyntax> {
    let { template: { program } } = this;

    let begin: AttributeSyntax = null;
    let end: AttributeSyntax = null;

    while (this.current[ATTRIBUTE_SYNTAX]) {
      let current = this.current;
      this.current = program.nextNode(current);
      begin = begin || <AttributeSyntax>current;
      end = <AttributeSyntax>current;
    }

    return new ListSlice(begin, end);
  }

  templateFromTagContents(): Template {
    let { template: { program } } = this;

    let begin: StatementSyntax = null;
    let end: StatementSyntax = null;
    let nesting = 1;

    while (true) {
      let current = this.current;
      this.current = program.nextNode(current);

      if (current instanceof CloseElement && --nesting === 0) {
        break;
      }

      begin = begin || current;
      end = current;

      if (current instanceof OpenElement || current instanceof OpenPrimitiveElement) {
        nesting++;
      }
    }

    let slice = new ListSlice(begin, end);
    return Template.fromList(ListSlice.toList(slice));
  }
}