import { Owner } from '@ember/-internals/owner';
import {
  CompileTimeComponent,
  CompileTimeResolver,
  ComponentCapabilities,
  ComponentDefinition,
  ComponentManager,
  Option,
  WithStaticLayout,
} from '@glimmer/interfaces';
import RuntimeResolver from './resolver';

interface StaticComponentManager
  extends WithStaticLayout<unknown, unknown, RuntimeResolver>,
    ComponentManager<unknown, unknown> {}

function isStaticComponentManager(
  _manager: ComponentManager,
  capabilities: ComponentCapabilities
): _manager is StaticComponentManager {
  return !capabilities.dynamicLayout;
}

export default class CompileTimeResolverImpl implements CompileTimeResolver<Owner> {
  constructor(private resolver: RuntimeResolver) {}

  lookupHelper(name: string, owner: Owner): Option<number> {
    return this.resolver.lookupHelper(name, owner);
  }

  lookupModifier(name: string, owner: Owner): Option<number> {
    return this.resolver.lookupModifier(name, owner);
  }

  lookupComponent(name: string, owner: Owner): Option<CompileTimeComponent> {
    let definitionHandle = this.resolver.lookupComponentHandle(name, owner);

    if (definitionHandle === null) {
      return null;
    }

    const { manager, state } = this.resolver.resolve<ComponentDefinition<unknown, unknown>>(
      definitionHandle
    );
    const capabilities = manager.getCapabilities(state);

    if (!isStaticComponentManager(manager, capabilities)) {
      return {
        handle: definitionHandle,
        capabilities,
        compilable: null,
      };
    }

    return {
      handle: definitionHandle,
      capabilities,
      compilable: manager.getStaticLayout(state),
    };
  }

  lookupPartial(name: string, owner: Owner): Option<number> {
    return this.resolver.lookupPartial(name, owner);
  }

  resolve(): null {
    return null;
  }
}
