import { Registry } from '@ember/-internals/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
import { Factory } from '@ember/-internals/owner';
import Mixin from '../../types/mixin';

interface RegistryProxyMixin {
  /** @internal */
  __registry__: Registry;
  resolveRegistration<T, C>(fullName: string): Factory<T, C> | undefined;
  register(fullName: string, factory: Factory<unknown>, options?: TypeOptions): void;
  unregister(fullName: string): void;
  hasRegistration(fullName: string): boolean;
  registeredOption<K extends keyof TypeOptions>(
    fullName: string,
    optionName: K
  ): TypeOptions[K] | undefined;
  registerOptions(fullName: string, options: TypeOptions): void;
  registeredOptions(fullName: string): TypeOptions | undefined;
  registerOptionsForType(type: string, options: TypeOptions): void;
  registeredOptionsForType(type: string): TypeOptions | undefined;
}
declare const RegistryProxyMixin: Mixin;

export default RegistryProxyMixin;
