import run from "ember-metal/run_loop";
import {computed} from "ember-metal/computed";
import EmberObject from "ember-runtime/system/object";

QUnit.module('system/object/subclasses');

QUnit.test('chains should copy forward to subclasses when prototype created', function () {
  var ObjectWithChains, objWithChains, SubWithChains, SubSub, subSub;
  run(function () {
    ObjectWithChains = EmberObject.extend({
      obj: {
        a: 'a',
        hi: 'hi'
      },
      aBinding: 'obj.a' // add chain
    });
    // realize prototype
    objWithChains = ObjectWithChains.create();
    // should not copy chains from parent yet
    SubWithChains = ObjectWithChains.extend({
      hiBinding: 'obj.hi', // add chain
      hello: computed(function() {
        return this.get('obj.hi') + ' world';
      }).property('hi'), // observe chain
      greetingBinding: 'hello'
    });
    SubSub = SubWithChains.extend();
    // should realize prototypes and copy forward chains
    subSub = SubSub.create();
  });
  equal(subSub.get('greeting'), 'hi world');
  run(function () {
    objWithChains.set('obj.hi', 'hello');
  });
  equal(subSub.get('greeting'), 'hello world');
});
