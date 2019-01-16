import { CompilerDelegate } from '@glimmer/bundle-compiler';
import {
  ComponentCapabilities,
  ComponentDefinition,
  Dict,
  ModuleLocator,
  TemplateMeta,
  Option,
  ComponentManager,
} from '@glimmer/interfaces';
import { WrappedLocator } from '../../components';
import { Modules, ModuleType, Module } from './modules';
import { dict } from '@glimmer/util';
import { TestComponentDefinitionState } from '../../component-definition';

export interface CapabilitiesState {
  capabilities: ComponentCapabilities;
}

export class EagerCompilerRegistry {
  constructor(
    readonly components: Dict<ComponentDefinition<TestComponentDefinitionState>> = dict(),
    readonly modules: Modules = new Modules()
  ) {}

  register(name: string, type: ModuleType, value: Dict<unknown>) {
    this.modules.register(name, type, value);
  }

  addComponent(name: string, manager: ComponentManager, state: TestComponentDefinitionState) {
    this.components[name] = { manager, state };
  }

  resolve(
    name: string,
    referrer: TemplateMeta<WrappedLocator>,
    { expected, root }: { expected?: ModuleType; root?: string } = {}
  ): Option<string> {
    let moduleName = this.modules.resolve(name, referrer, root);
    if (moduleName === null) return null;

    let type = this.modules.type(moduleName);

    if (expected === undefined || type === expected) {
      return moduleName;
    } else {
      return null;
    }
  }

  get(name: string): Module {
    return this.modules.get(name);
  }

  type(name: string): ModuleType {
    return this.modules.type(name);
  }

  getComponentCapabilities(meta: TemplateMeta<WrappedLocator>): ComponentCapabilities {
    return this.components[meta.locator.module].state.capabilities;
  }
}

export default class EagerCompilerDelegate implements CompilerDelegate<WrappedLocator> {
  constructor(private registry: EagerCompilerRegistry) {}

  hasComponentInScope(componentName: string, referrer: TemplateMeta<WrappedLocator>): boolean {
    let name = this.registry.resolve(componentName, referrer, {
      root: 'ui/components',
      expected: 'component',
    });
    return !!name;
  }

  resolveComponent(componentName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    return {
      module: this.registry.resolve(componentName, referrer, { root: 'ui/components' })!,
      name: 'default',
    };
  }

  getComponentCapabilities(meta: TemplateMeta<WrappedLocator>): ComponentCapabilities {
    return this.registry.getComponentCapabilities(meta);
  }

  hasHelperInScope(helperName: string, referrer: TemplateMeta<WrappedLocator>): boolean {
    return !!this.registry.resolve(helperName, referrer, { expected: 'helper' });
  }

  resolveHelper(helperName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    return { module: this.registry.resolve(helperName, referrer)!, name: 'default' };
  }

  hasModifierInScope(modifierName: string, referrer: TemplateMeta<WrappedLocator>): boolean {
    return !!this.registry.resolve(modifierName, referrer, { expected: 'modifier' });
  }

  resolveModifier(modifierName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    return {
      module: this.registry.resolve(modifierName, referrer, { root: 'ui/components' })!,
      name: 'default',
    };
  }

  hasPartialInScope(_partialName: string, _referrer: TemplateMeta<WrappedLocator>): boolean {
    return false;
  }

  resolvePartial(_partialName: string, _referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    throw new Error('Method not implemented.');
  }
}
