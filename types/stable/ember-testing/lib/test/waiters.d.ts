declare module 'ember-testing/lib/test/waiters' {
  /**
       This allows ember-testing to play nicely with other asynchronous
       events, such as an application that is waiting for a CSS3
       transition or an IndexDB transaction. The waiter runs periodically
       after each async helper (i.e. `click`, `andThen`, `visit`, etc) has executed,
       until the returning result is truthy. After the waiters finish, the next async helper
       is executed and the process repeats.

       For example:

       ```javascript
       import { registerWaiter } from '@ember/test';

       registerWaiter(function() {
         return myPendingTransactions() === 0;
       });
       ```
       The `context` argument allows you to optionally specify the `this`
       with which your callback will be invoked.

       For example:

       ```javascript
       import { registerWaiter } from '@ember/test';

       registerWaiter(MyDB, MyDB.hasPendingTransactions);
       ```

       @public
       @for @ember/test
       @static
       @method registerWaiter
       @param {Object} context (optional)
       @param {Function} callback
       @since 1.2.0
    */
  export function registerWaiter<T>(context: T, callback: (this: T) => unknown): void;
  export function registerWaiter(callback: (this: null) => unknown): void;
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
  export function unregisterWaiter(context: unknown, callback: unknown): void;
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
  export function checkWaiters(): boolean;
}
