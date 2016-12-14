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
  protected symbolTable: ProgramSymbolTable;

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
  preamble: CompileIntoList<ProgramSymbolTable>;
  main: CompileIntoList<ProgramSymbolTable>;
}

export interface Compilable {
  compile(builder: Component.ComponentLayoutBuilder);
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

    let list = new CompileIntoList(env, EMPTY_SYMBOL_TABLE);
    return new CompiledBlock(list);
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

  compile(): CompiledBlock {
    let { env, layout } = this;

    let buffer = new CompileIntoList(env, layout.symbolTable);
    let dsl = new OpcodeBuilderDSL(buffer, layout.symbolTable, env);

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

export class CompileIntoList<T extends SymbolTable> extends LinkedList<Opcode> implements StatementCompilationBuffer {
  public component: IComponentBuilder;

  constructor(private env: Environment, public symbolTable: SymbolTable) {
    super();

    let dsl = new OpcodeBuilderDSL(this, symbolTable, env);
    this.component = new ComponentBuilder(dsl);
  }

  toOpSeq(): OpSeq {
    return this;
  }
}
