import { get } from 'ember-metal/property_get';
import setProperties from 'ember-metal/set_properties';
import { computed } from 'ember-metal/computed';
import { Mixin } from 'ember-metal/mixin';
import EmberError from 'ember-metal/error';

var not = computed.not;
var or = computed.or;

/**
  @module ember
  @submodule ember-runtime
*/

function tap(proxy, promise) {
  setProperties(proxy, {
    isFulfilled: false,
    isRejected: false
  });

  return promise.then(function(value) {
    setProperties(proxy, {
      content: value,
      isFulfilled: true
    });
    return value;
  }, function(reason) {
    setProperties(proxy, {
      reason: reason,
      isRejected: true
    });
    throw reason;
  }, 'Ember: PromiseProxy');
}

/**
  A low level mixin making ObjectProxy promise-aware.

  ```javascript
  var ObjectPromiseProxy = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

  var proxy = ObjectPromiseProxy.create({
    promise: $.getJSON('/some/remote/data.json')
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

  When the the $.getJSON completes, and the promise is fulfilled
  with json, the life cycle attributes will update accordingly.

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
    If the proxied promise is resolved, this will contain the resolved
    result.

    @property content
    @default null
    @public
  */
  content:  null,

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
    var promise = get(this, 'promise');
    return promise[name](...arguments);
  };
}
