import { assert } from "@glimmer/util";
import { Stack, DictSet, Option, expect } from "@glimmer/util";
import { AST } from '@glimmer/syntax';
import { BlockSymbolTable, ProgramSymbolTable } from './template-visitor';

import {
  SerializedInlineBlock,
  SerializedTemplateBlock,
  Core,
  Statement,
  Statements,
  Expression,
  Expressions,
  Ops,
  isModifier,
  isFlushElement,
  isArgument,
  isAttribute
} from '@glimmer/wire-format';
import { Processor, CompilerOps, OpName, Op } from "./compiler-ops";

export type str = string;
export type Params = Core.Params;
export type Hash = Core.Hash;
export type Path = Core.Path;
export type StackValue = Expression | Params | Hash | str;

export abstract class Block {
  public statements: Statement[] = [];

  abstract toJSON(): Object;

  push(statement: Statement) {
    this.statements.push(statement);
  }
}

export class InlineBlock extends Block {
  constructor(public table: BlockSymbolTable) {
    super();
  }

  toJSON(): SerializedInlineBlock {
    return {
      statements: this.statements,
      parameters: this.table.slots
    };
  }
}

export class TemplateBlock extends Block {
  public type = "template";
  public yields = new DictSet<string>();
  public named = new DictSet<string>();
  public blocks: SerializedInlineBlock[] = [];
  public hasEval = false;

  constructor(private symbolTable: ProgramSymbolTable) {
    super();
  }

  push(statement: Statement) {
    this.statements.push(statement);
  }

  toJSON(): SerializedTemplateBlock {
    return {
      symbols: this.symbolTable.symbols,
      statements: this.statements,
      hasEval: this.hasEval
    };
  }
}

export class ComponentBlock extends Block {
  public attributes: Statements.Attribute[] = [];
  public arguments: Statements.Argument[] = [];
  private inParams = true;
  public positionals: number[] = [];

  constructor(private table: BlockSymbolTable) {
    super();
  }

  push(statement: Statement) {
    if (this.inParams) {
      if (isModifier(statement)) {
        throw new Error('Compile Error: Element modifiers are not allowed in components');
      } else if (isFlushElement(statement)) {
        this.inParams = false;
      } else if (isArgument(statement)) {
        this.arguments.push(statement);
      } else if (isAttribute(statement)) {
        this.attributes.push(statement);
      } else {
        throw new Error('Compile Error: only parameters allowed before flush-element');
      }
    } else {
      this.statements.push(statement);
    }
  }

  toJSON(): [Statements.Attribute[], Core.Hash, Option<SerializedInlineBlock>] {
    let args = this.arguments;
    let keys = args.map(arg => arg[1]);
    let values = args.map(arg => arg[2]);

    return [
      this.attributes,
      [keys, values],
      {
        statements: this.statements,
        parameters: this.table.slots
      }
    ];
  }
}

export class Template {
  public block: TemplateBlock;

  constructor(symbols: ProgramSymbolTable) {
    this.block = new TemplateBlock(symbols);
  }

  toJSON(): SerializedTemplateBlock {
    return this.block.toJSON();
  }
}

export type InVariable = number;
export type InOp<K extends keyof CompilerOps<InVariable> = OpName> = Op<InVariable, CompilerOps<InVariable>, K>;

export default class JavaScriptCompiler implements Processor<CompilerOps<number>, void, CompilerOps<void>> {
  static process(opcodes: InOp[], symbols: ProgramSymbolTable): Template {
    let compiler = new JavaScriptCompiler(opcodes, symbols);
    return compiler.process();
  }

  private template: Template;
  private blocks = new Stack<Block>();
  private opcodes: InOp[];
  private values: StackValue[] = [];

  constructor(opcodes: InOp[], symbols: ProgramSymbolTable) {
    this.opcodes = opcodes;
    this.template = new Template(symbols);
  }

  get currentBlock(): Block {
    return expect(this.blocks.current, 'Expected a block on the stack');
  }

  process(): Template {
    this.opcodes.forEach(op => {
      let opcode = op[0];
      let arg = op[1];

      if (!this[opcode]) { throw new Error(`unimplemented ${opcode} on JavaScriptCompiler`); }
      (this[opcode] as any)(arg);
    });

    return this.template;
  }

  /// Nesting

  startBlock(program: AST.Program) {
    let block: Block = new InlineBlock(program['symbols']);
    this.blocks.push(block);
  }

  endBlock() {
    let { template, blocks } = this;
    let block = blocks.pop() as InlineBlock;
    template.block.blocks.push(block.toJSON());
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

  modifier(name: string) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.push([Ops.Modifier, name, params, hash]);
  }

  block([name, template, inverse]: [string, number, number]) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    let blocks = this.template.block.blocks;
    assert(typeof template !== 'number' || blocks[template] !== null, 'missing block in the compiler');
    assert(typeof inverse !== 'number' || blocks[inverse] !== null, 'missing block in the compiler');

