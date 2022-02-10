import { Container } from '@ember/-internals/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
import { Factory } from '@ember/-internals/owner';
import Mixin from '../../types/mixin';

interface ContainerProxy {
  /** @internal */
  __container__: Container;

  ownerInjection(): void;
  lookup(fullName: string, options?: TypeOptions): unknown;
  factoryFor(fullName: string): Factory<unknown> | undefined;
}
declare const ContainerProxy: Mixin;

export default ContainerProxy;
