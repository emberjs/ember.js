/**
@module ember
*/

import type { Registry } from '@ember/-internals/container';
import type { RegistryProxy } from '@ember/-internals/owner';
import type { AnyFn } from '@ember/-internals/utility-types';

import { assert } from '@ember/debug';
import Mixin from '@ember/object/mixin';

/**
  RegistryProxyMixin is used to provide public access to specific
  registry functionality.

  @class RegistryProxyMixin
  @extends RegistryProxy
  @private
*/
interface RegistryProxyMixin extends RegistryProxy {
  /** @internal */
  __registry__: Registry;
}
const RegistryProxyMixin = Mixin.create({
  __registry__: null,

  resolveRegistration(fullName: string) {
    assert('fullName must be a proper full name', this.__registry__.isValidFullName(fullName));
    return this.__registry__.resolve(fullName);
  },

  register: registryAlias('register'),
  unregister: registryAlias('unregister'),
  hasRegistration: registryAlias('has'),
  registeredOption: registryAlias('getOption'),
  registerOptions: registryAlias('options'),
  registeredOptions: registryAlias('getOptions'),
  registerOptionsForType: registryAlias('optionsForType'),
  registeredOptionsForType: registryAlias('getOptionsForType'),
});

type AliasMethods =
  | 'register'
  | 'unregister'
  | 'has'
  | 'getOption'
  | 'options'
  | 'getOptions'
  | 'optionsForType'
  | 'getOptionsForType';

function registryAlias<N extends AliasMethods>(name: N) {
  return function (this: RegistryProxyMixin, ...args: Parameters<Registry[N]>) {
    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return (this.__registry__[name] as AnyFn)(...args);
  };
}

export default RegistryProxyMixin;