    this.push([Ops.Block, name, params, hash, blocks[template], blocks[inverse]]);
  }

  openSplattedElement(element: AST.ElementNode) {
    let tag = element.tag;

    if (isComponent(tag)) {
      throw new Error(`Compile Error: ...attributes can only be used in an element`);
    } else if (element.blockParams.length > 0) {
      throw new Error(`Compile Error: <${element.tag}> is not a component and doesn't support block parameters`);
    } else {
      this.push([Ops.OpenSplattedElement, tag]);
    }
  }

  openElement(element: AST.ElementNode) {
    let tag = element.tag;

    if (isComponent(tag)) {
      this.startComponent(element);
    } else if (element.blockParams.length > 0) {
      throw new Error(`Compile Error: <${element.tag}> is not a component and doesn't support block parameters`);
    } else {
      this.push([Ops.OpenElement, tag]);
    }
  }

  flushElement() {
    this.push([Ops.FlushElement]);
  }

  closeElement(element: AST.ElementNode) {
    let tag = element.tag;

    if (isComponent(tag)) {
      let [attrs, args, block] = this.endComponent();
      this.push([Ops.Component, tag, attrs, args, block]);
    } else {
      this.push([Ops.CloseElement]);
    }
  }

  staticAttr([name, namespace]: [string, string]) {
    let value = this.popValue<Expression>();
    this.push([Ops.StaticAttr, name, value, namespace]);
  }

  dynamicAttr([name, namespace]: [string, string]) {
    let value = this.popValue<Expression>();
    this.push([Ops.DynamicAttr, name, value, namespace]);
  }

  trustingAttr([name, namespace]: [string, string]) {
    let value = this.popValue<Expression>();
    this.push([Ops.TrustingAttr, name, value, namespace]);
  }

  staticArg(name: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.StaticArg, name, value]);
  }

  dynamicArg(name: str) {
    let value = this.popValue<Expression>();
    this.push([Ops.DynamicArg, name, value]);
  }

  yield(to: number) {
    let params = this.popValue<Params>();
    this.push([Ops.Yield, to, params]);
  }

  attrSplat(to: number) {
    this.push([Ops.AttrSplat, to]);
  }

  debugger(evalInfo: Core.EvalInfo) {
    this.push([Ops.Debugger, evalInfo]);
    this.template.block.hasEval = true;
  }

  hasBlock(name: number) {
    this.pushValue<Expressions.HasBlock>([Ops.HasBlock, name]);
  }

  hasBlockParams(name: number) {
    this.pushValue<Expressions.HasBlockParams>([Ops.HasBlockParams, name]);
  }

  partial(evalInfo: Core.EvalInfo) {
    let params = this.popValue<Params>();
    this.push([Ops.Partial, params[0], evalInfo]);
    this.template.block.hasEval = true;
  }

  /// Expressions

  literal(value: Expressions.Value | undefined) {
    if (value === undefined) {
      this.pushValue<Expressions.Undefined>([Ops.Undefined]);
    } else {
      this.pushValue<Expressions.Value>(value);
    }
  }

  unknown(name: string) {
    this.pushValue<Expressions.Unknown>([Ops.Unknown, name]);
  }

  get([head, path]: [number, string[]]) {
    this.pushValue<Expressions.Get>([Ops.Get, head, path]);
  }

  maybeLocal(path: string[]) {
    this.pushValue<Expressions.MaybeLocal>([Ops.MaybeLocal, path]);
  }

  concat() {
    this.pushValue<Expressions.Concat>([Ops.Concat, this.popValue<Params>()]);
  }

  helper(name: string) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.pushValue<Expressions.Helper>([Ops.Helper, name, params, hash]);
  }

  /// Stack Management Opcodes

  startComponent(element: AST.ElementNode) {
    let component = new ComponentBlock(element['symbols']);
    this.blocks.push(component);
  }

  endComponent(): [Statements.Attribute[], Core.Hash, Option<SerializedInlineBlock>] {
    let component = this.blocks.pop();
    assert(component instanceof ComponentBlock, "Compiler bug: endComponent() should end a component");
    return (component as ComponentBlock).toJSON();
  }

  prepareArray(size: number) {
    let values: Expression[] = [];

    for (let i = 0; i < size; i++) {
      values.push(this.popValue() as Expression);
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

    this.currentBlock.push(args);
  }

  pushValue<S extends Expression | Params | Hash>(val: S) {
    this.values.push(val);
  }

  popValue<T extends StackValue>(): T {
    assert(this.values.length, "No expression found on stack");
    return this.values.pop() as T;
  }
}

function isComponent(tag: string): boolean {
  let open = tag.charAt(0);

  return open === open.toUpperCase();
}
