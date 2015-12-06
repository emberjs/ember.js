import { Slice, ListSlice, LinkedList, InternedString } from 'glimmer-util';
import { OpSeq, OpSeqBuilder, Opcode } from './opcodes';
import { ATTRIBUTE_SYNTAX, Program, StatementSyntax, AttributeSyntax } from './syntax';
import { Environment } from './environment';
import Template, { OpenElement, OpenPrimitiveElement, CloseElement } from './template';
import SymbolTable from './symbol-table';

export class RawTemplate {
  public program: Program;
  public ops: OpSeq = null;
  public symbolTable: SymbolTable = null;
  public locals: InternedString[];

  static fromOpSeq(ops: OpSeq, locals: InternedString[]) {
    return new RawTemplate({ ops, locals, program: null });
  }

  constructor({ ops, locals, program }: { ops: OpSeq, locals: InternedString[], program?: Program }) {
    this.ops = ops;
    this.locals = locals;
    this.program = program || null;
  }

  opcodes(env: Environment): OpSeq {
    if (this.ops) return this.ops;
    this.compile(env);
    return this.ops;
  }

  compile(env: Environment) {
    this.ops = new Compiler(this, env).compile();
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
    let { template: { program }, ops, env } = this;

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
      begin = begin || current;

      if (current instanceof CloseElement && --nesting === 0) {
        end = program.prevNode(current);
        break;
      } else if (current instanceof OpenElement || current instanceof OpenPrimitiveElement) {
        nesting++;
      }
    }

    let slice = new ListSlice(begin, end);
    return Template.fromList(ListSlice.toList(slice));
  }
}