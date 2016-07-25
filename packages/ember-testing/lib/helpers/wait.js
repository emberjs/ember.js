/**
@module ember
@submodule ember-testing
*/
import { checkWaiters } from '../test/waiters';
import RSVP from 'ember-runtime/ext/rsvp';
import run from 'ember-metal/run_loop';
import { pendingRequests } from '../test/pending_requests';
/**
  Causes the run loop to process any pending events. This is used to ensure that
  any async operations from other helpers (or your assertions) have been processed.
  This is most often used as the return value for the helper functions (see 'click',
  'fillIn','visit',etc).
  Example:
  ```javascript
  Ember.Test.registerAsyncHelper('loginUser', function(app, username, password) {
    visit('secured/path/here')
    .fillIn('#username', username)
    .fillIn('#password', password)
    .click('.submit')
    return app.testHelpers.wait();
  });
  @method wait
  @param {Object} value The value to be returned.
  @return {RSVP.Promise}
  @public
*/
export default function wait(app, value) {
  return new RSVP.Promise(function(resolve) {
    let router = app.__container__.lookup('router:main');

    // Every 10ms, poll for the async thing to have finished
    let watcher = setInterval(() => {
      // 1. If the router is loading, keep polling
      let routerIsLoading = router.router && !!router.router.activeTransition;
      if (routerIsLoading) { return; }

      // 2. If there are pending Ajax requests, keep polling
      if (pendingRequests()) { return; }

      // 3. If there are scheduled timers or we are inside of a run loop, keep polling
      if (run.hasScheduledTimers() || run.currentRunLoop) { return; }

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
