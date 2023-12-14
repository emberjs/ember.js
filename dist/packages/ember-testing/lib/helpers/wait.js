/**
@module ember
*/
import { checkWaiters } from '../test/waiters';
import { RSVP } from '@ember/-internals/runtime';
import { _getCurrentRunLoop, _hasScheduledTimers, run } from '@ember/runloop';
import { pendingRequests } from '../test/pending_requests';
import { assert } from '@ember/debug';
import Router from '@ember/routing/router';
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
export default function wait(app, value) {
  return new RSVP.Promise(function (resolve) {
    assert('[BUG] Missing container', app.__container__);
    const router = app.__container__.lookup('router:main');
    assert('[BUG] Expected router:main to be a subclass of Ember Router', router instanceof Router);
    // Every 10ms, poll for the async thing to have finished
    let watcher = setInterval(() => {
      // 1. If the router is loading, keep polling
      let routerIsLoading = router._routerMicrolib && Boolean(router._routerMicrolib.activeTransition);
      if (routerIsLoading) {
        return;
      }
      // 2. If there are pending Ajax requests, keep polling
      if (pendingRequests()) {
        return;
      }
      // 3. If there are scheduled timers or we are inside of a run loop, keep polling
      if (_hasScheduledTimers() || _getCurrentRunLoop()) {
        return;
      }
      if (checkWaiters()) {
        return;
      }
      // Stop polling
      clearInterval(watcher);
      // Synchronously resolve the promise
      run(null, resolve, value);
    }, 10);
  });
}