import { Mixin } from '@ember/-internals/metal';

interface PromiseProxyMixin<T> {
  reason: unknown;

  readonly isPending: boolean;

  readonly isSettled: boolean;

  isRejected: boolean;

  isFulfilled: boolean;

  promise: Promise<T>;

  then: this['promise']['then'];

  catch: this['promise']['catch'];

  finally: this['promise']['finally'];
}
declare const PromiseProxyMixin: Mixin;

export default PromiseProxyMixin;
