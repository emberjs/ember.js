require('ember-runtime/system/object');

/**
@module ember
@submodule ember-old-router
*/

var get = Ember.get, set = Ember.set;

Ember._PromiseChain = Ember.Object.extend({
  promises: null,
  failureCallback: Ember.K,
  successCallback: Ember.K,
  abortCallback: Ember.K,
  promiseSuccessCallback: Ember.K,

  runNextPromise: function() {
    if (get(this, 'isDestroyed')) { return; }

    var item = get(this, 'promises').shiftObject();
    if (item) {
      var promise = get(item, 'promise') || item;
      Ember.assert("Cannot find promise to invoke", Ember.canInvoke(promise, 'then'));

      var self = this;

      var successCallback = function() {
        self.promiseSuccessCallback.call(this, item, arguments);
        self.runNextPromise();
      };

      var failureCallback = get(self, 'failureCallback');

      promise.then(successCallback, failureCallback);
     } else {
      this.successCallback();
    }
  },

  start: function() {
    this.runNextPromise();
    return this;
  },

  abort: function() {
    this.abortCallback();
    this.destroy();
  },

  init: function() {
    set(this, 'promises', Ember.A(get(this, 'promises')));
    this._super();
  }
});

