import { checkWaiters } from '../test/waiters';
import RSVP from 'ember-runtime/ext/rsvp';
import run from 'ember-metal/run_loop';
import { pendingRequests } from '../test/pending_requests';

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
