import { unreachable } from '@glimmer/util';
import Environment, { Helper } from './environment';
import { SymbolTable } from '@glimmer/interfaces';
import { CompiledDynamicProgram, CompiledDynamicTemplate } from './compiled/blocks';
import { Maybe, Option } from '@glimmer/util';
import { Ops, TemplateMeta } from '@glimmer/wire-format';

import { Template } from './template';
import { debugSlice } from './opcodes';

import { ATTRS_BLOCK, ClientSide, compileStatement, Program, ScannedProgram } from './scanner';

import {
  ComponentBuilder as IComponentBuilder,
  StaticDefinition,
  ComponentArgs
} from './opcode-builder';

import {
  InvokeDynamicLayout,
  expr,
  compileComponentArgs
} from './syntax/functions';

import OpcodeBuilderDSL from './compiled/opcodes/builder';

import * as Component from './component/interfaces';

import * as WireFormat from '@glimmer/wire-format';

type WireTemplate = WireFormat.SerializedTemplate<WireFormat.TemplateMeta>;

export interface CompilableLayout {
  compile(builder: Component.ComponentLayoutBuilder): void;
}

export function compileLayout(compilable: CompilableLayout, env: Environment): CompiledDynamicProgram {
  let builder = new ComponentLayoutBuilder(env);

  compilable.compile(builder);

  return builder.compile();
}

interface InnerLayoutBuilder {
  tag: Component.ComponentTagBuilder;
  attrs: Component.ComponentAttrsBuilder;
  compile(): CompiledDynamicProgram;
}

class ComponentLayoutBuilder implements Component.ComponentLayoutBuilder {
  private inner: InnerLayoutBuilder;

  constructor(public env: Environment) {}

  wrapLayout(layout: Template<TemplateMeta>) {
    this.inner = new WrappedBuilder(this.env, layout);
  }

  fromLayout(layout: Template<TemplateMeta>) {
    this.inner = new UnwrappedBuilder(this.env, layout);
  }

  compile(): CompiledDynamicProgram {
    return this.inner.compile();
  }

  get tag(): Component.ComponentTagBuilder {
    return this.inner.tag;
  }

  get attrs(): Component.ComponentAttrsBuilder {
    return this.inner.attrs;
  }
}

class WrappedBuilder implements InnerLayoutBuilder {
  public tag = new ComponentTagBuilder();
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Template<TemplateMeta>) {}

  compile(): CompiledDynamicProgram {
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

    let { env, layout, layout: { meta } } = this;

    let dynamicTag = this.tag.getDynamic();
    let staticTag = this.tag.getStatic();

    let b = builder(env, meta);
    b.startLabels();

    // let state = b.local();
    // b.setLocal(state);

    let tag = 0;

    if (dynamicTag) {
      tag = b.local();

      expr(dynamicTag, b);
      b.setLocal(tag);

      b.getLocal(tag);
      b.test('simple');

      b.jumpUnless('BODY');

      b.pushComponentOperations();
      b.getLocal(tag);
      b.openDynamicElement();
    } else if (staticTag) {
      b.pushComponentOperations();
      b.openElementWithOperations(staticTag);
    }

    if (dynamicTag || staticTag) {
      // b.didCreateElement(state);

      let attrs = this.attrs['buffer'];

      for (let i=0; i<attrs.length; i++) {
        compileStatement(attrs[i], b);
      }

      b.flushElement();
    }

    b.label('BODY');
    b.invokeStatic(layout.asEntryPoint());

    if (dynamicTag) {
      b.getLocal(tag);

      b.test('simple');
      b.jumpUnless('END');

      b.closeElement();
    } else if (staticTag) {
      b.closeElement();
    }

    b.label('END');

    // b.didRenderLayout(state);

    b.stopLabels();

    let start = b.start;
    let end = b.finalize();

    debugSlice(env, start, end);

    return new CompiledDynamicTemplate(start, end, {
      meta: layout.meta,
      symbols: layout.symbols.concat([ATTRS_BLOCK])
    });

    // let { env, layout: { meta, block, block: { named, yields, hasPartials } } } = this;

    // let statements;
    // if (block.prelude && block.head) {
    //   statements = block.prelude.concat(block.head).concat(block.statements);
    // } else {
    //   statements = block.statements;
    // }

    // let dynamicTag = this.tag.getDynamic();

    // if (dynamicTag) {
    //   let element: WireFormat.Statement[] = [
    //     [Ops.Block, ['with'], [dynamicTag], null, {
    //       locals: ['tag'],
    //       statements: [
    //         [Ops.ClientSideStatement, ClientSide.Ops.OpenDynamicElement, [Ops.FixThisBeforeWeMerge, ['tag']]],
    //         [Ops.Yield, '%attrs%', EMPTY_ARRAY],
    //         ...this.attrs['buffer'],
    //         [Ops.FlushElement]
    //       ]
    //     }, null],
    //     ...statements,
    //     [Ops.Block, ['if'], [dynamicTag], null, {
    //       locals: EMPTY_ARRAY,
    //       statements: [
    //         [Ops.CloseElement]
    //       ]
    //     }, null]
    //   ];

    //   let table = layoutTable(meta, named, yields.concat('%attrs%'), hasPartials);
    //   let child = scanBlock(element, table, env);
    //   return new RawTemplate(child.statements, table);
    // }

    // let staticTag = this.tag.getStatic()!;
    // let prelude: [ClientSide.OpenComponentElement] = [[Ops.ClientSideStatement, ClientSide.Ops.OpenComponentElement, staticTag]];

    // let head = this.attrs['buffer'];

    // let scanner = new Scanner({ ...block, prelude, head }, meta, env);
    // return scanner.scanLayout();
  }
}

