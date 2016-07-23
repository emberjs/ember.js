/**
@module ember
@submodule ember-testing
*/
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
export default function andThen(app, callback) {
  return app.testHelpers.wait(callback(app));
}
