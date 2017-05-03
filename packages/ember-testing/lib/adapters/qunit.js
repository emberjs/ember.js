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
  done: [],
  asyncStart() {
    this.done.push(QUnit.config.current.assert.async());
  },
  asyncEnd() {
    let current = QUnit.config.current;
    this.done.pop()();

    // If we're done with async and the user hasn't invoked async manually,
    // then set usedAsync to false so that assertions can still happen
    if (this.done.length === 0 && current.semaphore === 0) {
      current.usedAsync = false;
    }
  },
  exception(error) {
    ok(false, inspect(error));
  }
});
