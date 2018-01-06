import { inspect } from 'ember-utils';
import Adapter from './adapter';

/**
  This class implements the methods defined by Ember.Test.Adapter for the
  QUnit testing framework.

  @class QUnitAdapter
  @namespace Ember.Test
  @extends Ember.Test.Adapter
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
    if (typeof QUnit.start === 'function') {
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
