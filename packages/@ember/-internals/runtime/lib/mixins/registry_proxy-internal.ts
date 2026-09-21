/**
@module ember
*/

import type Registry from '@ember/-internals/container/lib/registry';
import type { AnyFn } from '@ember/-internals/utility-types';

import { assert } from '@ember/debug';
import { InternalMixin } from '@ember/object/mixin-internal';

/**
  The internal counterpart to the public `RegistryProxyMixin`. Ember's own
  internals apply this so that they do not trigger the deprecation that the
  public mixin emits. The public API documentation lives on the public copy.

  @internal
*/
const InternalRegistryProxyMixin = InternalMixin.create({
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
  return function (this: { __registry__: Registry }, ...args: Parameters<Registry[N]>) {
    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return (this.__registry__[name] as AnyFn)(...args);
  };
}

export default InternalRegistryProxyMixin;
