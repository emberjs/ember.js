import TestPromise from './promise';

export const helpers = {};
/**
 @module @ember/test
*/

/**
  `registerHelper` is used to register a test helper that will be injected
  when `App.injectTestHelpers` is called.

  The helper method will always be called with the current Application as
  the first parameter.

  For example:

  ```javascript
  Ember.Test.registerHelper('boot', function(app) {
    Ember.run(app, app.advanceReadiness);
  });
  ```

  This helper can later be called without arguments because it will be
  called with `app` as the first parameter.

  ```javascript
  App = Ember.Application.create();
  App.injectTestHelpers();
  boot();
  ```

  @public
  @for @ember/test
  @static
  @method registerHelper
  @param {String} name The name of the helper method to add.
  @param {Function} helperMethod
  @param options {Object}
*/
export function registerHelper(name, helperMethod) {
  helpers[name] = {
    method: helperMethod,
    meta: { wait: false }
  };
}

/**
  `registerAsyncHelper` is used to register an async test helper that will be injected
  when `App.injectTestHelpers` is called.

  The helper method will always be called with the current Application as
  the first parameter.

  For example:

  ```javascript
  Ember.Test.registerAsyncHelper('boot', function(app) {
    Ember.run(app, app.advanceReadiness);
  });
  ```

  The advantage of an async helper is that it will not run
  until the last async helper has completed.  All async helpers
  after it will wait for it complete before running.


  For example:

  ```javascript
  Ember.Test.registerAsyncHelper('deletePost', function(app, postId) {
    click('.delete-' + postId);
  });

  // ... in your test
  visit('/post/2');
  deletePost(2);
  visit('/post/3');
  deletePost(3);
  ```

  @public
  @for @ember/test
  @method registerAsyncHelper
  @param {String} name The name of the helper method to add.
  @param {Function} helperMethod
  @since 1.2.0
*/
export function registerAsyncHelper(name, helperMethod) {
  helpers[name] = {
    method: helperMethod,
    meta: { wait: true }
  };
}

/**
  Remove a previously added helper method.

  Example:

  ```javascript
  Ember.Test.unregisterHelper('wait');
  ```

  @public
  @method unregisterHelper
  @static
  @for @ember/test
  @param {String} name The helper to remove.
*/
export function unregisterHelper(name) {
  delete helpers[name];
  delete TestPromise.prototype[name];
}
