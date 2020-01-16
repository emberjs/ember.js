import { get, set, addObserver } from '@ember/-internals/metal';
import EmberObject from '../../../../lib/system/object';
import { A as emberA } from '../../../../lib/mixins/array';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed obj.set() and obj.get() to Ember.set() and Ember.get()
  * changed obj.addObserver() to addObserver()
*/

moduleFor(
  'Ember.Observable - Observing with @each',
  class extends AbstractTestCase {
    async ['@test chained observers on enumerable properties are triggered when the observed property of any item changes'](
      assert
    ) {
      let family = EmberObject.create({ momma: null });
      let momma = EmberObject.create({ children: [] });

      let child1 = EmberObject.create({ name: 'Bartholomew' });
      let child2 = EmberObject.create({ name: 'Agnes' });
      let child3 = EmberObject.create({ name: 'Dan' });
      let child4 = EmberObject.create({ name: 'Nancy' });

      set(family, 'momma', momma);
      set(momma, 'children', emberA([child1, child2, child3]));

      let observerFiredCount = 0;
      addObserver(family, 'momma.children.@each.name', this, function() {
        observerFiredCount++;
      });

      observerFiredCount = 0;

      for (let i = 0; i < momma.children.length; i++) {
        momma.children[i].set('name', 'Juan');
        await runLoopSettled();
      }
      assert.equal(observerFiredCount, 3, 'observer fired after changing child names');

      observerFiredCount = 0;
      get(momma, 'children').pushObject(child4);
      await runLoopSettled();

      assert.equal(observerFiredCount, 1, 'observer fired after adding a new item');

      observerFiredCount = 0;
      set(child4, 'name', 'Herbert');
      await runLoopSettled();

      assert.equal(observerFiredCount, 1, 'observer fired after changing property on new object');

      set(momma, 'children', []);
      await runLoopSettled();

      observerFiredCount = 0;
      set(child1, 'name', 'Hanna');
      await runLoopSettled();

      assert.equal(
        observerFiredCount,
        0,
        'observer did not fire after removing changing property on a removed object'
      );
    }
  }
);
