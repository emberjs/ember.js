import { FIXME, Opaque, Slice, LinkedList, InternedString } from 'glimmer-util';
import { OpSeq, Opcode } from './opcodes';
import {
  OpenPrimitiveElementOpcode,
  OpenDynamicPrimitiveElementOpcode,
  CloseElementOpcode
} from './compiled/opcodes/dom';
import {
  DidCreateElementOpcode,
  PutDynamicComponentDefinitionOpcode,
  PutComponentDefinitionOpcode,
  ShadowAttributesOpcode,
  OpenComponentOpcode,
  CloseComponentOpcode
} from './compiled/opcodes/component';
import {
  BindNamedArgsOpcode,
  BindBlocksOpcode,
  BindPositionalArgsOpcode,
  EnterOpcode,
  ExitOpcode,
  LabelOpcode,
  PutArgsOpcode,
  PutValueOpcode,
  JumpUnlessOpcode,
  TestOpcode
} from './compiled/opcodes/vm';

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
  StatementCompilationBuffer
} from './syntax';

import {
  Expression
} from './syntax';

import {
  FunctionExpression,
  default as makeFunctionExpression
} from './compiled/expressions/function';

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

  protected compileStatement(statement: StatementSyntax, ops: StatementCompilationBuffer) {
    this.env.statement(statement, this.block.meta).compile(ops, this.env, this.block);
  }
}

function compileStatement(env: Environment, statement: StatementSyntax, ops: StatementCompilationBuffer, layout: Layout) {
  env.statement(statement, layout.meta).compile(ops, env, layout);
}

export default Compiler;

export class EntryPointCompiler extends Compiler {
  private ops: StatementCompilationBuffer;
  protected block: EntryPoint;

  constructor(template: EntryPoint, env: Environment) {
    super(template, env);
    this.ops = new CompileIntoList(env, template.symbolTable);
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

  getLocalSymbol(name: InternedString): number {
    return this.symbolTable.getLocal(name);
  }

  getNamedSymbol(name: InternedString): number {
    return this.symbolTable.getNamed(name);
  }

  getYieldSymbol(name: InternedString): number {
    return this.symbolTable.getYield(name);
  }
}

export class InlineBlockCompiler extends Compiler {
  private ops: CompileIntoList;
  protected block: InlineBlock;
  protected current: StatementSyntax;

  constructor(block: InlineBlock, env: Environment) {
    super(block, env);
    this.ops = new CompileIntoList(env, block.symbolTable);
  }

  compile(): CompileIntoList {
    let { block, ops } = this;
    let { program } = block;

    if (block.hasPositionalParameters()) {
      ops.append(new BindPositionalArgsOpcode({ block }));
    }

    let current = program.head();

    while (current) {
      let next = program.nextNode(current);
      this.compileStatement(current, ops);
      current = next;
    }

    return ops;
  }
}

export interface ComponentParts {
  tag: InternedString;
  attrs: Slice<AttributeSyntax<Opaque>>;
  body: Slice<StatementSyntax>;
}

export interface CompiledComponentParts {
  tag: InternedString;
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
    // BODY:  Noop
    //        PutValue(TagExpr)
    //        Test
    //        JumpUnless(END)
    //        CloseElement
    // END:   Noop
    //        Exit
    //
    //========STATIC
    //        OpenPrimitiveElementOpcode
    //        DidCreateElement
    //        ...attr statements...
    //        CloseElement
    //        Exit

    let { env, layout } = this;

    let symbolTable = layout.symbolTable;

    let list = new CompileIntoList(env, symbolTable);

    let tagExpr;
    if (this.tag.isDynamic) {
      let BODY = new LabelOpcode({ label: 'BODY' });
      tagExpr = this.tag.dynamicTagName.compile(list, env, layout.meta);
      list.append(new PutValueOpcode({ expression: tagExpr }));
      list.append(new TestOpcode());
      list.append(new JumpUnlessOpcode({ target: BODY }));
      list.append(new OpenDynamicPrimitiveElementOpcode());
      list.append(new DidCreateElementOpcode());
      this.attrs['buffer'].forEach(statement => compileStatement(env, statement, list, layout));
      list.append(BODY);
    } else if(this.tag.isStatic) {
      let tag = this.tag.staticTagName;
      list.append(new OpenPrimitiveElementOpcode({ tag }));
      list.append(new DidCreateElementOpcode());
      this.attrs['buffer'].forEach(statement => compileStatement(env, statement, list, layout));
    }

    if (layout.hasNamedParameters()) {
      list.append(BindNamedArgsOpcode.create(layout));
    }

    if (layout.hasYields()) {
      list.append(BindBlocksOpcode.create(layout));
    }

    layout.program.forEachNode(statement => compileStatement(env, statement, list, layout));

