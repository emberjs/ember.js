/**
 @module @ember/test
*/
const contexts = [];
const callbacks = [];
export function registerWaiter(
// Formatting makes a pretty big difference in how readable this is.
// prettier-ignore
...args) {
  let checkedCallback;
  let checkedContext;
  if (args.length === 1) {
    checkedContext = null;
    checkedCallback = args[0];
  } else {
    checkedContext = args[0];
    checkedCallback = args[1];
  }
  if (indexOf(checkedContext, checkedCallback) > -1) {
    return;
  }
  contexts.push(checkedContext);
  callbacks.push(checkedCallback);
}
/**
   `unregisterWaiter` is used to unregister a callback that was
   registered with `registerWaiter`.

   @public
   @for @ember/test
   @static
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
  @for @ember/test
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
    // SAFETY: The loop ensures that this exists
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