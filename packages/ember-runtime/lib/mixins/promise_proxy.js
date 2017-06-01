import {
  get,
  run,
  setProperties,
  computed,
  Mixin
} from 'ember-metal';
import { Error as EmberError } from 'ember-debug';
import { not, or } from '../computed/computed_macros';

/**
  @module ember
  @submodule ember-runtime
*/

function tap(proxy, promise) {
  setProperties(proxy, {
    isFulfilled: false,
    isRejected: false
  });

  return promise.then(value => {
    if (!proxy.isDestroyed && !proxy.isDestroying) {
      run(() => {
        setProperties(proxy, {
          content: value,
          isFulfilled: true
        });
      })
    }
    return value;
  }, reason => {
    if (!proxy.isDestroyed && !proxy.isDestroying) {
      run(() => { 
        setProperties(proxy, {
          reason,
          isRejected: true
        });
      });
    }
    throw reason;
  }, 'Ember: PromiseProxy');
}

/**
  A low level mixin making ObjectProxy promise-aware.

  ```javascript
  let ObjectPromiseProxy = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

  let proxy = ObjectPromiseProxy.create({
    promise: Ember.RSVP.cast($.getJSON('/some/remote/data.json'))
  });

  proxy.then(function(json){
     // the json
  }, function(reason) {
     // the reason why you have no json
  });
  ```

  the proxy has bindable attributes which
  track the promises life cycle

  ```javascript
  proxy.get('isPending')   //=> true
  proxy.get('isSettled')  //=> false
  proxy.get('isRejected')  //=> false
  proxy.get('isFulfilled') //=> false
  ```

  When the $.getJSON completes, and the promise is fulfilled
  with json, the life cycle attributes will update accordingly.
  Note that $.getJSON doesn't return an ECMA specified promise,
  it is useful to wrap this with an `RSVP.cast` so that it behaves
  as a spec compliant promise.

  ```javascript
  proxy.get('isPending')   //=> false
  proxy.get('isSettled')   //=> true
  proxy.get('isRejected')  //=> false
  proxy.get('isFulfilled') //=> true
  ```

  As the proxy is an ObjectProxy, and the json now its content,
  all the json properties will be available directly from the proxy.

  ```javascript
  // Assuming the following json:
  {
    firstName: 'Stefan',
    lastName: 'Penner'
  }

  // both properties will accessible on the proxy
  proxy.get('firstName') //=> 'Stefan'
  proxy.get('lastName')  //=> 'Penner'
  ```

  @class Ember.PromiseProxyMixin
  @public
*/
export default Mixin.create({
  /**
    If the proxied promise is rejected this will contain the reason
    provided.

    @property reason
    @default null
    @public
  */
  reason:  null,

  /**
    Once the proxied promise has settled this will become `false`.

    @property isPending
    @default true
    @public
  */
  isPending:  not('isSettled').readOnly(),

  /**
    Once the proxied promise has settled this will become `true`.

    @property isSettled
    @default false
    @public
  */
  isSettled:  or('isRejected', 'isFulfilled').readOnly(),

  /**
    Will become `true` if the proxied promise is rejected.

    @property isRejected
    @default false
    @public
  */
  isRejected:  false,

  /**
    Will become `true` if the proxied promise is fulfilled.

    @property isFulfilled
    @default false
    @public
  */
  isFulfilled: false,

  /**
    The promise whose fulfillment value is being proxied by this object.

    This property must be specified upon creation, and should not be
    changed once created.

    Example:

    ```javascript
    Ember.ObjectProxy.extend(Ember.PromiseProxyMixin).create({
      promise: <thenable>
    });
    ```

    @property promise
    @public
  */
  promise: computed({
    get() {
      throw new EmberError('PromiseProxy\'s promise must be set');
    },
    set(key, promise) {
      return tap(this, promise);
    }
  }),

  /**
    An alias to the proxied promise's `then`.

    See RSVP.Promise.then.

    @method then
    @param {Function} callback
    @return {RSVP.Promise}
    @public
  */
  then: promiseAlias('then'),

  /**
    An alias to the proxied promise's `catch`.

    See RSVP.Promise.catch.

    @method catch
    @param {Function} callback
    @return {RSVP.Promise}
    @since 1.3.0
    @public
  */
  'catch': promiseAlias('catch'),

  /**
    An alias to the proxied promise's `finally`.

    See RSVP.Promise.finally.

    @method finally
    @param {Function} callback
    @return {RSVP.Promise}
    @since 1.3.0
    @public
  */
  'finally': promiseAlias('finally')

});

function promiseAlias(name) {
  return function () {
    let promise = get(this, 'promise');
    return promise[name](...arguments);
  };
}
