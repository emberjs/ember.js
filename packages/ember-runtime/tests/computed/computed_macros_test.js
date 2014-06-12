import {computed} from "ember-metal/computed";
import EmberObject from "ember-runtime/system/object";
import {testBoth} from "ember-runtime/tests/props_helper";

QUnit.module('CP macros');

testBoth('Ember.computed.empty', function (get, set) {
  var obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterUnspecified: computed.empty('bestLannister'),
    noLannistersKnown: computed.empty('lannisters')
  }).create({
    lannisters: Ember.A([])
  });

  equal(get(obj, 'bestLannisterUnspecified'), true, "bestLannister initially empty");
  equal(get(obj, 'noLannistersKnown'), true, "lannisters initially empty");

  get(obj, 'lannisters').pushObject('Tyrion');
  set(obj, 'bestLannister', 'Tyrion');

  equal(get(obj, 'bestLannisterUnspecified'), false, "empty respects strings");
  equal(get(obj, 'noLannistersKnown'), false, "empty respects array mutations");
});
