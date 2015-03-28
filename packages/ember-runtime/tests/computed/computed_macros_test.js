import {
  empty,
  notEmpty
} from "ember-metal/computed_macros";
import EmberObject from "ember-runtime/system/object";
import { testBoth } from "ember-metal/tests/props_helper";

QUnit.module('CP macros');

testBoth('Ember.computed.empty', function (get, set) {
  var obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterUnspecified: empty('bestLannister'),
    noLannistersKnown: empty('lannisters')
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

testBoth('Ember.computed.notEmpty', function(get, set) {
  var obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterSpecified: notEmpty('bestLannister'),
    LannistersKnown: notEmpty('lannisters')
  }).create({
    lannisters: Ember.A([])
  });

  equal(get(obj, 'bestLannisterSpecified'), false, "bestLannister initially empty");
  equal(get(obj, 'LannistersKnown'), false, "lannisters initially empty");

  get(obj, 'lannisters').pushObject('Tyrion');
  set(obj, 'bestLannister', 'Tyrion');

  equal(get(obj, 'bestLannisterSpecified'), true, "empty respects strings");
  equal(get(obj, 'LannistersKnown'), true, "empty respects array mutations");
});
