import {
  collect,
  Object as EmberObject
} from '../index';

QUnit.module('ember-runtime/main');

QUnit.test('Ember.computed.collect', function(assert) {
  let MyObj = EmberObject.extend({
    props: collect('foo', 'bar', 'baz')
  });

  let myObj = MyObj.create({
    foo: 3,
    bar: 5,
    baz: 'asdf'
  });

  let propsValue = myObj.get('props');

  assert.deepEqual(propsValue, [3, 5, 'asdf']);
});
