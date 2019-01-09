import { assert } from '@glimmer/util';
import { Stack, DictSet, Option, expect } from '@glimmer/util';
import { AST } from '@glimmer/syntax';
import { CompileOptions } from './template-compiler';
import { isFlushElement, isArgument, isAttribute, isAttrSplat } from '@glimmer/wire-format';
import { Processor, CompilerOps, OpName, Op } from './compiler-ops';
import {
  WireFormat,
  SerializedInlineBlock,
  Statement,
  SerializedTemplateBlock,
  Statements,
  SexpOpcodes,
  Expression,
  Expressions,
} from '@glimmer/interfaces';

export type str = string;
import Core = WireFormat.Core;
export type Params = WireFormat.Core.Params;
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

  constructor(private symbolTable: AST.Symbols) {
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
      } else if (isAttrSplat(statement)) {
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

  constructor(symbols: AST.Symbols) {
    this.block = new TemplateBlock(symbols);
  }

  toJSON(): SerializedTemplateBlock {
    return this.block.toJSON();
  }
}

export type InVariable = number;
export type InOp<K extends keyof CompilerOps<InVariable> = OpName> = Op<
  InVariable,
  CompilerOps<InVariable>,
  K
>;

export default class JavaScriptCompiler
  implements Processor<CompilerOps<number>, void, CompilerOps<void>> {
  static process(opcodes: InOp[], symbols: AST.Symbols, options?: CompileOptions): Template {
    let compiler = new JavaScriptCompiler(opcodes, symbols, options);
    return compiler.process();
  }

  private template: Template;
  private blocks = new Stack<Block>();
  private opcodes: InOp[];
  private values: StackValue[] = [];
  private options: CompileOptions | undefined;

  constructor(opcodes: InOp[], symbols: AST.Symbols, options?: CompileOptions) {
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
    this.opcodes.forEach(op => {
      let opcode = op[0];
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
    this.push([SexpOpcodes.Text, content]);
  }

  append(trusted: boolean) {
    this.push([SexpOpcodes.Append, this.popValue<Expression>(), trusted]);
  }

  comment(value: string) {
    this.push([SexpOpcodes.Comment, value]);
  }

  modifier(name: string) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.push([SexpOpcodes.Modifier, name, params, hash]);
  }

  block([name, template, inverse]: [string, number, Option<number>]) {
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
      namedBlocks = [['default', 'else'], [blocks[template], blocks[inverse]]];
    }

    this.push([SexpOpcodes.Block, name, params, hash, namedBlocks]);
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

  openSplattedElement(element: AST.ElementNode) {
    let tag = element.tag;

    if (element.blockParams.length > 0) {
      throw new Error(
        `Compile Error: <${element.tag}> is not a component and doesn't support block parameters`
      );
    } else {
      this.push([SexpOpcodes.OpenSplattedElement, tag]);
    }
  }

  openElement(element: AST.ElementNode) {
    let tag = element.tag;

    if (element.blockParams.length > 0) {
      throw new Error(
        `Compile Error: <${element.tag}> is not a component and doesn't support block parameters`
      );
    } else {
      this.push([SexpOpcodes.OpenElement, tag]);
    }
  }

  flushElement() {
    this.push([SexpOpcodes.FlushElement]);
  }

  closeComponent(_element: AST.ElementNode) {
    if (_element.modifiers.length > 0) {
      throw new Error('Compile Error: Element modifiers are not allowed in components');
    }

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

    this.push([SexpOpcodes.DynamicComponent, this.popValue<Expression>(), attrs, args, block]);
  }

  closeElement(_element: AST.ElementNode) {
    this.push([SexpOpcodes.CloseElement]);
  }

  staticAttr([name, namespace]: [string, Option<string>]) {
    let value = this.popValue<string>();
    this.push([SexpOpcodes.StaticAttr, name, value, namespace]);
  }

  dynamicAttr([name, namespace]: [string, Option<string>]) {
    let value = this.popValue<Expression>();
    this.push([SexpOpcodes.DynamicAttr, name, value, namespace]);
  }

  componentAttr([name, namespace]: [string, Option<string>]) {
    let value = this.popValue<Expression>();
    this.push([SexpOpcodes.ComponentAttr, name, value, namespace]);
  }

  trustingAttr([name, namespace]: [string, Option<string>]) {
    let value = this.popValue<Expression>();
    this.push([SexpOpcodes.TrustingDynamicAttr, name, value, namespace!]);
  }

  trustingComponentAttr([name, namespace]: [string, Option<string>]) {
    let value = this.popValue<Expression>();
    this.push([SexpOpcodes.TrustingComponentAttr, name, value, namespace!]);
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
    this.push([SexpOpcodes.AttrSplat, to!]);
  }

  debugger(evalInfo: Option<Core.EvalInfo>) {
    this.push([SexpOpcodes.Debugger, evalInfo!]);
    this.template.block.hasEval = true;
  }

  hasBlock(name: number) {
    this.pushValue<Expressions.HasBlock>([SexpOpcodes.HasBlock, name]);
  }

  hasBlockParams(name: number) {
    this.pushValue<Expressions.HasBlockParams>([SexpOpcodes.HasBlockParams, name]);
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

  unknown(name: string) {
    this.pushValue<Expressions.Unknown>([SexpOpcodes.Unknown, name]);
  }

  get([head, path]: [number, string[]]) {
    this.pushValue<Expressions.Get>([SexpOpcodes.Get, head, path]);
  }

  maybeLocal(path: string[]) {
    this.pushValue<Expressions.MaybeLocal>([SexpOpcodes.MaybeLocal, path]);
  }

  concat() {
    this.pushValue<Expressions.Concat>([SexpOpcodes.Concat, this.popValue<Params>()]);
  }

  helper(name: string) {
    let params = this.popValue<Params>();
    let hash = this.popValue<Hash>();

    this.pushValue<Expressions.Helper>([SexpOpcodes.Helper, name, params, hash]);
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
  }

  popValue<T extends StackValue>(): T {
    assert(this.values.length, 'No expression found on stack');
    return this.values.pop() as T;
  }
}