    if (this.tag.isDynamic) {
      let END = new LabelOpcode({ label: 'END' });
      list.append(new PutValueOpcode({ expression: tagExpr }));
      list.append(new TestOpcode());
      list.append(new JumpUnlessOpcode({ target: END }));
      list.append(new CloseElementOpcode());
      list.append(END);
    } else if(this.tag.isStatic) {
      list.append(new CloseElementOpcode());
    }

    return new CompiledBlock(list, symbolTable.size);
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

    let list = new CompileIntoList(env, layout.symbolTable);

    if (layout.hasNamedParameters()) {
      list.append(BindNamedArgsOpcode.create(layout));
    }

    if (layout.hasYields()) {
      list.append(BindBlocksOpcode.create(layout));
    }

    let attrs = this.attrs['buffer'];
    let attrsInserted = false;

    this.layout.program.forEachNode(statement => {
      compileStatement(env, statement, list, layout);

      if (!attrsInserted && isOpenElement(statement)) {
        list.append(new DidCreateElementOpcode());
        list.append(new ShadowAttributesOpcode());
        attrs.forEach(statement => compileStatement(env, statement, list, layout));
        attrsInserted = true;
      }
    });

    return new CompiledBlock(list, layout.symbolTable.size);
  }
}

type OpenElement = Syntax.OpenElement | Syntax.OpenPrimitiveElement;

function isOpenElement(syntax: StatementSyntax): syntax is OpenElement {
  return syntax instanceof Syntax.OpenElement || syntax instanceof Syntax.OpenPrimitiveElement;
}

class ComponentTagBuilder implements Component.ComponentTagBuilder {
  public isDynamic = null;
  public isStatic = null;
  public staticTagName: InternedString = null;
  public dynamicTagName: Expression<string> = null;

  static(tagName: InternedString) {
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
    this.buffer.push(new Syntax.StaticAttr({ name: name as FIXME<'intern'>, value: value as FIXME<'intern'> }));
  }

  dynamic(name: string, value: FunctionExpression<string>) {
    this.buffer.push(new Syntax.DynamicAttr({ name: name as FIXME<'intern'>, value: makeFunctionExpression(value), isTrusting: false }));
  }
}

class ComponentBuilder {
  private compiler: CompileIntoList;
  private env: Environment;

  constructor(compiler: CompileIntoList, env: Environment) {
    this.compiler = compiler;
    this.env = env;
  }

  static({ definition, args: rawArgs, shadow, templates }: StaticComponentOptions) {
    let { compiler, env } = this;

    let args = rawArgs.compile(compiler, env);
    compiler.append(new PutComponentDefinitionOpcode({ args, definition }));
    compiler.append(new OpenComponentOpcode({ shadow, templates }));
    compiler.append(new CloseComponentOpcode());
  }

  dynamic({ definitionArgs: rawDefArgs, definition: rawDefinition, args: rawArgs, shadow, templates }: DynamicComponentOptions) {
    let { compiler, env } = this;

    let BEGIN = new LabelOpcode({ label: "BEGIN" });
    let END = new LabelOpcode({ label: "END" });

    let definitionArgs = rawDefArgs.compile(compiler, env);
    let definition = makeFunctionExpression(rawDefinition).compile(compiler, env);
    let args = rawArgs.compile(compiler, env);

    compiler.append(new EnterOpcode({ begin: BEGIN, end: END }));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode({ args: definitionArgs }));
    compiler.append(new PutValueOpcode({ expression: definition }));
    compiler.append(new TestOpcode());
    compiler.append(new JumpUnlessOpcode({ target: END }));
    compiler.append(new PutDynamicComponentDefinitionOpcode({ args }));
    compiler.append(new OpenComponentOpcode({ shadow, templates }));
    compiler.append(new CloseComponentOpcode());
    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}

export class CompileIntoList extends LinkedList<Opcode> implements OpcodeBuilder, StatementCompilationBuffer {
  private env: Environment;
  private symbolTable: SymbolTable;

  public component: ComponentBuilder;

  constructor(env: Environment, symbolTable: SymbolTable) {
    super();
    this.env = env;
    this.symbolTable = symbolTable;

    this.component = new ComponentBuilder(this, env);
  }

  getLocalSymbol(name: InternedString): number {
    return this.symbolTable.getLocal(name);
  }

  hasLocalSymbol(name: InternedString): boolean {
    return typeof this.symbolTable.getLocal(name) === 'number';
  }

  getNamedSymbol(name: InternedString): number {
    return this.symbolTable.getNamed(name);
  }

  hasNamedSymbol(name: InternedString): boolean {
    return typeof this.symbolTable.getNamed(name) === 'number';
  }

  getBlockSymbol(name: InternedString): number {
    return this.symbolTable.getYield(name);
  }

  hasBlockSymbol(name: InternedString): boolean {
    return typeof this.symbolTable.getYield(name) === 'number';
  }

  hasKeyword(name: InternedString): boolean {
    return this.env.hasKeyword(name);
  }

  toOpSeq(): OpSeq {
    return this;
  }
}
