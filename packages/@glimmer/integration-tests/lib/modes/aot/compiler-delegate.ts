import { CompilerDelegate } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ModuleLocator, TemplateMeta } from '@glimmer/interfaces';
import { WrappedLocator } from '../../components/test-component';
import { AotCompilerRegistry } from './registry';

export interface CapabilitiesState {
  capabilities: ComponentCapabilities;
}

export default class AotCompilerDelegate implements CompilerDelegate<WrappedLocator> {
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
