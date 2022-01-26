import { Registry } from '@ember/-internals/container';
import Mixin from '../../types/mixin';

interface RegistryProxyMixin {
  resolveRegistration: Registry['resolve'];
  register: Registry['register'];
  unregister: Registry['unregister'];
  hasRegistration: Registry['has'];
  registeredOption: Registry['getOption'];
  registerOptions: Registry['options'];
  registeredOptions: Registry['getOptions'];
  registerOptionsForType: Registry['optionsForType'];
  registeredOptionsForType: Registry['getOptionsForType'];
}
declare const RegistryProxyMixin: Mixin;

export default RegistryProxyMixin;
