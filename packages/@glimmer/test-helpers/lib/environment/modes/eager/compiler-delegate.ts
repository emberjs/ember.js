import { CompilerDelegate } from '@glimmer/bundle-compiler';
import { Dict } from '@glimmer/util';
import { ComponentCapabilities, ModuleLocator } from '@glimmer/interfaces';

import { Modules } from './modules';
import { ComponentDefinition } from '@glimmer/runtime';
import { TestComponentDefinitionState } from '@glimmer/test-helpers';

import { Locator } from '../../components';

export type ComponentDefinitionWithCapabilities = ComponentDefinition<TestComponentDefinitionState>;

export default class EagerCompilerDelegate implements CompilerDelegate<Locator> {
  constructor(
    private components: Dict<ComponentDefinitionWithCapabilities>,
    private modules: Modules
  ) {}

  hasComponentInScope(componentName: string, referrer: Locator): boolean {
    let name = this.modules.resolve(componentName, referrer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponent(componentName: string, referrer: Locator): ModuleLocator {
    return {
      module: this.modules.resolve(componentName, referrer, 'ui/components')!,
      name: 'default',
    };
  }

  getComponentCapabilities(meta: Locator): ComponentCapabilities {
    return this.components[meta.locator.module].state.capabilities;
  }

  hasHelperInScope(helperName: string, referrer: Locator): boolean {
    let name = this.modules.resolve(helperName, referrer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelper(helperName: string, referrer: Locator): ModuleLocator {
    let path = this.modules.resolve(helperName, referrer);
    return { module: path!, name: 'default' };
  }

  hasModifierInScope(modifierName: string, _referrer: Locator): boolean {
    let modifier = this.modules.get(modifierName);
    return modifier !== undefined && modifier.type === 'modifier';
  }

  resolveModifier(modifierName: string, referrer: Locator): ModuleLocator {
    return {
      module: this.modules.resolve(modifierName, referrer, 'ui/components')!,
      name: 'default',
    };
  }

  hasPartialInScope(_partialName: string, _referrer: Locator): boolean {
    return false;
  }

  resolvePartial(_partialName: string, _referrer: Locator): ModuleLocator {
    throw new Error('Method not implemented.');
  }
}
