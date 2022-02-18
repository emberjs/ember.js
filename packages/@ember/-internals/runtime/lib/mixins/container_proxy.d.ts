import { Container } from '@ember/-internals/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
import { Mixin } from '@ember/-internals/metal';
import { Factory } from '@ember/-internals/owner';

interface ContainerProxy {
  /** @internal */
  __container__: Container;

  ownerInjection(): void;
  lookup(fullName: string, options?: TypeOptions): unknown;
  factoryFor(fullName: string): Factory<unknown> | undefined;
}
declare const ContainerProxy: Mixin;

export default ContainerProxy;
