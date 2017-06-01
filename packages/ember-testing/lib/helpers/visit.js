/**
@module ember
@submodule ember-testing
*/
import { run } from 'ember-metal';

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
  let router = app.__container__.lookup('router:main');
  let shouldHandleURL = false;

  app.boot().then(() => {
    router.location.setURL(url);

    if (shouldHandleURL) {
      run(app.__deprecatedInstance__, 'handleURL', url);
    }
  });

  if (app._readinessDeferrals > 0) {
    router['initialURL'] = url;
    run(app, 'advanceReadiness');
    delete router['initialURL'];
  } else {
    shouldHandleURL = true;
  }

  return app.testHelpers.wait();
}
