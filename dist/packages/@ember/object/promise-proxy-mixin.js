import { get, setProperties, computed } from '@ember/object';
import Mixin from '@ember/object/mixin';
/**
  @module @ember/object/promise-proxy-mixin
*/
function tap(proxy, promise) {
  setProperties(proxy, {
    isFulfilled: false,
    isRejected: false
  });
  return promise.then(value => {
    if (!proxy.isDestroyed && !proxy.isDestroying) {
      setProperties(proxy, {
        content: value,
        isFulfilled: true
      });
    }
    return value;
  }, reason => {
    if (!proxy.isDestroyed && !proxy.isDestroying) {
      setProperties(proxy, {
        reason,
        isRejected: true
      });
    }
    throw reason;
  }, 'Ember: PromiseProxy');
}
const PromiseProxyMixin = Mixin.create({
  reason: null,
  isPending: computed('isSettled', function () {
    return !get(this, 'isSettled');
  }).readOnly(),
  isSettled: computed('isRejected', 'isFulfilled', function () {
    return get(this, 'isRejected') || get(this, 'isFulfilled');
  }).readOnly(),
  isRejected: false,
  isFulfilled: false,
  promise: computed({
    get() {
      throw new Error("PromiseProxy's promise must be set");
    },
    set(_key, promise) {
      return tap(this, promise);
    }
  }),
  then: promiseAlias('then'),
  catch: promiseAlias('catch'),
  finally: promiseAlias('finally')
});
function promiseAlias(name) {
  return function (...args) {
    let promise = get(this, 'promise');
    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return promise[name](...args);
  };
}
export default PromiseProxyMixin;