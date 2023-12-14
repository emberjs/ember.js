declare module 'ember-testing/lib/helpers/wait' {
  import type Application from '@ember/application';
  /**
      Causes the run loop to process any pending events. This is used to ensure that
      any async operations from other helpers (or your assertions) have been processed.

      This is most often used as the return value for the helper functions (see 'click',
      'fillIn','visit',etc). However, there is a method to register a test helper which
      utilizes this method without the need to actually call `wait()` in your helpers.

      The `wait` helper is built into `registerAsyncHelper` by default. You will not need
      to `return app.testHelpers.wait();` - the wait behavior is provided for you.

      Example:

      ```javascript
      import { registerAsyncHelper } from '@ember/test';

      registerAsyncHelper('loginUser', function(app, username, password) {
        visit('secured/path/here')
          .fillIn('#username', username)
          .fillIn('#password', password)
          .click('.submit');
      });
      ```

      @method wait
      @param {Object} value The value to be returned.
      @return {RSVP.Promise<any>} Promise that resolves to the passed value.
      @public
      @since 1.0.0
    */
  export default function wait<T>(app: Application, value: T): Promise<T>;
}
