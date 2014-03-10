import Adapter from "ember-testing/adapters/adapter";

/**
  This class implements the methods defined by Ember.Test.Adapter for the
  QUnit testing framework.

  @class QUnitAdapter
  @namespace Ember.Test
  @extends Ember.Test.Adapter
*/
var QUnitAdapter = Adapter.extend({
  asyncStart: function() {
    stop();
  },
  asyncEnd: function() {
    start();
  },
  exception: function(error) {
    ok(false, inspect(error));
  }
});

export default QUnitAdapter;
