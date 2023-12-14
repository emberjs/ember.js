/* globals QUnit */
import { inspect } from '@ember/debug';
import Adapter from './adapter';
function isVeryOldQunit(obj) {
  return obj != null && typeof obj.stop === 'function';
}
const QUnitAdapter = Adapter.extend({
  init() {
    this.doneCallbacks = [];
  },
  asyncStart() {
    if (isVeryOldQunit(QUnit)) {
      // very old QUnit version
      // eslint-disable-next-line qunit/no-qunit-stop
      QUnit.stop();
    } else {
      this.doneCallbacks.push(QUnit.config.current ? QUnit.config.current.assert.async() : null);
    }
  },
  asyncEnd() {
    // checking for QUnit.stop here (even though we _need_ QUnit.start) because
    // QUnit.start() still exists in QUnit 2.x (it just throws an error when calling
    // inside a test context)
    if (isVeryOldQunit(QUnit)) {
      QUnit.start();
    } else {
      let done = this.doneCallbacks.pop();
      // This can be null if asyncStart() was called outside of a test
      if (done) {
        done();
      }
    }
  },
  exception(error) {
    QUnit.config.current.assert.ok(false, inspect(error));
  }
});
export default QUnitAdapter;