import ArrayProxy from '../../../lib/system/array_proxy';
import EmberObject from '../../../lib/system/object';
import { observer } from 'ember-metal';
import { oneWay as reads } from 'ember-runtime';
import { A as a } from '../../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.ArrayProxy - content change (length)',
  class extends AbstractTestCase {
    ['@test array proxy + aliasedProperty complex test'](assert) {
      let aCalled, bCalled, cCalled, dCalled, eCalled;

      aCalled = bCalled = cCalled = dCalled = eCalled = 0;

      let obj = EmberObject.extend({
        colors: reads('model'),
        length: reads('colors.length'),

        a: observer('length', () => aCalled++),
        b: observer('colors.length', () => bCalled++),
        c: observer('colors.content.length', () => cCalled++),
        d: observer('colors.[]', () => dCalled++),
        e: observer('colors.content.[]', () => eCalled++),
      }).create();

      obj.set(
        'model',
        ArrayProxy.create({
          content: a(['red', 'yellow', 'blue']),
        })
      );

      assert.equal(obj.get('colors.content.length'), 3);
      assert.equal(obj.get('colors.length'), 3);
      assert.equal(obj.get('length'), 3);

      assert.equal(aCalled, 1, 'expected observer `length` to be called ONCE');
      assert.equal(bCalled, 1, 'expected observer `colors.length` to be called ONCE');
      assert.equal(cCalled, 1, 'expected observer `colors.content.length` to be called ONCE');
      assert.equal(dCalled, 1, 'expected observer `colors.[]` to be called ONCE');
      assert.equal(eCalled, 1, 'expected observer `colors.content.[]` to be called ONCE');

      obj.get('colors').pushObjects(['green', 'red']);

      assert.equal(obj.get('colors.content.length'), 5);
      assert.equal(obj.get('colors.length'), 5);
      assert.equal(obj.get('length'), 5);

      assert.equal(aCalled, 2, 'expected observer `length` to be called TWICE');
      assert.equal(bCalled, 2, 'expected observer `colors.length` to be called TWICE');
      assert.equal(cCalled, 2, 'expected observer `colors.content.length` to be called TWICE');
      assert.equal(dCalled, 2, 'expected observer `colors.[]` to be called TWICE');
      assert.equal(eCalled, 2, 'expected observer `colors.content.[]` to be called TWICE');
    }
  }
);
