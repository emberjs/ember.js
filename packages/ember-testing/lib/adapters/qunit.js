import Adapter from "ember-testing/adapters/adapter";
import { inspect } from "ember-metal/utils";

/**
  This class implements the methods defined by Ember.Test.Adapter for the
  QUnit testing framework.

  @class QUnitAdapter
  @namespace Ember.Test
  @extends Ember.Test.Adapter
*/
export default Adapter.extend({
  asyncStart: function() {
    QUnit.stop();
  },
  asyncEnd: function() {
    QUnit.start();
  },
  exception: function(error) {
    ok(false, inspect(error));
  }
});
