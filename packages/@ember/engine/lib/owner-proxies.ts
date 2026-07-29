import type Container from '@ember/-internals/container/lib/container';
import type Registry from '@ember/-internals/container/lib/registry';
import type { FullName, InternalFactory, RegisterOptions } from '@ember/-internals/owner';
import { assert } from '@ember/debug';

interface HasRegistry {
  /** @internal */
  __registry__: Registry;
}

interface HasContainer {
  /** @internal */
  __container__: Container;
}

/*
  Implementations of the `RegistryProxy` and `ContainerProxy` interfaces,
  assigned onto the prototypes of `Engine` and `EngineInstance` (which merge
  the corresponding interface declarations for their public types). Plain
  method bags rather than Mixins, so the proxied owner API does not depend on
  the classic object model.
*/

export const registryProxyMethods = {
  resolveRegistration(this: HasRegistry, fullName: FullName) {
    assert('fullName must be a proper full name', this.__registry__.isValidFullName(fullName));
    return this.__registry__.resolve(fullName);
  },

  register(this: HasRegistry, fullName: FullName, factory: object, options?: RegisterOptions) {
    return this.__registry__.register(fullName, factory as InternalFactory<object>, options);
  },

  unregister(this: HasRegistry, fullName: FullName) {
    return this.__registry__.unregister(fullName);
  },

  hasRegistration(this: HasRegistry, fullName: FullName) {
    return this.__registry__.has(fullName);
  },

  registeredOption(this: HasRegistry, fullName: FullName, optionName: keyof RegisterOptions) {
    return this.__registry__.getOption(fullName, optionName);
  },

  registerOptions(this: HasRegistry, fullName: FullName, options: RegisterOptions) {
    return this.__registry__.options(fullName, options);
  },

  registeredOptions(this: HasRegistry, fullName: FullName) {
    return this.__registry__.getOptions(fullName);
  },

  registerOptionsForType(this: HasRegistry, type: string, options: RegisterOptions) {
    return this.__registry__.optionsForType(type, options);
  },

  registeredOptionsForType(this: HasRegistry, type: string) {
    return this.__registry__.getOptionsForType(type);
  },
};

export const containerProxyMethods = {
  ownerInjection(this: HasContainer) {
    return this.__container__.ownerInjection();
  },

  lookup(this: HasContainer, fullName: FullName, options?: RegisterOptions) {
    return this.__container__.lookup(fullName, options);
  },

  factoryFor(this: HasContainer, fullName: FullName) {
    return this.__container__.factoryFor(fullName);
  },
};
