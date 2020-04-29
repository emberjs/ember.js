import { assert } from '@glimmer/util';
import { Stack, DictSet, Option, expect } from '@glimmer/util';
import { AST } from '@glimmer/syntax';
import { CompileOptions } from './template-compiler';
import { isArgument, isAttribute, isFlushElement } from '@glimmer/wire-format';
import { Processor, JavaScriptCompilerOps, Ops, SourceLocation } from './compiler-ops';
import {
  WireFormat,
  SerializedInlineBlock,
  Statement,
  SerializedTemplateBlock,
  Statements,
  SexpOpcodes,
  Expression,
  Expressions,
  ExpressionContext,
} from '@glimmer/interfaces';
import { expressionContextOp } from './builder';

export type str = string;
import Core = WireFormat.Core;
import { deflateAttrName } from './utils';
export type Params = WireFormat.Core.Params;
export type ConcatParams = WireFormat.Core.ConcatParams;
export type Hash = WireFormat.Core.Hash;
export type Path = WireFormat.Core.Path;
export type StackValue = WireFormat.Expression | Params | Hash | str;

export abstract class Block {
  public statements: WireFormat.Statement[] = [];

  abstract toJSON(): Object;

  push(statement: WireFormat.Statement) {
    this.statements.push(statement);
  }
}

export class InlineBlock extends Block {
  constructor(public table: AST.BlockSymbols) {
    super();
  }

  toJSON(): SerializedInlineBlock {
    return {
      statements: this.statements,
      parameters: this.table.slots,
    };
  }
}

export class NamedBlock extends InlineBlock {
  constructor(public name: string, table: AST.BlockSymbols) {
    super(table);
  }
}

export class TemplateBlock extends Block {
  public type = 'template';
  public yields = new DictSet<string>();
  public named = new DictSet<string>();
  public blocks: SerializedInlineBlock[] = [];
  public hasEval = false;

  constructor(private symbolTable: AST.ProgramSymbols) {
    super();
  }

  push(statement: Statement) {
    this.statements.push(statement);
  }

  toJSON(): SerializedTemplateBlock {
    return {
      symbols: this.symbolTable.symbols,
      statements: this.statements,
      hasEval: this.hasEval,
      upvars: this.symbolTable.freeVariables,
    };
  }
}

export class ComponentBlock extends Block {
  public attributes: Statements.Attribute[] = [];
  public arguments: Statements.Argument[] = [];
  private inParams = true;
  public positionals: number[] = [];
  public blocks: Array<[string, SerializedInlineBlock]> = [];

  constructor(private tag: string, private table: AST.BlockSymbols, private selfClosing: boolean) {
    super();
  }

