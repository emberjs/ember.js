import EmberObject, { computed, observer } from '@ember/object';
import { addObserver, removeObserver } from '@ember/object/observers';
import metalComputed from '@ember/-internals/metal/lib/computed';
import {
  addObserver as metalAddObserver,
  removeObserver as metalRemoveObserver,
} from '@ember/-internals/metal/lib/observer';
import { setDeprecationStagesConfig } from '@ember/debug';
import { moduleForDevelopment, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

const IDS = ['deprecate-computed-properties', 'deprecate-observers'];

// The module-eval deprecation on the `@ember/object/computed` macros barrel
// cannot be asserted here: the module already evaluated (silently, since
// these ids are available-stage and off by default) when the suite loaded.
// It is exercised by any consumer that imports the barrel with the id
// enabled at boot.
moduleForDevelopment(
  'computed property and observer deprecations',
  class extends AbstractTestCase {
    teardown() {
      setDeprecationStagesConfig(null);
    }

    ['@test nothing fires by default'](assert) {
      expectNoDeprecation(() => {
        let obj = EmberObject.create({ first: 'a' });
        let handler = () => {};
        computed('first', function () {
          return this.first;
        });
        observer('first', function () {});
        addObserver(obj, 'first', null, handler, true);
        removeObserver(obj, 'first', null, handler, true);
        obj.destroy();
      });
      assert.ok(true, 'no deprecations fired');
    }

    ['@test computed() fires when enabled and still works'](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      let cp;
      expectDeprecation(() => {
        cp = computed('first', function () {
          return `${this.first}!`;
        });
      }, /Computed properties are deprecated/);

      // extend stays silent here: deprecate-ember-object-extend is not in
      // the enabled set for this module
      let Klass = EmberObject.extend({ first: 'a', shouted: cp });
      let obj = Klass.create();
      assert.strictEqual(obj.get('shouted'), 'a!', 'the computed property works');
      obj.destroy();
    }

    ['@test observer() fires when enabled']() {
      setDeprecationStagesConfig({ enable: IDS });

      expectDeprecation(() => {
        observer('first', function () {});
      }, /Observers are deprecated/);
    }

    ['@test addObserver and removeObserver fire when enabled'](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      let obj = EmberObject.create({ first: 'a' });
      let handler = () => {};

      expectDeprecation(() => {
        addObserver(obj, 'first', null, handler, true);
      }, /Observers are deprecated/);

      expectDeprecation(() => {
        removeObserver(obj, 'first', null, handler, true);
      }, /Observers are deprecated/);

      obj.destroy();
      assert.ok(true, 'ran without throwing');
    }

    async ['@test the internal metal paths never fire'](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      let obj = EmberObject.create({ first: 'a' });
      let handler = () => {};

      expectNoDeprecation(() => {
        metalComputed('first', function () {
          return this.first;
        });
        metalAddObserver(obj, 'first', null, handler, true);
        metalRemoveObserver(obj, 'first', null, handler, true);
      });

      obj.destroy();
      await runLoopSettled();
      assert.ok(true, 'no deprecations fired');
    }
  }
);
