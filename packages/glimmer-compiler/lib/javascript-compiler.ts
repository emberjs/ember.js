import { assert } from "glimmer-util";
import { Stack, DictSet, InternedString, dict } from "glimmer-util";

import {
  BlockMeta,
  SerializedBlock,
  SerializedTemplate,
  Core,
  Statement,
  Expression
} from 'glimmer-wire-format';

type str = string;
type Params = Core.Params;
type Hash = Core.Hash;
type Path = Core.Path;
type StackValue = Expression | Params | Hash | str;

export class Block {
  statements: Statement[] = [];
  positionals: string[] = [];

  toJSON(): SerializedBlock {
    return {
      statements: this.statements,
      locals: this.positionals as InternedString[]
    };
  }

  push(statement: Statement) {
    this.statements.push(statement);
  }
}

export class Template extends Block {
  public meta: BlockMeta = null;

  public yields = new DictSet();
  public named = new DictSet();
  public blocks: Block[] = [];

  constructor(meta) {
    super();
    this.meta = meta;
  }

  toJSON(): SerializedTemplate {
    return {
      statements: this.statements,
      locals: this.positionals as InternedString[],
      named: this.named.toArray(),
      yields: this.yields.toArray(),
      blocks: this.blocks.map(b => b.toJSON()),
      meta: this.meta
    };
  }
}

export default class JavaScriptCompiler {
  static process(opcodes, meta): Template {
    let compiler = new JavaScriptCompiler(opcodes, meta);
    return compiler.process();
  }

  private template: Template = null;
  private blocks = new Stack<Block>();
  private opcodes: any[];
  private values: StackValue[] = [];

  constructor(opcodes, meta) {
    this.opcodes = opcodes;
    this.template = new Template(meta);
  }

  process() {
    this.opcodes.forEach(([opcode, ...args]) => {
      if (!this[opcode]) { throw new Error(`unimplemented ${opcode} on JavaScriptCompiler`); }
      this[opcode](...args);
    });

    return this.template;
  }

  /// Nesting

  startBlock([program]) {
    let block: Block = new Block();
    block.positionals = program.blockParams;
    this.blocks.push(block);
  }

  endBlock() {
    let { template, blocks } = this;
    template.blocks.push(blocks.pop());
  }

  startProgram() {
    this.blocks.push(this.template);
  }

  endProgram() {

  }

  /// Statements

  text(content: string) {
    this.push(['text', content]);
  }

  append(trusted: boolean) {
    this.push(['append', this.popValue<Expression>(), trusted]);
  }

  comment(value: string) {
    this.push(['comment', value]);
  }

  modifier(path: Path) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.push(['modifier', path, params, hash]);
  }

  block(path: Path, template: number, inverse: number) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.push(['block', path, params, hash, template, inverse]);
  }

  openElement(tag: str, blockParams: string[]) {
    this.push(['openElement', tag, blockParams]);
  }

  closeElement() {
    this.push(['closeElement']);
  }

  staticAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push(['staticAttr', name, value, namespace]);
  }

  dynamicAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push(['dynamicAttr', name, value, namespace]);
  }

  trustingAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push(['trustingAttr', name, value, namespace]);
  }

  staticArg(name: str) {
    let value = this.popValue<Expression>();
    this.push(['staticArg', name.slice(1), value]);
  }

  dynamicArg(name: str) {
    let value = this.popValue<Expression>();
    this.push(['dynamicArg', name.slice(1), value]);
  }

  yield(to: string) {
    let params = this.popValue<Params>();
    this.push(['yield', to, params]);
    this.template.yields.add(to);
  }

  hasBlock(name: string) {
    this.pushValue(['hasBlock', name]);
    this.template.yields.add(name);
  }

  hasBlockParams(name: string) {
    this.pushValue(['hasBlockParams', name]);
    this.template.yields.add(name);
  }

  /// Expressions

  literal(value: any) {
    this.pushValue(value);
  }

  unknown(path: string[]) {
    this.pushValue(['unknown', path]);
  }

  arg(path: string[]) {
    this.template.named.add(path[0]);
    this.pushValue(['arg', path]);
  }

  get(path: string[]) {
    this.pushValue(['get', path]);
  }

  concat() {
    this.pushValue(['concat', this.popValue<Params>()]);
  }

  helper(path: string[]) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.pushValue(['helper', path, params, hash]);
  }

  /// Stack Management Opcodes

  prepareArray(size: number) {
    let values = [];

    for (let i = 0; i < size; i++) {
      values.push(this.popValue());
    }

    this.pushValue(values);
  }

  prepareObject(size: number) {
    assert(this.values.length >= size, `Expected ${size} values on the stack, found ${this.values.length}`);

    let object = dict<Expression>();

    for (let i = 0; i < size; i++) {
      object[this.popValue<str>()] = this.popValue<Expression>();
    }

    this.pushValue(object);
  }

  /// Utilities

  push(args: Statement) {
    while (args[args.length - 1] === null) {
      args.pop();
    }

    this.blocks.current.push(args);
  }

  pushValue(val: Expression | Params | Hash) {
    this.values.push(val);
  }

  popValue<T extends StackValue>(): T {
    assert(this.values.length, "No expression found on stack");
    return this.values.pop() as T;
  }
}
