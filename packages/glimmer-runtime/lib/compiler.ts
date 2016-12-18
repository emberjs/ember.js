import { EMPTY_SYMBOL_TABLE } from './symbol-table';
import { Opaque, Slice, LinkedList, Option, Maybe } from 'glimmer-util';
import { OpSeq, Opcode } from './opcodes';

import { EMPTY_ARRAY } from './utils';
import { Environment } from './environment';
import { SymbolTable, ProgramSymbolTable } from 'glimmer-interfaces';
import { CompiledBlock, CompiledProgram } from './compiled/blocks';

import {
  BaselineSyntax,
  Layout,
  InlineBlock,
  compileStatement
} from './scanner';

import {
  ComponentBuilder as IComponentBuilder,
  DynamicDefinition,
  StaticDefinition
} from './opcode-builder';

import {
  Statement as StatementSyntax,
  Attribute as AttributeSyntax,
  Expression
} from './syntax';

import {
  compileArgs
} from './syntax/functions';

import {
  FunctionExpression,
  default as makeFunctionExpression
} from './compiled/expressions/function';

import OpcodeBuilderDSL from './compiled/opcodes/builder';

import * as Component from './component/interfaces';

import * as WireFormat from 'glimmer-wire-format';

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
      this.attrs['buffer'].forEach(statement => compileStatement(statement, dsl));
      dsl.flushElement();
      dsl.label('BODY');
    } else if (staticTag = this.tag.getStatic()) {
      let tag = this.tag.staticTagName;
      dsl.openPrimitiveElement(staticTag);
      dsl.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(statement, dsl));
      dsl.flushElement();
    }

    dsl.preludeForLayout(layout);

    layout.statements.forEach(statement => compileStatement(statement, dsl));

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

function isOpenElement(value: BaselineSyntax.AnyStatement): value is (BaselineSyntax.OpenPrimitiveElement | WireFormat.Statements.OpenElement) {
  let type = value[0];
  return type === 'open-element' || type === 'open-primitive-element';
}

class UnwrappedBuilder {
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Layout) {}

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): CompiledProgram {
    let { env, layout } = this;

    let b = builder(env, layout.symbolTable);

    b.startLabels();

    b.preludeForLayout(layout);

    let attrs = this.attrs['buffer'];
    let attrsInserted = false;

    this.layout.statements.forEach(statement => {
      if (!attrsInserted && isOpenElement(statement)) {
        b.openComponentElement(statement[1]);
        b.didCreateElement();
        b.shadowAttributes();
        attrs.forEach(statement => compileStatement(statement, b));
        attrsInserted = true;
      } else {
        compileStatement(statement, b);
      }
    });

    b.didRenderLayout();
    b.stopLabels();

    return new CompiledProgram(b.toOpSeq(), layout.symbolTable.size);
  }
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
  private buffer: WireFormat.Statements.Attribute[] = [];

  static(name: string, value: string) {
    this.buffer.push(['static-attr', name, value, null]);
  }

  dynamic(name: string, value: FunctionExpression<string>) {
    this.buffer.push(['dynamic-attr', name, ['function', value], null]);
  }
}

class ComponentBuilder implements IComponentBuilder {
  private env: Environment;

  constructor(private builder: OpcodeBuilderDSL) {
    this.env = builder.env;
  }

  static(definition: StaticDefinition, args: WireFormat.Core.Args, symbolTable: SymbolTable, shadow: ReadonlyArray<string> = EMPTY_ARRAY) {
    this.builder.unit(b => {
      b.putComponentDefinition(definition);
      b.openComponent(compileArgs(args[0], args[1], b), shadow);
      b.closeComponent();
    });
  }

  dynamic(definitionArgs: WireFormat.Core.Args, definition: DynamicDefinition, args: WireFormat.Core.Args, symbolTable: SymbolTable, shadow: ReadonlyArray<string> = EMPTY_ARRAY) {
    this.builder.unit(b => {
      b.putArgs(compileArgs(definitionArgs[0], definitionArgs[1], b));
      b.putValue(makeFunctionExpression(definition));
      b.test('simple');
      b.enter('BEGIN', 'END');
      b.label('BEGIN');
      b.jumpUnless('END');
      b.putDynamicComponentDefinition();
      b.openComponent(compileArgs(args[0], args[1], b), shadow);
      b.closeComponent();
      b.label('END');
      b.exit();
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