class UnwrappedBuilder implements InnerLayoutBuilder {
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Template<TemplateMeta>) {}

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): CompiledDynamicProgram {
    let { env, layout, layout: { meta } } = this;
    return layout.asLayout(this.attrs['buffer']).compileDynamic(env);
  }
}

class ComponentTagBuilder implements Component.ComponentTagBuilder {
  public isDynamic: Option<boolean> = null;
  public isStatic: Option<boolean> = null;
  public staticTagName: Option<string> = null;
  public dynamicTagName: Option<WireFormat.Expression> = null;

  getDynamic(): Maybe<WireFormat.Expression> {
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
    this.dynamicTagName = [Ops.ClientSideExpression, ClientSide.Ops.FunctionExpression, tagName];
  }
}

class ComponentAttrsBuilder implements Component.ComponentAttrsBuilder {
  private buffer: WireFormat.Statements.Attribute[] = [];

  static(name: string, value: string) {
    this.buffer.push([Ops.StaticAttr, name, value, null]);
  }

  dynamic(name: string, value: FunctionExpression<string>) {
    this.buffer.push([Ops.DynamicAttr, name, [Ops.ClientSideExpression, ClientSide.Ops.FunctionExpression, value], null]);
  }
}

export class ComponentBuilder implements IComponentBuilder {
  private env: Environment;

  constructor(private builder: OpcodeBuilderDSL) {
    this.env = builder.env;
  }

  static(definition: StaticDefinition, args: ComponentArgs) {
    let [params, hash, _default, inverse] = args;

    let syntax: ClientSide.ResolvedComponent = [
      Ops.ClientSideStatement,
      ClientSide.Ops.ResolvedComponent,
      definition,
      null,
      [params, hash],
      _default,
      inverse
    ];

    compileStatement(syntax, this.builder);
  }

  dynamic(definitionArgs: ComponentArgs, getDefinition: Helper, args: ComponentArgs) {
    this.builder.unit(b => {
      let [, hash, block, inverse] = args;

      if (!definitionArgs || definitionArgs.length === 0) {
        throw new Error("Dynamic syntax without an argument");
      }

      let definition = b.local();
      let state = b.local();
      expr([Ops.ClientSideExpression, ClientSide.Ops.ResolvedHelper, getDefinition, definitionArgs[0], definitionArgs[1]], b);

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

export function builder(env: Environment, meta: TemplateMeta) {
  return new OpcodeBuilderDSL(env, meta);
}
