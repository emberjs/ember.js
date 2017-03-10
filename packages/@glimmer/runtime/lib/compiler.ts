import { Opaque, CompilationMeta } from '@glimmer/interfaces';
import Environment from './environment';
import { CompiledDynamicProgram, CompiledDynamicTemplate } from './compiled/blocks';
import { Maybe, Option } from '@glimmer/util';
import { Ops, TemplateMeta } from '@glimmer/wire-format';

import { Template } from './template';
import { debugSlice } from './opcodes';

import { ATTRS_BLOCK, ClientSide, compileStatement } from './scanner';

import {
  ComponentArgs,
  ComponentBuilder as IComponentBuilder,
  DynamicComponentDefinition
} from './opcode-builder';

import { expr } from './syntax/functions';

import OpcodeBuilderDSL from './compiled/opcodes/builder';

import * as Component from './component/interfaces';

import * as WireFormat from '@glimmer/wire-format';

import { PublicVM } from './vm/append';
import { IArguments } from './vm/arguments';
import { FunctionExpression } from "./compiled/opcodes/expressions";

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

    let { env, layout } = this;
    let meta = { templateMeta: layout.meta, symbols: layout.symbols, asPartial: false };

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
    b.invokeStatic(layout.asBlock());

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
      meta,
      hasEval: layout.hasEval,
      symbols: layout.symbols.concat([ATTRS_BLOCK])
    });
  }
}

class UnwrappedBuilder implements InnerLayoutBuilder {
  public attrs = new ComponentAttrsBuilder();

  constructor(public env: Environment, private layout: Template<TemplateMeta>) {}

  get tag(): Component.ComponentTagBuilder {
    throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
  }

  compile(): CompiledDynamicProgram {
    let { env, layout } = this;
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

  static(definition: Component.ComponentDefinition<Opaque>, args: ComponentArgs) {
    let [params, hash, _default, inverse] = args;
    let { builder } = this;

    builder.pushComponentManager(definition);
    builder.invokeComponent(null, params, hash, _default, inverse);
  }

  dynamic(definitionArgs: ComponentArgs, getDefinition: DynamicComponentDefinition, args: ComponentArgs) {
    this.builder.unit(b => {
      let [params, hash, block, inverse] = args;

      if (!definitionArgs || definitionArgs.length === 0) {
        throw new Error("Dynamic syntax without an argument");
      }

      let meta = this.builder.meta.templateMeta;

      function helper(vm: PublicVM, args: IArguments) {
        return getDefinition(vm, args, meta);
      }

      let definition = b.local();
      b.compileArgs(definitionArgs[0], definitionArgs[1], true);
      b.helper(helper);

      b.setLocal(definition);
      b.getLocal(definition);
      b.test('simple');

      b.labelled(b => {
        b.jumpUnless('END');

        b.pushDynamicComponentManager(definition);
        b.invokeComponent(null, params, hash, block, inverse);
      });
    });
  }
}

export function builder(env: Environment, meta: CompilationMeta) {
  return new OpcodeBuilderDSL(env, meta);
}
