import { CompilerDelegate } from '@glimmer/bundle-compiler';
import {
  ComponentCapabilities,
  ComponentDefinition,
  ComponentManager,
  Dict,
  ModuleLocator,
  Option,
  TemplateMeta,
} from '@glimmer/interfaces';
import { assert, dict } from '@glimmer/util';
import { WrappedLocator, TestComponentDefinitionState } from '../../components/test-component';

export class Modules {
  private registry = dict<Module>();

  has(name: string): boolean {
    return name in this.registry;
  }

  get(name: string): Module {
    return this.registry[name];
  }

  type(name: string): ModuleType {
    let module = this.registry[name];
    return module.type;
  }

  register(name: string, type: ModuleType, value: Dict<unknown>) {
    assert(name.indexOf('ui/components/ui') === -1, `BUG: ui/components/ui shouldn't be a prefix`);
    assert(!name.match(/^[A-Z]/), 'BUG: Components should be nested under ui/components');
    this.registry[name] = new Module(value, type);
  }

  resolve(
    name: string,
    referrer: TemplateMeta<WrappedLocator>,
    defaultRoot?: string
  ): Option<string> {
    let local =
      referrer &&
      referrer.locator.module &&
      referrer.locator.module.replace(/^((.*)\/)?([^\/]*)$/, `$1${name}`);
    if (local && this.registry[local]) {
      return local;
    } else if (defaultRoot && this.registry[`${defaultRoot}/${name}`]) {
      return `${defaultRoot}/${name}`;
    } else if (this.registry[name]) {
      return name;
    } else {
      return null;
    }
  }
}

export type ModuleType = 'component' | 'helper' | 'modifier' | 'partial' | 'other';

export class Module {
  constructor(private dict: Dict, public type: ModuleType) {
    Object.freeze(this.dict);
  }

  has(key: string) {
    return key in this.dict;
  }

  get(key: string): unknown {
    return this.dict[key];
  }
}

export interface CapabilitiesState {
  capabilities: ComponentCapabilities;
}

export class AotCompilerRegistry {
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
  constructor(private registry: AotCompilerRegistry) {}

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
