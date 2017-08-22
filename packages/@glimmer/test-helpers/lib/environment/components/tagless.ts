import { createTemplate, GenericComponentDefinition } from '../shared';
import { BasicComponentManager, BasicComponentDefinition, BasicComponentFactory, BasicComponent } from './basic';
import { TestResolver } from '../lazy-env';
import { WrappedBuilder, ComponentCapabilities } from "@glimmer/opcode-compiler";

export class StaticTaglessComponentManager extends BasicComponentManager {
  getLayout(definition: BasicComponentDefinition, resolver: TestResolver): number {
    let { name, capabilities } = definition;

    let handle = resolver.lookup('template-source', name)!;

    return resolver.compileTemplate(handle, name, (source, options) => {
      let template = createTemplate(source, {});
      let compileOptions = { ...options, asPartial: false, referer: null };
      return new WrappedBuilder(compileOptions, template, capabilities);
    });
  }
}

export const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export class StaticTaglessComponentDefinition extends GenericComponentDefinition<BasicComponent> {
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
