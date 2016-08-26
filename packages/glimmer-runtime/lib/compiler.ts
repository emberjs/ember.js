import { Opaque, Slice, LinkedList } from 'glimmer-util';
import { OpSeq, Opcode } from './opcodes';

import * as Syntax from './syntax/core';
import { Environment } from './environment';
import SymbolTable from './symbol-table';
import { Block, CompiledBlock, EntryPoint, InlineBlock, Layout } from './compiled/blocks';

import OpcodeBuilder, {
  StaticComponentOptions,
  DynamicComponentOptions
} from './opcode-builder';

import {
  Statement as StatementSyntax,
  Attribute as AttributeSyntax,
  StatementCompilationBuffer,
} from './syntax';

import {
  Expression
} from './syntax';

import {
  FunctionExpression,
  default as makeFunctionExpression
} from './compiled/expressions/function';

import OpcodeBuilderDSL from './compiled/opcodes/builder';

import * as Component from './component/interfaces';

abstract class Compiler {
  public env: Environment;
  protected block: Block;
  protected symbolTable: SymbolTable;
  protected current: StatementSyntax;

  constructor(block: Block, env: Environment) {
    this.block = block;
    this.current = block.program.head();
    this.env = env;
    this.symbolTable = block.symbolTable;
  }

  protected compileStatement(statement: StatementSyntax, ops: OpcodeBuilderDSL) {
    this.env.statement(statement, this.block.meta).compile(ops, this.env, this.block);
  }
}

function compileStatement(env: Environment, statement: StatementSyntax, ops: OpcodeBuilderDSL, layout: Layout) {
  env.statement(statement, layout.meta).compile(ops, env, layout);
}

export default Compiler;

export class EntryPointCompiler extends Compiler {
  private ops: OpcodeBuilderDSL;
  protected block: EntryPoint;

  constructor(template: EntryPoint, env: Environment) {
    super(template, env);
    let list = new CompileIntoList(env, template);
    this.ops = new OpcodeBuilderDSL(list, template, env);
  }

  compile(): OpSeq {
    let { block, ops } = this;
    let { program } = block;

    let current = program.head();

    while (current) {
      let next = program.nextNode(current);
      this.compileStatement(current, ops);
      current = next;
    }

    return ops.toOpSeq();
  }

  append(op: Opcode) {
    this.ops.append(op);
  }

  getLocalSymbol(name: string): number {
    return this.symbolTable.getLocal(name);
  }

  getNamedSymbol(name: string): number {
    return this.symbolTable.getNamed(name);
  }

  getYieldSymbol(name: string): number {
    return this.symbolTable.getYield(name);
  }
}

export class InlineBlockCompiler extends Compiler {
  private ops: OpcodeBuilderDSL;
  protected block: InlineBlock;
  protected current: StatementSyntax;

  constructor(block: InlineBlock, env: Environment) {
    super(block, env);
    let list = new CompileIntoList(env, block);
    this.ops = new OpcodeBuilderDSL(list, block, env);
  }

  compile(): OpSeq {
    let { block, ops } = this;
    let { program } = block;

    if (block.hasPositionalParameters()) {
      ops.bindPositionalArgsForBlock(block);
    }

    let current = program.head();

    while (current) {
      let next = program.nextNode(current);
      this.compileStatement(current, ops);
      current = next;
    }

    return ops.toOpSeq();
  }
}

export interface ComponentParts {
  tag: string;
  attrs: Slice<AttributeSyntax<Opaque>>;
  body: Slice<StatementSyntax>;
}

export interface CompiledComponentParts {
  tag: string;
  preamble: CompileIntoList;
  main: CompileIntoList;
}

export interface Compilable {
  compile(builder: ComponentLayoutBuilder);
}

export function compileLayout(compilable: Compilable, env: Environment): CompiledBlock {
  let builder = new ComponentLayoutBuilder(env);

  compilable.compile(builder);

  return builder.compile();
}

class ComponentLayoutBuilder implements Component.ComponentLayoutBuilder {
  public env: Environment;

  private inner: EmptyBuilder | WrappedBuilder | UnwrappedBuilder;

  constructor(env: Environment) {
    this.env = env;
  }

