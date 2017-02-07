import Environment, { Helper } from './environment';
import { SymbolTable } from '@glimmer/interfaces';
import { CompiledProgram } from './compiled/blocks';
import { Maybe, Option } from '@glimmer/util';
import { Ops } from '@glimmer/wire-format';

import {
  EMPTY_ARRAY
} from './utils';

import Scanner, {
  BaselineSyntax,
  Layout,
  EntryPoint,
  InlineBlock,
  compileStatement,
  scanBlock
} from './scanner';

import {
  ComponentBuilder as IComponentBuilder,
  StaticDefinition
} from './opcode-builder';

import {
  FunctionExpression
} from './compiled/expressions/function';

import {
  InvokeDynamicLayout,
  expr,
  compileComponentArgs
} from './syntax/functions';

import {
  layout as layoutTable
} from './symbol-table';

import OpcodeBuilderDSL from './compiled/opcodes/builder';

import * as Component from './component/interfaces';

import * as WireFormat from '@glimmer/wire-format';

type WireTemplate = WireFormat.SerializedTemplate<WireFormat.TemplateMeta>;

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

  wrapLayout(layout: WireTemplate) {
    this.inner = new WrappedBuilder(this.env, layout);
  }

  fromLayout(layout: WireTemplate) {
    this.inner = new UnwrappedBuilder(this.env, layout);
  }

  compile(): Layout {
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

  constructor(public env: Environment, private layout: WireTemplate) {}

  compile(): Layout {
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

    let { env, layout: { meta, block, block: { named, yields, hasPartials } } } = this;

    let statements;
    if (block.prelude && block.head) {
      statements = block.prelude.concat(block.head).concat(block.statements);
    } else {
      statements = block.statements;
    }

    let dynamicTag = this.tag.getDynamic();

    if (dynamicTag) {
      let element: BaselineSyntax.AnyStatement[] = [
        [Ops.BaselineBlock, ['with'], [dynamicTag], null, {
          locals: ['tag'],
          statements: [
            [Ops.OpenDynamicElement, [Ops.Get, ['tag']]],
            [Ops.Yield, '%attrs%', EMPTY_ARRAY],
            ...this.attrs['buffer'],
            [Ops.FlushElement]
          ]
        }, null],
        ...statements,
        [Ops.BaselineBlock, ['if'], [dynamicTag], null, {
          locals: EMPTY_ARRAY,
          statements: [
            [Ops.CloseElement]
          ]
        }, null]
      ];

      let table = layoutTable(meta, named, yields.concat('%attrs%'), hasPartials);
      let child = scanBlock(element, table, env);
      return new EntryPoint(child.statements, table);
    }

    let staticTag = this.tag.getStatic()!;
    let prelude: [BaselineSyntax.OpenComponentElement] = [[Ops.OpenComponentElement, staticTag]];

    let head = this.attrs['buffer'];

    let scanner = new Scanner({ ...block, prelude, head }, meta, env);
    return scanner.scanLayout();
  }
}

function isOpenElement(value: BaselineSyntax.AnyStatement): value is (BaselineSyntax.OpenPrimitiveElement | WireFormat.Statements.OpenElement) {
  let type = value[0];
  return type === Ops.OpenElement || type === Ops.OpenPrimitiveElement;
}

class UnwrappedBuilder {
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: WireTemplate) {}

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): Layout {
    let { env, layout: { meta, block } } = this;

    let head = block.head ? this.attrs['buffer'].concat(block.head) : this.attrs['buffer'];

    let scanner = new Scanner({ ...block, head }, meta, env);
    return scanner.scanLayout();
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
  private buffer: WireFormat.Statements.ElementHead[] = [];

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

  static(definition: StaticDefinition, args: BaselineSyntax.Args, _symbolTable: SymbolTable) {
    let [params, hash, _default, inverse] = args;

    let syntax: BaselineSyntax.ResolvedComponent = [
      Ops.ResolvedComponent,
      definition,
      null,
      [params, hash],
      _default,
      inverse
    ];

    compileStatement(syntax, this.builder);
  }

  dynamic(definitionArgs: BaselineSyntax.Args, getDefinition: Helper, args: BaselineSyntax.Args, _symbolTable: SymbolTable, shadow: InlineBlock) {
    this.builder.unit(b => {
      let [, hash, block, inverse] = args;

      if (!definitionArgs || definitionArgs.length === 0) {
        throw new Error("Dynamic syntax without an argument");
      }

      let definition = b.local();
      let state = b.local();
      expr([Ops.ResolvedHelper, getDefinition, definitionArgs[0], definitionArgs[1]], b);

      b.setLocal(definition);
      b.getLocal(definition);
      b.test('simple');

      b.labelled(b => {
        b.jumpUnless('END');

        b.pushDynamicComponentManager(definition);
        b.setComponentState(state);

        b.pushBlock(block);
        b.pushBlock(inverse);
        let { slots, count, names } = compileComponentArgs(hash, b);

        b.pushDynamicScope();
        b.pushComponentArgs(0, count, slots);
        b.createComponent(state, true, false);
        b.registerComponentDestructor(state);
        b.beginComponentTransaction();

        b.getComponentSelf(state);
        b.getComponentLayout(state);
        b.invokeDynamic(new InvokeDynamicLayout(null, names));
        b.didCreateElement(state);

        b.didRenderLayout(state);
        b.popScope();
        b.popDynamicScope();
        b.commitComponentTransaction();
      });
    });
  }
}

export function builder<S extends SymbolTable>(env: Environment, symbolTable: S) {
  return new OpcodeBuilderDSL(symbolTable, env);
}
