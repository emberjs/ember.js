declare module 'ember-testing/lib/helpers/pause_test' {
  /// <reference types="rsvp" />
  /**
    @module ember
    */
  import { RSVP } from '@ember/-internals/runtime';
  /**
     Resumes a test paused by `pauseTest`.

     @method resumeTest
     @return {void}
     @public
    */
  export function resumeTest(): void;
  /**
     Pauses the current test - this is useful for debugging while testing or for test-driving.
     It allows you to inspect the state of your application at any point.
     Example (The test will pause before clicking the button):

     ```javascript
     visit('/')
     return pauseTest();
     click('.btn');
     ```

     You may want to turn off the timeout before pausing.

     qunit (timeout available to use as of 2.4.0):

     ```
     visit('/');
     assert.timeout(0);
     return pauseTest();
     click('.btn');
     ```

     mocha (timeout happens automatically as of ember-mocha v0.14.0):

     ```
     visit('/');
     this.timeout(0);
     return pauseTest();
     click('.btn');
     ```


     @since 1.9.0
     @method pauseTest
     @return {Object} A promise that will never resolve
     @public
    */
  export function pauseTest(): RSVP.default.Promise<unknown>;
}
