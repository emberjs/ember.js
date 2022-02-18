import Container, { FactoryManager } from '@ember/-internals/container/lib/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
import { Mixin } from '@ember/-internals/metal';
import { Factory } from '@ember/-internals/owner';

export interface IContainer {
  ownerInjection(): void;
  lookup(fullName: string, options?: TypeOptions): Factory<object> | object | undefined;
  factoryFor(fullName: string): FactoryManager<object> | undefined;
}

interface ContainerProxyMixin extends IContainer {
  /** @internal */
  __container__: Container;
}
declare const ContainerProxyMixin: Mixin;

export default ContainerProxyMixin;
