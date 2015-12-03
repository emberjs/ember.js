import { Slice, ListSlice, LinkedList, InternedString, Stack, Dict, dict } from 'glimmer-util';
import { OpSeq, OpSeqBuilder, Opcode } from './opcodes';
import { ATTRIBUTE_SYNTAX, StatementSyntax, AttributeSyntax } from './syntax';
import { Environment } from './environment';
import Template, { OpenElement, OpenPrimitiveElement, CloseElement } from './template';


export class RawTemplate {
  syntax: LinkedList<StatementSyntax>;
  ops: OpSeq = null;
  locals: InternedString[];

  static fromOpSeq(ops: OpSeq, locals: InternedString[]) {
    return new RawTemplate({ ops, locals, syntax: null });
  }

  constructor({ ops, locals, syntax }: { ops: OpSeq, locals: InternedString[], syntax?: LinkedList<StatementSyntax> }) {
    this.ops = ops;
    this.locals = locals;
    this.syntax = syntax || null;
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

class SymbolTable {
  private parent: SymbolTable;
  private top: SymbolTable;
  private locals = dict<number>();
  private position = 1;

  constructor(parent: SymbolTable) {
    this.parent = parent;
    this.top = parent ? parent.top : this;
  }

  get(name: InternedString): number {
    let { locals, parent } = this;

    let symbol = locals[<string>name];

    if (!symbol && parent) {
      symbol = parent.get(name);
    }

    return symbol;
  }

  put(name: InternedString): number {
    let position = this.locals[<string>name];

    if (!position) {
      position = this.locals[<string>name] = this.top.position++;
    }

    return position;
  }

  child(): SymbolTable {
    return new SymbolTable(this);
  }
}

export default class Compiler {
  private frameStack = new Stack<CompilerFrame>();
  public env: Environment;

  constructor(template: RawTemplate, environment: Environment) {
    let frame = new CompilerFrame(this, template, new SymbolTable(null));
    this.env = environment;
  }

  compileChildTemplate(template: RawTemplate) {
    
  }

  sliceAttributes(): Slice<AttributeSyntax> {
    return this.frameStack.current.sliceAttributes();
  }

  templateFromTagContents(): Template {
    return this.frameStack.current.templateFromTagContents();
  }
}

class CompilerFrame {
  public env: Environment;
  private template: RawTemplate;
  private current: StatementSyntax;
  private ops: OpSeqBuilder;
  private symbolTable: SymbolTable;
  private compiler: Compiler;

  constructor(compiler: Compiler, template: RawTemplate, symbolTable: SymbolTable) {
    this.compiler = compiler;
    this.template = template;
    this.current = template.syntax.head();
    this.ops = new LinkedList<Opcode>();
    this.symbolTable = symbolTable;
  }

  compile(): OpSeqBuilder {
    let { template: { syntax }, ops, env } = this;

    while (this.current) {
      let current = this.current;
      this.current = syntax.nextNode(current);
      env.statement(current).compile(this.compiler, env);
    }

    return ops;
  }

  append(op: Opcode) {
    this.ops.append(op);
  }

  putSymbol(name: InternedString): number {
    return this.symbolTable.put(name);
  }

  getSymbol(name: InternedString): number {
    return this.symbolTable.get(name);
  }

  sliceAttributes(): Slice<AttributeSyntax> {
    let { template: { syntax } } = this;

    let begin: AttributeSyntax = null;
    let end: AttributeSyntax = null;

    while (this.current[ATTRIBUTE_SYNTAX]) {
      let current = this.current;
      this.current = syntax.nextNode(current);
      begin = begin || <AttributeSyntax>current;
      end = <AttributeSyntax>current;
    }

    return new ListSlice(begin, end);
  }

  templateFromTagContents(): Template {
    let { template: { syntax } } = this;

    let begin: StatementSyntax = null;
    let end: StatementSyntax = null;
    let nesting = 1;

    while (true) {
      let current = this.current;
      this.current = syntax.nextNode(current);
      begin = begin || current;

      if (current instanceof CloseElement && --nesting === 0) {
        end = syntax.prevNode(current);
        break;
      } else if (current instanceof OpenElement || current instanceof OpenPrimitiveElement) {
        nesting++;
      }
    }

    let slice = new ListSlice(begin, end);
    return Template.fromList(ListSlice.toList(slice));
  }
}