import Ember from 'ember-runtime';

QUnit.module('ember-runtime/main');

QUnit.test('Ember.computed.collect', function() {
  let MyObj = Ember.Object.extend({
    props: Ember.computed.collect('foo', 'bar', 'baz')
  });

  let myObj = MyObj.create({
    foo: 3,
    bar: 5,
    baz: 'asdf'
  });

  let propsValue = myObj.get('props');

  deepEqual(propsValue, [3, 5, 'asdf']);
});
