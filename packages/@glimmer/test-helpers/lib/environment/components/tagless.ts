import { createTemplate, GenericStaticComponentState } from '../shared';
import { BasicComponentManager, BasicStaticComponentState, BasicComponentFactory } from './basic';
import { TestResolver } from '../lazy-env';
import { WrappedBuilder, ComponentCapabilities } from "@glimmer/opcode-compiler";
import { Invocation } from "@glimmer/runtime";
import { assign } from "@glimmer/util";

export class StaticTaglessComponentManager extends BasicComponentManager {
  getLayout(definition: BasicStaticComponentState, resolver: TestResolver): Invocation {
    let { name, capabilities } = definition;

    let handle = resolver.lookup('template-source', name)!;

    return resolver.compileTemplate(handle, name, (source, options) => {
      let template = createTemplate(source, {});
      let compileOptions = assign({}, options, { asPartial: false, referrer: null });
      let builder = new WrappedBuilder(compileOptions, template, capabilities);

      return {
        handle: builder.compile(),
        symbolTable: builder.symbolTable
      };
    });
  }
}

export const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export class StaticTaglessComponentDefinition extends GenericStaticComponentState {
  public ComponentClass: BasicComponentFactory;
  public capabilities: ComponentCapabilities = {
    staticDefinitions: false,
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: false,
    elementHook: false
  };
}
