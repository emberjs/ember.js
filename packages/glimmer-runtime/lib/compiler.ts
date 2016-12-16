import { EMPTY_SYMBOL_TABLE } from './symbol-table';
import { Opaque, Slice, LinkedList, Option, Maybe } from 'glimmer-util';
import { OpSeq, Opcode } from './opcodes';

import { EMPTY_ARRAY } from './utils';
import * as Syntax from './syntax/core';
import { Environment } from './environment';
import { SymbolTable, ProgramSymbolTable } from 'glimmer-interfaces';
import { Block, CompiledBlock, CompiledProgram,  EntryPoint, InlineBlock, Layout } from './compiled/blocks';

import {
  ComponentBuilder as IComponentBuilder,
  DynamicDefinition,
  StaticDefinition
} from './opcode-builder';

import {
  Statement as StatementSyntax,
  Attribute as AttributeSyntax,
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

function compileStatement(env: Environment, statement: StatementSyntax, builder: OpcodeBuilderDSL, layout: Layout) {
  env.statement(statement, layout.symbolTable).compile(builder);
}

function compileBlock({ program: statements }: Block, env: Environment, symbolTable: SymbolTable, builder: OpcodeBuilderDSL) {
  let current = statements.head();

  while (current) {
    let next = statements.nextNode(current);
    env.statement(current, symbolTable).compile(builder);
    current = next;
  }

  return builder;
}

export function compileEntryPoint(block: Block, env: Environment): OpSeq {
  let ops = builder(env, block.symbolTable);
  return compileBlock(block, env, block.symbolTable, ops).toOpSeq();
}

export function compileInlineBlock(block: InlineBlock, env: Environment): OpSeq {
  let ops = builder(env, block.symbolTable);
  let hasPositionalParameters = block.hasPositionalParameters();

  if (hasPositionalParameters) {
    ops.pushChildScope();
    ops.bindPositionalArgsForBlock(block);
  }

  compileBlock(block, env, block.symbolTable, ops);

  if (hasPositionalParameters) {
    ops.popScope();
  }

  return ops.toOpSeq();
}

export interface CompilableLayout {
  compile(builder: Component.ComponentLayoutBuilder);
}

export function compileLayout(compilable: CompilableLayout, env: Environment): CompiledProgram {
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

  compile(): CompiledProgram {
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

  compile(): CompiledProgram {
    let { env } = this;

    let list = new CompileIntoList(env, EMPTY_SYMBOL_TABLE);
    return new CompiledProgram(list, 1);
  }
}

class WrappedBuilder {
  public tag = new ComponentTagBuilder();
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Layout) {}

  compile(): CompiledProgram {
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
    let dsl = builder(env, layout.symbolTable);

    dsl.startLabels();

    let dynamicTag = this.tag.getDynamic();
    let staticTag: Maybe<string>;

    if (dynamicTag) {
      dsl.putValue(dynamicTag);
      dsl.test('simple');
      dsl.jumpUnless('BODY');
      dsl.openDynamicPrimitiveElement();
      dsl.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(env, statement, dsl, layout));
      dsl.flushElement();
      dsl.label('BODY');
    } else if (staticTag = this.tag.getStatic()) {
      let tag = this.tag.staticTagName;
      dsl.openPrimitiveElement(staticTag);
      dsl.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(env, statement, dsl, layout));
      dsl.flushElement();
    }

    dsl.preludeForLayout(layout);

    layout.program.forEachNode(statement => compileStatement(env, statement, dsl, layout));

    if (dynamicTag) {
      dsl.putValue(dynamicTag);
      dsl.test('simple');
      dsl.jumpUnless('END');
      dsl.closeElement();
      dsl.label('END');
    } else if (staticTag) {
      dsl.closeElement();
    }

    dsl.didRenderLayout();
    dsl.stopLabels();

    return new CompiledProgram(dsl.toOpSeq(), symbolTable.size);
  }
}

class UnwrappedBuilder {
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Layout) {}

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): CompiledProgram {
    let { env, layout } = this;

    let dsl = builder(env, layout.symbolTable);

    dsl.startLabels();

    dsl.preludeForLayout(layout);

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

    return new CompiledProgram(dsl.toOpSeq(), layout.symbolTable.size);
  }
}

type OpenElement = Syntax.OpenElement | Syntax.OpenPrimitiveElement;

function isOpenElement(syntax: StatementSyntax): syntax is OpenElement {
  return syntax instanceof Syntax.OpenElement || syntax instanceof Syntax.OpenPrimitiveElement;
}

class ComponentTagBuilder implements Component.ComponentTagBuilder {
  public isDynamic: Option<boolean> = null;
  public isStatic: Option<boolean> = null;
  public staticTagName: Option<string> = null;
  public dynamicTagName: Option<Expression<string>> = null;

  getDynamic(): Maybe<Expression<string>> {
    if (this.isDynamic) {
      return this.dynamicTagName;
    }
  }

  getStatic(): Maybe<string> {
    if (this.isStatic) {
      return this.staticTagName;
    }
  }

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

  static(definition: StaticDefinition, args: Syntax.Args, symbolTable: SymbolTable, shadow: ReadonlyArray<string> = EMPTY_ARRAY) {
    this.dsl.unit(dsl => {
      dsl.putComponentDefinition(definition);
      dsl.openComponent(args, shadow);
      dsl.closeComponent();
    });
  }

  dynamic(definitionArgs: Syntax.Args, definition: DynamicDefinition, args: Syntax.Args, symbolTable: SymbolTable, shadow: ReadonlyArray<string> = EMPTY_ARRAY) {
    this.dsl.unit(dsl => {
      dsl.putArgs(definitionArgs);
      dsl.putValue(makeFunctionExpression(definition));
      dsl.test('simple');
      dsl.enter('BEGIN', 'END');
      dsl.label('BEGIN');
      dsl.jumpUnless('END');
      dsl.putDynamicComponentDefinition();
      dsl.openComponent(args, shadow);
      dsl.closeComponent();
      dsl.label('END');
      dsl.exit();
    });
  }
}

export function builder<S extends SymbolTable>(env: Environment, symbolTable: S) {
  let list = new CompileIntoList(env, symbolTable);
  return new OpcodeBuilderDSL(list, symbolTable, env);
}

export class CompileIntoList<T extends SymbolTable> extends LinkedList<Opcode> {
  public component: IComponentBuilder;

  constructor(public env: Environment, public symbolTable: SymbolTable) {
    super();

    let dsl = new OpcodeBuilderDSL(this, symbolTable, env);
    this.component = new ComponentBuilder(dsl);
  }

  toOpSeq(): OpSeq {
    return this;
  }
}

export type ProgramBuffer = CompileIntoList<ProgramSymbolTable>;