import { deprecate } from 'ember-debug';

const contexts = [];
const callbacks = [];

/**
   This allows ember-testing to play nicely with other asynchronous
   events, such as an application that is waiting for a CSS3
   transition or an IndexDB transaction. The waiter runs periodically
   after each async helper (i.e. `click`, `andThen`, `visit`, etc) has executed,
   until the returning result is truthy. After the waiters finish, the next async helper
   is executed and the process repeats.

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

/**
  Iterates through each registered test waiter, and invokes
  its callback. If any waiter returns false, this method will return
  true indicating that the waiters have not settled yet.

  This is generally used internally from the acceptance/integration test
  infrastructure.

  @public
  @for Ember.Test
  @static
  @method checkWaiters
*/
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

export function generateDeprecatedWaitersArray() {
  deprecate(
    'Usage of `Ember.Test.waiters` is deprecated. Please refactor to `Ember.Test.checkWaiters`.',
    false,
    { until: '2.8.0', id: 'ember-testing.test-waiters' }
  );

  let array = new Array(callbacks.length);
  for (let i = 0; i < callbacks.length; i++) {
    let context = contexts[i];
    let callback = callbacks[i];

    array[i] = [context, callback];
  }

  return array;
}
