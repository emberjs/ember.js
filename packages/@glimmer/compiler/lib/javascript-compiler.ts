import { assert } from "@glimmer/util";
import { Stack, DictSet } from "@glimmer/util";

import {
  TemplateMeta,
  SerializedBlock,
  SerializedTemplateBlock,
  SerializedTemplate,
  SerializedComponent,
  Core,
  Statement,
  Statements,
  Expression,
  Expressions,
  Ops
} from '@glimmer/wire-format';

export type str = string;
export type Params = Core.Params;
export type Hash = Core.Hash;
export type Path = Core.Path;
export type StackValue = Expression | Params | Hash | str;

export class Block {
  public type = "block";
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
  public type = "template";
  public yields = new DictSet<string>();
  public named = new DictSet<string>();
  public prelude: Statement[] = [];
  public blocks: SerializedBlock[] = [];
  public hasPartials = false;
  private inParams = true;
  private sawElement = false;

  push(statement: Statement) {
    if (this.inParams) {
      if (Statements.isFlushElement(statement)) {
        this.inParams = false;
      } else {
        this.prelude.push(statement);
      }
    } else {
      this.statements.push(statement);
    }
  }

  toJSON(): SerializedTemplateBlock {
    return {
      prelude: this.inParams ? null : this.prelude,
      statements: this.inParams ? this.prelude : this.statements,
      locals: this.positionals,
      named: this.named.toArray(),
      yields: this.yields.toArray(),
      hasPartials: this.hasPartials
    };
  }
}

export class ComponentBlock extends Block {
  public type = "component";
  public attributes: Statements.Attribute[] = [];
  public arguments: Statements.Argument[] = [];
  private inParams = true;

  push(statement: Statement) {
    if (this.inParams) {
      if (Statements.isFlushElement(statement)) {
        this.inParams = false;
      } else if (Statements.isArgument(statement)) {
        this.arguments.push(statement);
      } else if (Statements.isAttribute(statement)) {
        this.attributes.push(statement);
      } else if (Statements.isModifier(statement)) {
        throw new Error('Compile Error: Element modifiers are not allowed in components');
      } else {
        throw new Error('Compile Error: only parameters allowed before flush-element');
      }
    } else {
      this.statements.push(statement);
    }
  }

  toJSON(): SerializedComponent {
    let args = this.arguments;
    let keys = args.map(arg => arg[1]);
    let values = args.map(arg => arg[2]);

    return {
      attrs: this.attributes,
      args: [keys, values],
      locals: this.positionals,
      statements: this.statements
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
    template.block.blocks.push(blocks.pop().toJSON());
  }

  startProgram() {
    this.blocks.push(this.template.block);
  }

  endProgram() {

  }

  /// Statements

  text(content: string) {
    this.push([Ops.Text, content]);
  }

  append(trusted: boolean) {
    this.push([Ops.Append, this.popValue<Expression>(), trusted]);
  }

  comment(value: string) {
    this.push([Ops.Comment, value]);
  }

  modifier(path: Path) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.push([Ops.Modifier, path, params, hash]);
  }

  block(path: Path, template: number, inverse: number) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    let blocks = this.template.block.blocks;
    assert(typeof template !== 'number' || blocks[template] !== null, 'missing block in the compiler');
    assert(typeof inverse !== 'number' || blocks[inverse] !== null, 'missing block in the compiler');

    this.push([Ops.Block, path, params, hash, blocks[template], blocks[inverse]]);
  }

  openElement(tag: str, blockParams: string[]) {
    if (tag.indexOf('-') !== -1) {
      this.startComponent(blockParams);
    } else {
      this.push([Ops.OpenElement, tag, blockParams]);
    }
  }

  flushElement() {
    this.push([Ops.FlushElement]);
  }

  closeElement(tag: str) {
    if (tag.indexOf('-') !== -1) {
      let component = this.endComponent();
      this.push([Ops.Component, tag, component]);
    } else {
      this.push([Ops.CloseElement]);
    }
  }

  staticAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.StaticAttr, name, value, namespace]);
  }

  dynamicAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.DynamicAttr, name, value, namespace]);
  }

  trustingAttr(name: str, namespace: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.TrustingAttr, name, value, namespace]);
  }

  staticArg(name: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.StaticArg, name.slice(1), value]);
  }

  dynamicArg(name: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.DynamicArg, name.slice(1), value]);
  }

  yield(to: string) {
    let params = this.popValue<Params>();
    this.push([Ops.Yield, to, params]);
    this.template.block.yields.add(to);
  }

  debugger() {
    this.push([Ops.Debugger, null, null]);
  }

  hasBlock(name: string) {
    this.pushValue<Expressions.HasBlock>([Ops.HasBlock, name]);
    this.template.block.yields.add(name);
  }

  hasBlockParams(name: string) {
    this.pushValue<Expressions.HasBlockParams>([Ops.HasBlockParams, name]);
    this.template.block.yields.add(name);
  }

  partial() {
    let params = this.popValue<Params>();
    this.push([Ops.Partial, params[0]]);
    this.template.block.hasPartials = true;
  }

  /// Expressions

  literal(value: Expressions.Value | undefined) {
    if (value === undefined) {
      this.pushValue<Expressions.Undefined>([Ops.Undefined]);
    } else {
      this.pushValue<Expressions.Value>(value);
    }
  }

  unknown(path: string[]) {
    this.pushValue<Expressions.Unknown>([Ops.Unknown, path]);
  }

  arg(path: string[]) {
    this.template.block.named.add(path[0]);
    this.pushValue<Expressions.Arg>([Ops.Arg, path]);
  }

  get(path: string[]) {
    this.pushValue<Expressions.Get>([Ops.Get, path]);
  }

  concat() {
    this.pushValue<Expressions.Concat>([Ops.Concat, this.popValue<Params>()]);
  }

  helper(path: string[]) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.pushValue<Expressions.Helper>([Ops.Helper, path, params, hash]);
  }

  /// Stack Management Opcodes

  startComponent(blockParams: string[]) {
    let component = new ComponentBlock();
    component.positionals = blockParams;
    this.blocks.push(component);
  }

  endComponent(): SerializedComponent {
    let component = this.blocks.pop();
    assert(component.type === 'component', "Compiler bug: endComponent() should end a component");
    return (component as ComponentBlock).toJSON();
  }

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
