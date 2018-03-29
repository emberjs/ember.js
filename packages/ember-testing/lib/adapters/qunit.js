/* globals QUnit */

import { inspect } from 'ember-utils';
import Adapter from './adapter';
/**
   @module ember
*/
/**
  This class implements the methods defined by TestAdapter for the
  QUnit testing framework.

  @class QUnitAdapter
  @namespace Ember.Test
  @extends TestAdapter
  @public
*/
export default Adapter.extend({
  init() {
    this.doneCallbacks = [];
  },

  asyncStart() {
    if (typeof QUnit.stop === 'function') {
      // very old QUnit version
      QUnit.stop();
    } else {
      this.doneCallbacks.push(QUnit.config.current ? QUnit.config.current.assert.async() : null);
    }
  },
  asyncEnd() {
    // checking for QUnit.stop here (even though we _need_ QUnit.start) because
    // QUnit.start() still exists in QUnit 2.x (it just throws an error when calling
    // inside a test context)
    if (typeof QUnit.stop === 'function') {
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
