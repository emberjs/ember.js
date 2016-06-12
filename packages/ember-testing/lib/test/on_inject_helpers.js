export const callbacks = [];

/**
  Used to register callbacks to be fired whenever `App.injectTestHelpers`
  is called.

  The callback will receive the current application as an argument.

  Example:

  ```javascript
  Ember.Test.onInjectHelpers(function() {
    Ember.$(document).ajaxSend(function() {
      Test.pendingRequests++;
    });

    Ember.$(document).ajaxComplete(function() {
      Test.pendingRequests--;
    });
  });
  ```

  @public
  @for Ember.Test
  @method onInjectHelpers
  @param {Function} callback The function to be called.
*/
export function onInjectHelpers(callback) {
  callbacks.push(callback);
}

export function invokeInjectHelpersCallbacks(app) {
  for (let i = 0; i < callbacks.length; i++) {
    callbacks[i](app);
  }
}
