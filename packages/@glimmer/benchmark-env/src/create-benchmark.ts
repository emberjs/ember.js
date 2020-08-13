import { TEMPLATE_ONLY_COMPONENT } from '@glimmer/runtime';
import { Benchmark } from './interfaces';
import createRegistry from './benchmark/create-registry';
import onModifier from './benchmark/on-modifier';
import ifHelper from './benchmark/if-helper';
import basicComponentManager from './benchmark/basic-component-manager';

export default function createBenchmark(): Benchmark {
  const registry = createRegistry();
  registry.registerModifier('on', null, onModifier);
  registry.registerHelper('if', ifHelper);
  return {
    templateOnlyComponent: (name, template) => {
      registry.registerComponent(name, template, null, TEMPLATE_ONLY_COMPONENT.manager);
    },
    basicComponent: (name, template, component) => {
      registry.registerComponent(name, template, component, basicComponentManager);
    },
    compile: entry => registry.compile(entry),
  };
}