  empty() {
    this.inner = new EmptyBuilder(this.env);
  }

  wrapLayout(layout: Layout) {
    this.inner = new WrappedBuilder(this.env, layout);
  }

  fromLayout(layout: Layout) {
    this.inner = new UnwrappedBuilder(this.env, layout);
  }

  compile(): CompiledBlock {
    return this.inner.compile();
  }

  get tag(): Component.ComponentTagBuilder {
    return this.inner.tag;
  }

  get attrs(): Component.ComponentAttrsBuilder {
    return this.inner.attrs;
  }
}

class EmptyBuilder {
  public env: Environment;

  constructor(env: Environment) {
    this.env = env;
  }

  get tag(): Component.ComponentTagBuilder {
    throw new Error('Nope');
  }

  get attrs(): Component.ComponentAttrsBuilder {
    throw new Error('Nope');
  }

  compile(): CompiledBlock {
    let { env } = this;

    let list = new CompileIntoList(env, null);
    return new CompiledBlock(list, 0);
  }
}

class WrappedBuilder {
  private layout: Layout;
  public env: Environment;

  public tag = new ComponentTagBuilder();
  public attrs = new ComponentAttrsBuilder();

  constructor(env: Environment, layout: Layout) {
    this.env = env;
    this.layout = layout;
  }

  compile(): CompiledBlock {
    //========DYNAMIC
    //        PutValue(TagExpr)
    //        Test
    //        JumpUnless(BODY)
    //        OpenDynamicPrimitiveElement
    //        DidCreateElement
    //        ...attr statements...
    //        FlushElement
    // BODY:  Noop
    //        ...body statements...
    //        PutValue(TagExpr)
    //        Test
    //        JumpUnless(END)
    //        CloseElement
    // END:   Noop
    //        DidRenderLayout
    //        Exit
    //
    //========STATIC
    //        OpenPrimitiveElementOpcode
    //        DidCreateElement
    //        ...attr statements...
    //        FlushElement
    //        ...body statements...
    //        CloseElement
    //        DidRenderLayout
    //        Exit

    let { env, layout } = this;

    let symbolTable = layout.symbolTable;
    let buffer = new CompileIntoList(env, layout);
    let dsl = new OpcodeBuilderDSL(buffer, layout, env);

    dsl.startLabels();

    if (this.tag.isDynamic) {
      dsl.putValue(this.tag.dynamicTagName);
      dsl.test('simple');
      dsl.jumpUnless('BODY');
      dsl.openDynamicPrimitiveElement();
      dsl.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(env, statement, dsl, layout));
      dsl.flushElement();
      dsl.label('BODY');
    } else if (this.tag.isStatic) {
      let tag = this.tag.staticTagName;
      dsl.openPrimitiveElement(tag);
      dsl.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(env, statement, dsl, layout));
      dsl.flushElement();
    }

    if (layout.hasNamedParameters()) {
      dsl.bindNamedArgsForLayout(layout);
    }

    if (layout.hasYields()) {
      dsl.bindBlocksForLayout(layout);
    }
    layout.program.forEachNode(statement => compileStatement(env, statement, dsl, layout));

    if (this.tag.isDynamic) {
      dsl.putValue(this.tag.dynamicTagName);
      dsl.test('simple');
      dsl.jumpUnless('END');
      dsl.closeElement();
      dsl.label('END');
    } else if (this.tag.isStatic) {
      dsl.closeElement();
    }

    dsl.didRenderLayout();
    dsl.stopLabels();

    return new CompiledBlock(dsl.toOpSeq(), symbolTable.size);
  }
}

class UnwrappedBuilder {
  private layout: Layout;
  public env: Environment;

  public attrs = new ComponentAttrsBuilder();

