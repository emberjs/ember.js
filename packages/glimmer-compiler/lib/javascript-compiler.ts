import { assert } from "glimmer-util";
import { Stack, DictSet } from "glimmer-util";

import {
  TemplateMeta,
  SerializedBlock,
  SerializedTemplateBlock,
  SerializedTemplate,
  Core,
  Statement,
  Expression,
  Expressions
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
      locals: this.positionals
    };
  }

  push(statement: Statement) {
    this.statements.push(statement);
  }
}

export class TemplateBlock extends Block {
  public yields = new DictSet();
  public named = new DictSet();
  public blocks: Block[] = [];

  toJSON(): SerializedTemplateBlock {
    return {
      statements: this.statements,
      locals: this.positionals,
      named: this.named.toArray(),
      yields: this.yields.toArray(),
      blocks: this.blocks.map(b => b.toJSON())
    };
  }
}

export class Template<T extends TemplateMeta> {
  public block = new TemplateBlock();

  constructor(public meta: T) {}

  toJSON(): SerializedTemplate<T> {
    return {
      block: this.block.toJSON(),
      meta: this.meta
    };
  }
}

export default class JavaScriptCompiler<T extends TemplateMeta> {
  static process<T extends TemplateMeta>(opcodes, meta): Template<T> {
    let compiler = new JavaScriptCompiler<T>(opcodes, meta);
    return compiler.process();
  }

  private template: Template<T>;
  private blocks = new Stack<Block>();
  private opcodes: any[];
  private values: StackValue[] = [];

  constructor(opcodes, meta: T) {
    this.opcodes = opcodes;
    this.template = new Template(meta);
  }

  process(): Template<T> {
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
    template.block.blocks.push(blocks.pop());
  }

  startProgram() {
    this.blocks.push(this.template.block);
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
    this.push(['open-element', tag, blockParams]);
  }

  flushElement() {
    this.push(['flush-element']);
  }

  closeElement() {
    this.push(['close-element']);
  }

  staticAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push(['static-attr', name, value, namespace]);
  }

  dynamicAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push(['dynamic-attr', name, value, namespace]);
  }

  trustingAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push(['trusting-attr', name, value, namespace]);
  }

  staticArg(name: str) {
    let value = this.popValue<Expression>();
    this.push(['static-arg', name.slice(1), value]);
  }

  dynamicArg(name: str) {
    let value = this.popValue<Expression>();
    this.push(['dynamic-arg', name.slice(1), value]);
  }

  yield(to: string) {
    let params = this.popValue<Params>();
    this.push(['yield', to, params]);
    this.template.block.yields.add(to);
  }

  hasBlock(name: string) {
    this.pushValue<Expressions.HasBlock>(['has-block', name]);
    this.template.block.yields.add(name);
  }

  hasBlockParams(name: string) {
    this.pushValue<Expressions.HasBlockParams>(['has-block-params', name]);
    this.template.block.yields.add(name);
  }

  /// Expressions

  literal(value: Expressions.Value | undefined) {
    if (value === undefined) {
      this.pushValue<Expressions.Undefined>(['undefined']);
    } else {
      this.pushValue<Expressions.Value>(value);
    }
  }

  unknown(path: string[]) {
    this.pushValue<Expressions.Unknown>(['unknown', path]);
  }

  arg(path: string[]) {
    this.template.block.named.add(path[0]);
    this.pushValue<Expressions.Arg>(['arg', path]);
  }

  get(path: string[]) {
    this.pushValue<Expressions.Get>(['get', path]);
  }

  concat() {
    this.pushValue<Expressions.Concat>(['concat', this.popValue<Params>()]);
  }

  helper(path: string[]) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.pushValue<Expressions.Helper>(['helper', path, params, hash]);
  }

  /// Stack Management Opcodes

  prepareArray(size: number) {
    let values = [];

    for (let i = 0; i < size; i++) {
      values.push(this.popValue());
    }

    this.pushValue<Params>(values);
  }

  prepareObject(size: number) {
    assert(this.values.length >= size, `Expected ${size} values on the stack, found ${this.values.length}`);

    let keys: string[] = new Array(size);
    let values: Expression[] = new Array(size);

    for (let i = 0; i < size; i++) {
      keys[i] = this.popValue<str>();
      values[i] = this.popValue<Expression>();
    }

    this.pushValue<Hash>([keys, values]);
  }

  /// Utilities

  push(args: Statement) {
    while (args[args.length - 1] === null) {
      args.pop();
    }

    this.blocks.current.push(args);
  }

  pushValue<S extends Expression | Params | Hash>(val: S) {
    this.values.push(val);
  }

  popValue<T extends StackValue>(): T {
    assert(this.values.length, "No expression found on stack");
    return this.values.pop() as T;
  }
}
