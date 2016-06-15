import run from 'ember-metal/run_loop';
import {computed} from 'ember-metal/computed';
import EmberObject from 'ember-runtime/system/object';

QUnit.module('system/object/subclasses');

QUnit.test('chains should copy forward to subclasses when prototype created', function () {
  let ObjectWithChains, objWithChains, SubWithChains, SubSub, subSub;
  run(() => {
    ObjectWithChains = EmberObject.extend({
      obj: {
        a: 'a',
        hi: 'hi'
      },
      aBinding: 'obj.a' // add chain
    });

    let deprecationMessage = '`Ember.Binding` is deprecated. Consider' +
      ' using an `alias` computed property instead.';

    expectDeprecation(() => {
      // realize prototype
      objWithChains = ObjectWithChains.create();
    }, deprecationMessage);

    // should not copy chains from parent yet
    SubWithChains = ObjectWithChains.extend({
      hiBinding: 'obj.hi', // add chain
      hello: computed(function() {
        return this.get('obj.hi') + ' world';
      }).property('hi'), // observe chain
      greetingBinding: 'hello'
    });

    SubSub = SubWithChains.extend();

    expectDeprecation(() => {
      // should realize prototypes and copy forward chains
      subSub = SubSub.create();
    }, deprecationMessage);
  });
  equal(subSub.get('greeting'), 'hi world');
  run(() => objWithChains.set('obj.hi', 'hello'));
  equal(subSub.get('greeting'), 'hello world');
});
