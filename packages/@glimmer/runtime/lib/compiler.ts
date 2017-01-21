import { Environment } from './environment';
import { SymbolTable } from '@glimmer/interfaces';
import { CompiledProgram } from './compiled/blocks';
import { Maybe, Option } from '@glimmer/util';
import { Ops } from '@glimmer/wire-format';

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
  compileArgs,
  compileBaselineArgs
} from './syntax/functions';

import {
  FunctionExpression
} from './compiled/expressions/function';

import OpcodeBuilderDSL from './compiled/opcodes/builder';

import * as Component from './component/interfaces';

import * as WireFormat from '@glimmer/wire-format';

export interface CompilableLayout {
  compile(builder: Component.ComponentLayoutBuilder): void;
}

export function compileLayout(compilable: CompilableLayout, env: Environment): CompiledProgram {
  let builder = new ComponentLayoutBuilder(env);

  compilable.compile(builder);

  return builder.compile();
}

class ComponentLayoutBuilder implements Component.ComponentLayoutBuilder {
  private inner: WrappedBuilder | UnwrappedBuilder;

  constructor(public env: Environment) {}

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
    let b = builder(env, layout.symbolTable);

    b.startLabels();

    let dynamicTag = this.tag.getDynamic();
    let staticTag: Maybe<string>;

    if (dynamicTag) {
      b.putValue(dynamicTag);
      b.test('simple');
      b.jumpUnless('BODY');
      b.openDynamicPrimitiveElement();
      b.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(statement, b));
      b.flushElement();
      b.label('BODY');
    } else if (staticTag = this.tag.getStatic()) {
      b.openPrimitiveElement(staticTag);
      b.didCreateElement();
      this.attrs['buffer'].forEach(statement => compileStatement(statement, b));
      b.flushElement();
    }

    b.preludeForLayout(layout);

    layout.statements.forEach(statement => compileStatement(statement, b));

    if (dynamicTag) {
      b.putValue(dynamicTag);
      b.test('simple');
      b.jumpUnless('END');
      b.closeElement();
      b.label('END');
    } else if (staticTag) {
      b.closeElement();
    }

    b.didRenderLayout();
    b.stopLabels();

    return new CompiledProgram(b.start, b.end, symbolTable.size);
  }
}

function isOpenElement(value: BaselineSyntax.AnyStatement): value is (BaselineSyntax.OpenPrimitiveElement | WireFormat.Statements.OpenElement) {
  let type = value[0];
  return type === Ops.OpenElement || type === Ops.OpenPrimitiveElement;
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

    for (let i = 0; i < layout.statements.length; i++) {
      let statement = layout.statements[i];
      if (!attrsInserted && isOpenElement(statement)) {
        b.openComponentElement(statement[1]);
        b.didCreateElement();
        b.shadowAttributes();
        attrs.forEach(statement => compileStatement(statement, b));
        attrsInserted = true;
      } else {
        compileStatement(statement, b);
      }
    }

    b.didRenderLayout();
    b.stopLabels();

    return new CompiledProgram(b.start, b.end, layout.symbolTable.size);
  }
}

class ComponentTagBuilder implements Component.ComponentTagBuilder {
  public isDynamic: Option<boolean> = null;
  public isStatic: Option<boolean> = null;
  public staticTagName: Option<string> = null;
  public dynamicTagName: Option<BaselineSyntax.AnyExpression> = null;

  getDynamic(): Maybe<BaselineSyntax.AnyExpression> {
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
    this.dynamicTagName = [Ops.Function, tagName];
  }
}

class ComponentAttrsBuilder implements Component.ComponentAttrsBuilder {
  private buffer: WireFormat.Statements.Attribute[] = [];

  static(name: string, value: string) {
    this.buffer.push([Ops.StaticAttr, name, value, null]);
  }

  dynamic(name: string, value: FunctionExpression<string>) {
    this.buffer.push([Ops.DynamicAttr, name, [Ops.Function, value], null]);
  }
}

export class ComponentBuilder implements IComponentBuilder {
  private env: Environment;

  constructor(private builder: OpcodeBuilderDSL) {
    this.env = builder.env;
  }

  static(definition: StaticDefinition, args: BaselineSyntax.Args, _symbolTable: SymbolTable, shadow: InlineBlock) {
    this.builder.unit(b => {
      b.putComponentDefinition(definition);
      b.openComponent(compileBaselineArgs(args, b), shadow);
      b.closeComponent();
    });
  }

  dynamic(definitionArgs: BaselineSyntax.Args, definition: DynamicDefinition, args: BaselineSyntax.Args, _symbolTable: SymbolTable, shadow: InlineBlock) {
    this.builder.unit(b => {
      b.putArgs(compileArgs(definitionArgs[0], definitionArgs[1], b));
      b.putValue([Ops.Function, definition]);
      b.test('simple');
      b.enter('BEGIN', 'END');
      b.label('BEGIN');
      b.jumpUnless('END');
      b.putDynamicComponentDefinition();
      b.openComponent(compileBaselineArgs(args, b), shadow);
      b.closeComponent();
      b.label('END');
      b.exit();
    });
  }
}

export function builder<S extends SymbolTable>(env: Environment, symbolTable: S) {
  return new OpcodeBuilderDSL(symbolTable, env);
}
