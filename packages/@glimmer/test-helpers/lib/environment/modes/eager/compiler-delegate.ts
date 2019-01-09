import { CompilerDelegate } from '@glimmer/bundle-compiler';
import {
  ComponentCapabilities,
  ComponentDefinition,
  Dict,
  ModuleLocator,
  TemplateMeta,
} from '@glimmer/interfaces';
import { WrappedLocator } from '../../components';
import { Modules } from './modules';

interface CapabilitiesState {
  capabilities: ComponentCapabilities;
}

export default class EagerCompilerDelegate implements CompilerDelegate<WrappedLocator> {
  constructor(
    private components: Dict<ComponentDefinition<CapabilitiesState>>,
    private modules: Modules
  ) {}

  hasComponentInScope(componentName: string, referrer: TemplateMeta<WrappedLocator>): boolean {
    let name = this.modules.resolve(componentName, referrer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponent(componentName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    return {
      module: this.modules.resolve(componentName, referrer, 'ui/components')!,
      name: 'default',
    };
  }

  getComponentCapabilities(meta: TemplateMeta<WrappedLocator>): ComponentCapabilities {
    return this.components[meta.locator.module].state.capabilities;
  }

  hasHelperInScope(helperName: string, referrer: TemplateMeta<WrappedLocator>): boolean {
    let name = this.modules.resolve(helperName, referrer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelper(helperName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    let path = this.modules.resolve(helperName, referrer);
    return { module: path!, name: 'default' };
  }

  hasModifierInScope(modifierName: string, _referrer: TemplateMeta<WrappedLocator>): boolean {
    let modifier = this.modules.get(modifierName);
    return modifier !== undefined && modifier.type === 'modifier';
  }

  resolveModifier(modifierName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator {
    return {
      module: this.modules.resolve(modifierName, referrer, 'ui/components')!,
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
