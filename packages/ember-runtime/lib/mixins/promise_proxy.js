var set = Ember.set, get = Ember.get,
    not = Ember.computed.not,
    or = Ember.computed.or;

/**
  @module ember
  @submodule ember-runtime
 */

function tap(proxy, promise) {
  return promise.then(function(value) {
    set(proxy, 'isFulfilled', true);
    set(proxy, 'content', value);
    return value;
  }, function(reason) {
    set(proxy, 'isRejected', true);
    set(proxy, 'reason', reason);
    throw reason;
  }, "Ember: PromiseProxy");
}

/**
  A low level mixin making ObjectProxy, ObjectController or ArrayController's promise aware.

  ```javascript
  var ObjectPromiseController = Ember.ObjectController.extend(Ember.PromiseProxyMixin);

  var controller = ObjectPromiseController.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  controller.then(function(json){
     // the json
  }, function(reason) {
     // the reason why you have no json
  });
  ```

  the controller has bindable attributes which
  track the promises life cycle

  ```javascript
  controller.get('isPending')   //=> true
  controller.get('isSettled')  //=> false
  controller.get('isRejected')  //=> false
  controller.get('isFulfilled') //=> false
  ```

  When the the $.getJSON completes, and the promise is fulfilled
  with json, the life cycle attributes will update accordingly.

  ```javascript
  controller.get('isPending')   //=> false
  controller.get('isSettled')   //=> true
  controller.get('isRejected')  //=> false
  controller.get('isFulfilled') //=> true
  ```

  As the controller is an ObjectController, and the json now its content,
  all the json properties will be available directly from the controller.

  ```javascript
  // Assuming the following json:
  {
    firstName: 'Stefan',
    lastName: 'Penner'
  }

  // both properties will accessible on the controller
  controller.get('firstName') //=> 'Stefan'
  controller.get('lastName')  //=> 'Penner'
  ```

  If the controller is backing a template, the attributes are
  bindable from within that template

  ```handlebars
  {{#if isPending}}
    loading...
  {{else}}
    firstName: {{firstName}}
    lastName: {{lastName}}
  {{/if}}
  ```
  @class Ember.PromiseProxyMixin
*/
Ember.PromiseProxyMixin = Ember.Mixin.create({
  /**
    If the proxied promise is rejected this will contain the reason
    provided.

    @property reason
    @default null
  */
  reason:    null,

  /**
    Once the proxied promise has settled this will become `false`.

    @property isPending
    @default true
  */
  isPending:  not('isSettled').readOnly(),

  /**
    Once the proxied promise has settled this will become `true`.

    @property isSettled
    @default false
  */
  isSettled:  or('isRejected', 'isFulfilled').readOnly(),

  /**
    Will become `true` if the proxied promise is rejected.

    @property isRejected
    @default false
  */
  isRejected:  false,

  /**
    Will become `true` if the proxied promise is fulfilled.

    @property isFullfilled
    @default false
  */
  isFulfilled: false,

  /**
    The promise whose fulfillment value is being proxied by this object.

    This property must be specified upon creation, and should not be
    changed once created.

    Example:

    ```javascript
    Ember.ObjectController.extend(Ember.PromiseProxyMixin).create({
      promise: <thenable>
    });
    ```

    @property promise
  */
  promise: Ember.computed(function(key, promise) {
    if (arguments.length === 2) {
      return tap(this, promise);
    } else {
      throw new Ember.Error("PromiseProxy's promise must be set");
    }
  }),

  /**
    An alias to the proxied promise's `then`.

    See RSVP.Promise.then.

    @method then
    @param {Function} callback
    @return {RSVP.Promise}
  */
  then: promiseAlias('then'),

  /**
    An alias to the proxied promise's `catch`.

    See RSVP.Promise.catch.

    @method catch
    @param {Function} callback
    @return {RSVP.Promise}
  */
  'catch': promiseAlias('catch'),

  /**
    An alias to the proxied promise's `finally`.

    See RSVP.Promise.finally.

    @method finally
    @param {Function} callback
    @return {RSVP.Promise}
  */
  'finally': promiseAlias('finally')

});

function promiseAlias(name) {
  return function () {
    var promise = get(this, 'promise');
    return promise[name].apply(promise, arguments);
  };
}
