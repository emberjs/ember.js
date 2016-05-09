const contexts = [];
const callbacks = [];

/**
   This allows ember-testing to play nicely with other asynchronous
   events, such as an application that is waiting for a CSS3
   transition or an IndexDB transaction.

   For example:

   ```javascript
   Ember.Test.registerWaiter(function() {
     return myPendingTransactions() == 0;
   });
   ```
   The `context` argument allows you to optionally specify the `this`
   with which your callback will be invoked.

   For example:

   ```javascript
   Ember.Test.registerWaiter(MyDB, MyDB.hasPendingTransactions);
   ```

   @public
   @for Ember.Test
   @method registerWaiter
   @param {Object} context (optional)
   @param {Function} callback
   @since 1.2.0
*/
export function registerWaiter(context, callback) {
  if (arguments.length === 1) {
    callback = context;
    context = null;
  }
  if (indexOf(context, callback) > -1) {
    return;
  }
  contexts.push(context);
  callbacks.push(callback);
}

/**
   `unregisterWaiter` is used to unregister a callback that was
   registered with `registerWaiter`.

   @public
   @for Ember.Test
   @method unregisterWaiter
   @param {Object} context (optional)
   @param {Function} callback
   @since 1.2.0
*/
export function unregisterWaiter(context, callback) {
  if (!callbacks.length) {
    return;
  }
  if (arguments.length === 1) {
    callback = context;
    context = null;
  }
  let i = indexOf(context, callback);
  if (i === -1) {
    return;
  }
  contexts.splice(i, 1);
  callbacks.splice(i, 1);
}

export function checkWaiters() {
  if (!callbacks.length) {
    return false;
  }
  for (let i = 0; i < callbacks.length; i++) {
    let context = contexts[i];
    let callback = callbacks[i];
    if (!callback.call(context)) {
      return true;
    }
  }
  return false;
}

function indexOf(context, callback) {
  for (let i = 0; i < callbacks.length; i++) {
    if (callbacks[i] === callback && contexts[i] === context) {
      return i;
    }
  }
  return -1;
}
