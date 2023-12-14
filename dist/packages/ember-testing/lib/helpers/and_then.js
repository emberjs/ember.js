import { assert } from '@ember/debug';
export default function andThen(app, callback) {
  let wait = app.testHelpers['wait'];
  assert('[BUG] Missing wait helper', wait);
  return wait(callback(app));
}