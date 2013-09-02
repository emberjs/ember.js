var set = Ember.set, get = Ember.get,
    resolve = Ember.RSVP.resolve,
    rethrow = Ember.RSVP.rethrow,
    not = Ember.computed.not,
    or = Ember.computed.or;

/**
  @module ember
  @submodule ember-runtime
 */

function installPromise(proxy, promise) {
  promise.then(function(value) {
    set(proxy, 'isFulfilled', true);
    set(proxy, 'content', value);

    return value;
  }, function(reason) {
    set(proxy, 'isRejected', true);
    set(proxy, 'reason', reason);
  }).fail(rethrow);
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
  reason:    null,
  isPending:  not('isSettled').readOnly(),
  isSettled:  or('isRejected', 'isFulfilled').readOnly(),
  isRejected:  false,
  isFulfilled: false,

  promise: Ember.computed(function(key, promise) {
    if (arguments.length === 2) {
      promise = resolve(promise);
      installPromise(this, promise);
      return promise;
    } else {
      throw new Error("PromiseProxy's promise must be set");
    }
  }),

  then: function(fulfill, reject) {
    return get(this, 'promise').then(fulfill, reject);
  }
});

