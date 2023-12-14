/**
@module ember
*/
import { assert } from '@ember/debug';
import Mixin from '@ember/object/mixin';
const RegistryProxyMixin = Mixin.create({
  __registry__: null,
  resolveRegistration(fullName) {
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
  registeredOptionsForType: registryAlias('getOptionsForType')
});
function registryAlias(name) {
  return function (...args) {
    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return this.__registry__[name](...args);
  };
}
export default RegistryProxyMixin;