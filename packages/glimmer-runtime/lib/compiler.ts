import { Opaque, Slice, LinkedList } from 'glimmer-util';
import { OpSeq, Opcode } from './opcodes';

import { EMPTY_ARRAY } from './utils';
import * as Syntax from './syntax/core';
import { Environment } from './environment';
import SymbolTable from './symbol-table';
import { Block, CompiledBlock, EntryPoint, InlineBlock, Layout } from './compiled/blocks';

import {
  ComponentBuilder as IComponentBuilder,
  DynamicDefinition,
  StaticDefinition
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
  protected symbolTable: SymbolTable;
  protected current: StatementSyntax;

  constructor(protected block: Block, public env: Environment) {
    this.current = block.program.head();
    this.symbolTable = block.symbolTable;
  }

  protected compileStatement(statement: StatementSyntax, ops: OpcodeBuilderDSL) {
    this.env.statement(statement, this.symbolTable).compile(ops, this.env, this.symbolTable);
  }
}

function compileStatement(env: Environment, statement: StatementSyntax, ops: OpcodeBuilderDSL, layout: Layout) {
  env.statement(statement, layout.symbolTable).compile(ops, env, layout.symbolTable);
}

export default Compiler;

export class EntryPointCompiler extends Compiler {
  private ops: OpcodeBuilderDSL;
  protected block: EntryPoint;

  constructor(template: EntryPoint, env: Environment) {
    super(template, env);
    let list = new CompileIntoList(env, template.symbolTable);
    this.ops = new OpcodeBuilderDSL(list, template.symbolTable, env);
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
  protected current: StatementSyntax;

  constructor(protected block: InlineBlock, env: Environment) {
    super(block, env);
    let list = new CompileIntoList(env, block.symbolTable);
    this.ops = new OpcodeBuilderDSL(list, block.symbolTable, env);
  }

  compile(): OpSeq {
    let { block, ops } = this;
    let { program } = block;

    let hasPositionalParameters = block.hasPositionalParameters();

    if (hasPositionalParameters) {
      ops.pushChildScope();
      ops.bindPositionalArgsForBlock(block);
    }

    let current = program.head();

    while (current) {
      let next = program.nextNode(current);
      this.compileStatement(current, ops);
      current = next;
    }

    if (hasPositionalParameters) {
      ops.popScope();
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
  private inner: EmptyBuilder | WrappedBuilder | UnwrappedBuilder;

  constructor(public env: Environment) {}

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

  constructor(public env: Environment) {}

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
  public tag = new ComponentTagBuilder();
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Layout) {}

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
    let buffer = new CompileIntoList(env, layout.symbolTable);
    let dsl = new OpcodeBuilderDSL(buffer, layout.symbolTable, env);

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
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Layout) {}

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): CompiledBlock {
    let { env, layout } = this;

    let buffer = new CompileIntoList(env, layout.symbolTable);
    let dsl = new OpcodeBuilderDSL(buffer, layout.symbolTable, env);

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
    this.buffer.push(new Syntax.StaticAttr(name, value, null));
  }

  dynamic(name: string, value: FunctionExpression<string>) {
    this.buffer.push(new Syntax.DynamicAttr(name, makeFunctionExpression(value), null, false));
  }
}

class ComponentBuilder implements IComponentBuilder {
  private env: Environment;

  constructor(private dsl: OpcodeBuilderDSL) {
    this.env = dsl.env;
  }

  static(definition: StaticDefinition, args: Syntax.Args, templates: Syntax.Templates, symbolTable: SymbolTable, shadow: string[] = EMPTY_ARRAY) {
    this.dsl.unit({ templates }, dsl => {
      dsl.putComponentDefinition(definition);
      dsl.openComponent(args, shadow);
      dsl.closeComponent();
    });
  }

  dynamic(definitionArgs: Syntax.Args, definition: DynamicDefinition, args: Syntax.Args, templates: Syntax.Templates, symbolTable: SymbolTable, shadow: string[] = EMPTY_ARRAY) {
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

export class CompileIntoList extends LinkedList<Opcode> implements StatementCompilationBuffer {
  public component: ComponentBuilder;

  constructor(private env: Environment, private symbolTable: SymbolTable) {
    super();

    let dsl = new OpcodeBuilderDSL(this, symbolTable, env);
    this.component = new ComponentBuilder(dsl);
  }

  getLocalSymbol(name: string): number {
    return this.symbolTable.getLocal(name);
  }

  hasLocalSymbol(name: string): boolean {
    return typeof this.symbolTable.getLocal(name) === 'number';
  }

  getNamedSymbol(name: string): number {
    return this.symbolTable.getNamed(name);
  }

  hasNamedSymbol(name: string): boolean {
    return typeof this.symbolTable.getNamed(name) === 'number';
  }

  getBlockSymbol(name: string): number {
    return this.symbolTable.getYield(name);
  }

  hasBlockSymbol(name: string): boolean {
    return typeof this.symbolTable.getYield(name) === 'number';
  }

  toOpSeq(): OpSeq {
    return this;
  }
}
