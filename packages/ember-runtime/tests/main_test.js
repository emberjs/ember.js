import { collect, Object as EmberObject } from '../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-runtime/main',
  class extends AbstractTestCase {
    ['@test Ember.computed.collect'](assert) {
      let MyObj = EmberObject.extend({
        props: collect('foo', 'bar', 'baz'),
      });

      let myObj = MyObj.create({
        foo: 3,
        bar: 5,
        baz: 'asdf',
      });

      let propsValue = myObj.get('props');

      assert.deepEqual(propsValue, [3, 5, 'asdf']);
    }
  }
);