  push(statement: Statement) {
    if (this.inParams) {
      if (isFlushElement(statement)) {
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

  pushBlock(name: string, block: SerializedInlineBlock) {
    this.blocks.push([name, block]);
  }

  toJSON(): [string, Statements.Attribute[], Core.Hash, Core.Blocks] {
    let blocks: Core.Blocks;
    let args = this.arguments;
    let keys = args.map(arg => arg[1]);
    let values = args.map(arg => arg[2]);

    if (this.selfClosing) {
      blocks = null;
    } else if (this.blocks.length > 0) {
      let keys: string[] = [];
      let values: SerializedInlineBlock[] = [];

      for (let i = 0; i < this.blocks.length; i++) {
        let [key, value] = this.blocks[i];
        keys.push(key.slice(1));
        values.push(value);
      }
      blocks = [keys, values];
    } else {
      blocks = [
        ['default'],
        [
          {
            statements: this.statements,
            parameters: this.table.slots,
          },
        ],
      ];
    }

    return [this.tag, this.attributes, [keys, values], blocks];
  }
}

export class Template {
  public block: TemplateBlock;

  constructor(symbols: AST.ProgramSymbols) {
    this.block = new TemplateBlock(symbols);
  }

  toJSON(): SerializedTemplateBlock {
    return this.block.toJSON();
  }
}

type Input = readonly Ops<JavaScriptCompilerOps>[];

export default class JavaScriptCompiler implements Processor<JavaScriptCompilerOps> {
  static process(
    opcodes: Input,
    locations: readonly Option<SourceLocation>[],
    symbols: AST.ProgramSymbols,
    options?: CompileOptions
  ): Template {
    let compiler = new JavaScriptCompiler(opcodes, symbols, locations, options);
    return compiler.process();
  }

  private readonly template: Template;
  private readonly blocks = new Stack<Block>();
  private readonly opcodes: readonly Ops<JavaScriptCompilerOps>[];
  private readonly values: StackValue[] = [];
  private readonly options: CompileOptions | undefined;
  private location: Option<SourceLocation> = null;
  private locationStack: Option<SourceLocation>[] = [];

  constructor(
    opcodes: Input,
    symbols: AST.ProgramSymbols,
    private locations: readonly Option<SourceLocation>[],
    options?: CompileOptions
  ) {
    this.opcodes = opcodes;
    this.template = new Template(symbols);
    this.options = options;
  }

  get currentBlock(): Block {
    return expect(this.blocks.current, 'Expected a block on the stack');
  }

  get currentComponent(): ComponentBlock {
    let block = this.currentBlock;

    if (block instanceof ComponentBlock) {
      return block;
    } else {
      throw new Error(`Expected ComponentBlock on stack, found ${block.constructor.name}`);
    }
  }

  process(): Template {
    this.opcodes.forEach((op, i) => {
      let opcode = op[0];
      this.location = this.locations[i];

      let arg = op[1];

      if (!this[opcode]) {
        throw new Error(`unimplemented ${opcode} on JavaScriptCompiler`);
      }
      (this[opcode] as any)(arg);
    });
    return this.template;
  }

  /// Nesting

  startBlock(program: AST.Block) {
    this.startInlineBlock(program.symbols!);
  }

  endBlock() {
    let block = this.endInlineBlock();
    this.template.block.blocks.push(block);
  }

  startProgram() {
    this.blocks.push(this.template.block);
  }

  endProgram() {}

  /// Statements

  text(content: string) {
    this.push([SexpOpcodes.TrustingAppend, content]);
  }

  append(trusted: boolean) {
    this.push([
      trusted ? SexpOpcodes.TrustingAppend : SexpOpcodes.Append,
      this.popValue<Expression>(),
    ]);
  }

  comment(value: string) {
    this.push([SexpOpcodes.Comment, value]);
  }

  modifier() {
    let name = this.popValue<Expression>();
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();
    this.push([SexpOpcodes.Modifier, name, params, hash]);
  }

  block([template, inverse]: [number, Option<number>]) {
    let head = this.popValue<Expression>();
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    let blocks = this.template.block.blocks;
    assert(
      typeof template !== 'number' || blocks[template] !== null,
      'missing block in the compiler'
    );
    assert(
      typeof inverse !== 'number' || blocks[inverse] !== null,
      'missing block in the compiler'
    );

    let namedBlocks: Option<Core.Blocks>;

    if (template === null && inverse === null) {
      namedBlocks = null;
    } else if (inverse === null) {
      namedBlocks = [['default'], [blocks[template]]];
    } else {
      namedBlocks = [
        ['default', 'else'],
        [blocks[template], blocks[inverse]],
      ];
    }

    // assert(head[]);

    this.push([SexpOpcodes.Block, head, params, hash, namedBlocks]);
  }

  openComponent(element: AST.ElementNode) {
    let tag =
      this.options && this.options.customizeComponentName
        ? this.options.customizeComponentName(element.tag)
        : element.tag;
    let component = new ComponentBlock(tag, element.symbols!, element.selfClosing);
    this.blocks.push(component);
  }

  openNamedBlock(element: AST.ElementNode) {
    let block: Block = new NamedBlock(element.tag, element.symbols!);
    this.blocks.push(block);
  }

  openElement([element, simple]: [AST.ElementNode, boolean]) {
    let tag = element.tag;

    if (element.blockParams.length > 0) {
      throw new Error(
        `Compile Error: <${element.tag}> is not a component and doesn't support block parameters`
      );
    } else {
      this.push(simple ? [SexpOpcodes.OpenElement, tag] : [SexpOpcodes.OpenElementWithSplat, tag]);
    }
  }

  flushElement() {
    this.push([SexpOpcodes.FlushElement]);
  }

  closeComponent(_element: AST.ElementNode) {
    let [tag, attrs, args, blocks] = this.endComponent();

    this.push([SexpOpcodes.Component, tag, attrs, args, blocks]);
  }

  closeNamedBlock(_element: AST.ElementNode) {
    let { blocks } = this;
    let block = expect(blocks.pop(), `Expected a named block on the stack`) as NamedBlock;

    this.currentComponent.pushBlock(block.name, block.toJSON());
  }

  closeDynamicComponent(_element: AST.ElementNode) {
    let [, attrs, args, block] = this.endComponent();

    this.push([SexpOpcodes.Component, this.popValue<Expression>(), attrs, args, block]);
  }

  closeElement(_element: AST.ElementNode) {
    this.push([SexpOpcodes.CloseElement]);
  }

  staticAttr([name, namespace]: [string, string?]) {
    let value = this.popValue<string>();
    let op: Statements.StaticAttr = [SexpOpcodes.StaticAttr, deflateAttrName(name), value];
    if (namespace) op.push(namespace);
    this.push(op);
  }

  staticComponentAttr([name, namespace]: [string, string?]) {
    let value = this.popValue<string>();
    let op: Statements.StaticComponentAttr = [
      SexpOpcodes.StaticComponentAttr,
      deflateAttrName(name),
      value,
    ];
    if (namespace) op.push(namespace);
    this.push(op);
  }

  dynamicAttr([name, namespace]: [string, string?]) {
    let value = this.popValue<Expression>();
    let op: Statements.DynamicAttr = [SexpOpcodes.DynamicAttr, deflateAttrName(name), value];
    if (namespace) op.push(namespace);
    this.push(op);
  }

  componentAttr([name, namespace]: [string, string?]) {
    let value = this.popValue<Expression>();
    let op: Statements.ComponentAttr = [SexpOpcodes.ComponentAttr, deflateAttrName(name), value];
    if (namespace) op.push(namespace);
    this.push(op);
  }

  trustingAttr([name, namespace]: [string, string?]) {
    let value = this.popValue<Expression>();
    let op: Statements.TrustingAttr = [
      SexpOpcodes.TrustingDynamicAttr,
      deflateAttrName(name),
      value,
    ];
    if (namespace) op.push(namespace);
    this.push(op);
  }

  trustingComponentAttr([name, namespace]: [string, string?]) {
    let value = this.popValue<Expression>();
    let op: Statements.TrustingComponentAttr = [
      SexpOpcodes.TrustingComponentAttr,
      deflateAttrName(name),
      value,
    ];
    if (namespace) op.push(namespace);
    this.push(op);
  }

  staticArg(name: str) {
    let value = this.popValue<Expression>();
    this.push([SexpOpcodes.StaticArg, name, value]);
  }

  dynamicArg(name: str) {
    let value = this.popValue<Expression>();
    this.push([SexpOpcodes.DynamicArg, name, value]);
  }

  yield(to: number) {
    let params = this.popValue<Params>();
    this.push([SexpOpcodes.Yield, to, params]);
  }

  attrSplat(to: Option<number>) {
    // consume (and disregard) the value pushed for the
    // ...attributes attribute
    this.popValue();
    this.push([SexpOpcodes.AttrSplat, to!]);
  }

  debugger(evalInfo: Option<Core.EvalInfo>) {
    this.push([SexpOpcodes.Debugger, evalInfo!]);
    this.template.block.hasEval = true;
  }

  hasBlock(name: number) {
    this.pushValue<Expressions.HasBlock>([SexpOpcodes.HasBlock, [SexpOpcodes.GetSymbol, name]]);
  }

  hasBlockParams(name: number) {
    this.pushValue<Expressions.HasBlockParams>([
      SexpOpcodes.HasBlockParams,
      [SexpOpcodes.GetSymbol, name],
    ]);
  }

  partial(evalInfo: Option<Core.EvalInfo>) {
    let params = this.popValue<Params>();
    this.push([SexpOpcodes.Partial, params[0], evalInfo!]);
    this.template.block.hasEval = true;
  }

  /// Expressions

  literal(value: Expressions.Value | undefined) {
    if (value === undefined) {
      this.pushValue<Expressions.Undefined>([SexpOpcodes.Undefined]);
    } else {
      this.pushValue<Expressions.Value>(value);
    }
  }

  getPath(path: string[]) {
    let [op, sym] = this.popValue<Expressions.Get>();
    this.pushValue<Expressions.GetPath>([op, sym, path]);
  }

  getSymbol(head: number) {
    this.pushValue<Expressions.GetSymbol>([SexpOpcodes.GetSymbol, head]);
  }

  getFree(head: number) {
    this.pushValue<Expressions.GetFree>([SexpOpcodes.GetFree, head]);
  }

  getFreeWithContext([head, context]: [number, ExpressionContext]) {
    this.pushValue<Expressions.GetContextualFree>([expressionContextOp(context), head]);
  }

  concat() {
    this.pushValue<Expressions.Concat>([SexpOpcodes.Concat, this.popValue<ConcatParams>()]);
  }

  helper() {
    let { value: head } = this.popLocatedValue<Expression>();
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.pushValue<Expressions.Helper>([SexpOpcodes.Call, head, params, hash]);
  }

  /// Stack Management Opcodes

  prepareArray(size: number) {
    let values: Expression[] = [];

    for (let i = 0; i < size; i++) {
      values.push(this.popValue() as Expression);
    }

    this.pushValue<Params>(values);
  }

  prepareObject(size: number) {
    assert(
      this.values.length >= size,
      `Expected ${size} values on the stack, found ${this.values.length}`
    );

    let keys: string[] = new Array(size);
    let values: Expression[] = new Array(size);

    for (let i = 0; i < size; i++) {
      keys[i] = this.popValue<str>();
      values[i] = this.popValue<Expression>();
    }

    this.pushValue<Hash>([keys, values]);
  }

  /// Utilities

  endComponent(): [string, Statements.Attribute[], Core.Hash, Core.Blocks] {
    let component = this.blocks.pop();
    assert(
      component instanceof ComponentBlock,
      'Compiler bug: endComponent() should end a component'
    );

    return (component as ComponentBlock).toJSON();
  }

  startInlineBlock(symbols: AST.BlockSymbols) {
    let block: Block = new InlineBlock(symbols);
    this.blocks.push(block);
  }

  endInlineBlock(): SerializedInlineBlock {
    let { blocks } = this;
    let block = blocks.pop() as InlineBlock;
    return block.toJSON();
  }

  push(args: Statement) {
    this.currentBlock.push(args);
  }

  pushValue<S extends Expression | Params | Hash>(val: S) {
    this.values.push(val);
    this.locationStack.push(this.location);
  }

  popLocatedValue<T extends StackValue>(): { value: T; location: Option<SourceLocation> } {
    assert(this.values.length, 'No expression found on stack');
    let value = this.values.pop() as T;
    let location = this.locationStack.pop();

    if (location === undefined) {
      throw new Error('Unbalanced location push and pop');
    }

    return { value, location };
  }

  popValue<T extends StackValue>(): T {
    return this.popLocatedValue<T>().value;
  }
}
