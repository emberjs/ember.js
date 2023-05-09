import { setComponentTemplate, setInternalComponentManager } from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
import { templateOnlyComponent } from '@glimmer/runtime';

import basicComponentManager from './benchmark/basic-component-manager';
import createRegistry from './benchmark/create-registry';
import onModifier from './benchmark/on-modifier';
import { type Benchmark } from './interfaces';

export default function createBenchmark(): Benchmark {
  const registry = createRegistry();
  registry.registerModifier('on', {}, onModifier);
  return {
    templateOnlyComponent: (name, template) => {
      let definition = templateOnlyComponent();
      setComponentTemplate(templateFactory(template), definition);

      registry.registerComponent(name, definition);
    },
    basicComponent: (name, template, component) => {
      setComponentTemplate(templateFactory(template), component);
      setInternalComponentManager(basicComponentManager, component);

      registry.registerComponent(name, component);
    },
    render: registry.render,
  };
}
