import {generateGuid} from "ember-metal/utils";

module("Ember.generateGuid");

test("Prefix", function() {
  var a = {};

  ok( generateGuid(a, 'tyrell').indexOf('tyrell') > -1, "guid can be prefixed" );
});
