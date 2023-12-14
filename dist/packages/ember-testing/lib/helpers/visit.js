import { assert } from '@ember/debug';
import Router from '@ember/routing/router';
import { run } from '@ember/runloop';
/**
  Loads a route, sets up any controllers, and renders any templates associated
  with the route as though a real user had triggered the route change while
  using your app.

  Example:

  ```javascript
  visit('posts/index').then(function() {
    // assert something
  });
  ```

  @method visit
  @param {String} url the name of the route
  @return {RSVP.Promise<undefined>}
  @public
*/
export default function visit(app, url) {
  assert('[BUG] Missing container', app.__container__);
  const router = app.__container__.lookup('router:main');
  assert('[BUG] router:main is not a Router', router instanceof Router);
  let shouldHandleURL = false;
  app.boot().then(() => {
    assert('[BUG] router.location is still a string', typeof router.location !== 'string');
    router.location.setURL(url);
    if (shouldHandleURL) {
      assert("[BUG] __deprecatedInstance__ isn't set", app.__deprecatedInstance__);
      run(app.__deprecatedInstance__, 'handleURL', url);
    }
  });
  if (app._readinessDeferrals > 0) {
    // SAFETY: This should be safe, though it is odd.
    router.initialURL = url;
    run(app, 'advanceReadiness');
    delete router.initialURL;
  } else {
    shouldHandleURL = true;
  }
  let wait = app.testHelpers['wait'];
  assert('[BUG] missing wait helper', wait);
  return wait();
}