  constructor(env: Environment, layout: Layout) {
    this.env = env;
    this.layout = layout;
  }

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): CompiledBlock {
    let { env, layout } = this;

    let buffer = new CompileIntoList(env, layout);
    let dsl = new OpcodeBuilderDSL(buffer, layout, env);

    dsl.startLabels();

    if (layout.hasNamedParameters()) {
      dsl.bindNamedArgsForLayout(layout);
    }

    if (layout.hasYields()) {
      dsl.bindBlocksForLayout(layout);
    }

    let attrs = this.attrs['buffer'];
    let attrsInserted = false;

    this.layout.program.forEachNode(statement => {
      if (!attrsInserted && isOpenElement(statement)) {
        dsl.openComponentElement(statement.tag);
        dsl.didCreateElement();
        dsl.shadowAttributes();
        attrs.forEach(statement => compileStatement(env, statement, dsl, layout));
        attrsInserted = true;
      } else {
        compileStatement(env, statement, dsl, layout);
      }
    });

    dsl.didRenderLayout();
    dsl.stopLabels();

    return new CompiledBlock(dsl.toOpSeq(), layout.symbolTable.size);
  }
}

type OpenElement = Syntax.OpenElement | Syntax.OpenPrimitiveElement;

function isOpenElement(syntax: StatementSyntax): syntax is OpenElement {
  return syntax instanceof Syntax.OpenElement || syntax instanceof Syntax.OpenPrimitiveElement;
}

class ComponentTagBuilder implements Component.ComponentTagBuilder {
  public isDynamic = null;
  public isStatic = null;
  public staticTagName: string = null;
  public dynamicTagName: Expression<string> = null;

  static(tagName: string) {
    this.isStatic = true;
    this.staticTagName = tagName;
  }

  dynamic(tagName: FunctionExpression<string>) {
    this.isDynamic = true;
    this.dynamicTagName = makeFunctionExpression(tagName);
  }
}

class ComponentAttrsBuilder implements Component.ComponentAttrsBuilder {
  private buffer: AttributeSyntax<string>[] = [];

  static(name: string, value: string) {
    this.buffer.push(new Syntax.StaticAttr({ name, value }));
  }

  dynamic(name: string, value: FunctionExpression<string>) {
    this.buffer.push(new Syntax.DynamicAttr({ name, value: makeFunctionExpression(value), isTrusting: false }));
  }
}

class ComponentBuilder {
  private env: Environment;

  constructor(private dsl: OpcodeBuilderDSL) {
    this.env = dsl.env;
  }

  static({ definition, args, shadow, templates }: StaticComponentOptions) {
    this.dsl.unit({ templates }, dsl => {
      dsl.putComponentDefinition(definition);
      dsl.openComponent(args, shadow);
      dsl.closeComponent();
    });
  }

  dynamic({ definitionArgs, definition, args, shadow, templates }: DynamicComponentOptions) {
    this.dsl.unit({ templates }, dsl => {
      dsl.enter('BEGIN', 'END');
      dsl.label('BEGIN');
      dsl.putArgs(definitionArgs);
      dsl.putValue(makeFunctionExpression(definition));
      dsl.test('simple');
      dsl.jumpUnless('END');
      dsl.putDynamicComponentDefinition();
      dsl.openComponent(args, shadow);
      dsl.closeComponent();
      dsl.label('END');
      dsl.exit();
    });
  }
}

export class CompileIntoList extends LinkedList<Opcode> implements OpcodeBuilder, StatementCompilationBuffer {
  private env: Environment;
  private block: Block;

  public component: ComponentBuilder;

  constructor(env: Environment, block: Block) {
    super();
    this.env = env;
    this.block = block;

    let dsl = new OpcodeBuilderDSL(this, block, env);
    this.component = new ComponentBuilder(dsl);
  }

  getLocalSymbol(name: string): number {
    return this.block.symbolTable.getLocal(name);
  }

  hasLocalSymbol(name: string): boolean {
    return typeof this.block.symbolTable.getLocal(name) === 'number';
  }

  getNamedSymbol(name: string): number {
    return this.block.symbolTable.getNamed(name);
  }

  hasNamedSymbol(name: string): boolean {
    return typeof this.block.symbolTable.getNamed(name) === 'number';
  }

  getBlockSymbol(name: string): number {
    return this.block.symbolTable.getYield(name);
  }

  hasBlockSymbol(name: string): boolean {
    return typeof this.block.symbolTable.getYield(name) === 'number';
  }

  toOpSeq(): OpSeq {
    return this;
  }
}
