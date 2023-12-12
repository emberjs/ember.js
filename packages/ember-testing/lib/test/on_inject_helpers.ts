import type Application from '@ember/application';

export const callbacks: Array<(app: Application) => void> = [];

/**
  Used to register callbacks to be fired whenever `App.injectTestHelpers`
  is called.

  The callback will receive the current application as an argument.

  Example:

  ```javascript
  import $ from 'jquery';

  Ember.Test.onInjectHelpers(function() {
    $(document).ajaxSend(function() {
      Test.pendingRequests++;
    });

    $(document).ajaxComplete(function() {
      Test.pendingRequests--;
    });
  });
  ```

  @public
  @for Ember.Test
  @method onInjectHelpers
  @param {Function} callback The function to be called.
*/
export function onInjectHelpers(callback: (app: Application) => void) {
  callbacks.push(callback);
}

export function invokeInjectHelpersCallbacks(app: Application) {
  for (let callback of callbacks) {
    callback(app);
  }
}
