import { CompilerDelegate } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ModuleLocator } from '@glimmer/interfaces';
import { WrappedLocator } from '../../components/test-component';
import { AotCompilerRegistry } from './registry';

export interface CapabilitiesState {
  capabilities: ComponentCapabilities;
}

export default class AotCompilerDelegate implements CompilerDelegate<WrappedLocator> {
  constructor(private registry: AotCompilerRegistry) {}

  hasComponentInScope(componentName: string, referrer: WrappedLocator): boolean {
    let name = this.registry.resolve(componentName, referrer, {
      root: 'ui/components',
      expected: 'component',
    });
    return !!name;
  }

  resolveComponent(componentName: string, referrer: WrappedLocator): ModuleLocator {
    return {
      module: this.registry.resolve(componentName, referrer, { root: 'ui/components' })!,
      name: 'default',
    };
  }

  getComponentCapabilities(meta: WrappedLocator): ComponentCapabilities {
    return this.registry.getComponentCapabilities(meta);
  }

  hasHelperInScope(helperName: string, referrer: WrappedLocator): boolean {
    return !!this.registry.resolve(helperName, referrer, { expected: 'helper' });
  }

  resolveHelper(helperName: string, referrer: WrappedLocator): ModuleLocator {
    return { module: this.registry.resolve(helperName, referrer)!, name: 'default' };
  }

  hasModifierInScope(modifierName: string, referrer: WrappedLocator): boolean {
    return !!this.registry.resolve(modifierName, referrer, { expected: 'modifier' });
  }

  resolveModifier(modifierName: string, referrer: WrappedLocator): ModuleLocator {
    return {
      module: this.registry.resolve(modifierName, referrer, { root: 'ui/components' })!,
      name: 'default',
    };
  }

  hasPartialInScope(_partialName: string, _referrer: WrappedLocator): boolean {
    return false;
  }

  resolvePartial(_partialName: string, _referrer: WrappedLocator): ModuleLocator {
    throw new Error('Method not implemented.');
  }
}
