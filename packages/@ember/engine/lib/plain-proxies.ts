import type Container from '@ember/-internals/container/lib/container';
import type Registry from '@ember/-internals/container/lib/registry';
import type { FullName } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { join, schedule } from '@ember/runloop';

/**
  The methods of `RegistryProxyMixin` and `ContainerProxyMixin`, as class
  bodies. `Engine` and `EngineInstance` use them in place of the mixins when
  the `EMBER_DROP_CLASSIC_FEATURES` build flag is set.
*/

type Constructor<T = object> = abstract new (...args: any[]) => T;

export function withRegistryProxy<B extends Constructor>(Base: B) {
  abstract class RegistryProxy extends Base {
    declare __registry__: Registry;

    resolveRegistration(fullName: FullName) {
      assert('fullName must be a proper full name', this.__registry__.isValidFullName(fullName));

      return this.__registry__.resolve(fullName);
    }

    register(...args: Parameters<Registry['register']>) {
      return this.__registry__.register(...args);
    }

    unregister(fullName: FullName) {
      return this.__registry__.unregister(fullName);
    }

    hasRegistration(...args: Parameters<Registry['has']>) {
      return this.__registry__.has(...args);
    }

    registeredOption(...args: Parameters<Registry['getOption']>) {
      return this.__registry__.getOption(...args);
    }

    registerOptions(...args: Parameters<Registry['options']>) {
      return this.__registry__.options(...args);
    }

    registeredOptions(...args: Parameters<Registry['getOptions']>) {
      return this.__registry__.getOptions(...args);
    }

    registerOptionsForType(...args: Parameters<Registry['optionsForType']>) {
      return this.__registry__.optionsForType(...args);
    }

    registeredOptionsForType(...args: Parameters<Registry['getOptionsForType']>) {
      return this.__registry__.getOptionsForType(...args);
    }
  }

  return RegistryProxy;
}

export function withContainerProxy<B extends Constructor<{ destroy(): unknown }>>(Base: B) {
  abstract class ContainerProxy extends Base {
    declare __container__: Container;

    ownerInjection() {
      return this.__container__.ownerInjection();
    }

    lookup(...args: Parameters<Container['lookup']>) {
      return this.__container__.lookup(...args);
    }

    factoryFor(...args: Parameters<Container['factoryFor']>) {
      return this.__container__.factoryFor(...args);
    }

    destroy() {
      let container = this.__container__;

      if (container) {
        join(() => {
          container.destroy();
          schedule('destroy', container, 'finalizeDestroy');
        });
      }

      return super.destroy();
    }
  }

  return ContainerProxy;
}
