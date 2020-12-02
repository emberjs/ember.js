import { TemplateOnlyComponentManager } from '@glimmer/runtime';
import { getComponentTemplate, setComponentTemplate } from '@glimmer/manager';
import { Benchmark } from './interfaces';
import createRegistry from './benchmark/create-registry';
import onModifier from './benchmark/on-modifier';
import ifHelper from './benchmark/if-helper';
import basicComponentManager from './benchmark/basic-component-manager';
import { templateFactory } from '@glimmer/opcode-compiler';

class TemplateOnlyComponentManagerWithGetComponentTemplate extends TemplateOnlyComponentManager {
  getStaticLayout(definition: object) {
    return getComponentTemplate(definition)!();
  }
}

const TEMPLATE_ONLY_COMPONENT_MANAGER = new TemplateOnlyComponentManagerWithGetComponentTemplate();

export default function createBenchmark(): Benchmark {
  const registry = createRegistry();
  registry.registerModifier('on', null, onModifier);
  registry.registerHelper('if', ifHelper);
  return {
    templateOnlyComponent: (name, template) => {
      let definition = {};
      setComponentTemplate(templateFactory(template), definition);

      registry.registerComponent(name, null, TEMPLATE_ONLY_COMPONENT_MANAGER);
    },
    basicComponent: (name, template, component) => {
      setComponentTemplate(templateFactory(template), component);

      registry.registerComponent(name, component, basicComponentManager);
    },
    render: registry.render,
  };
}
