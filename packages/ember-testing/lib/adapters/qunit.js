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
  asyncStart() {
    QUnit.stop();
  },
  asyncEnd() {
    QUnit.start();
  },
  exception(error) {
    QUnit.config.current.assert.ok(false, inspect(error));
  }
});
