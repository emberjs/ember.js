/**
@module ember
@submodule ember-testing
*/
export default function andThen(app, callback) {
  return app.testHelpers.wait(callback(app));
}
