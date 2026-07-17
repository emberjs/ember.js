import EmberObject, { computed, observer } from '@ember/object';
import { readOnly } from '@ember/object/computed';
import { addObserver, removeObserver } from '@ember/object/observers';
import { readOnly as metalReadOnly } from '@ember/object/lib/computed/computed_macros';
import metalComputed from '@ember/-internals/metal/lib/computed';
import {
  addObserver as metalAddObserver,
  removeObserver as metalRemoveObserver,
} from '@ember/-internals/metal/lib/observer';
import { setDeprecationStagesConfig } from '@ember/debug';
import { emberVersionGte } from '@ember/-internals/deprecations';
import {
  moduleForDevelopment,
  testUnless,
  AbstractTestCase,
  runLoopSettled,
} from 'internal-test-helpers';

const IDS = ['deprecate-computed-properties', 'deprecate-observers'];

// Under _OVERRIDE_DEPRECATION_VERSION removal simulation these APIs throw
// instead of warning (the test config replaces the harness's except list),
// so the warn-expecting tests are skipped.
const REMOVAL_SIMULATED = emberVersionGte('8.0.0');

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
        readOnly('first');
        observer('first', function () {});
        addObserver(obj, 'first', null, handler, true);
        removeObserver(obj, 'first', null, handler, true);
        obj.destroy();
      });
      assert.ok(true, 'no deprecations fired');
    }

    [`${testUnless(REMOVAL_SIMULATED)} computed() fires when enabled and still works`](assert) {
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

    [`${testUnless(REMOVAL_SIMULATED)} computed macros fire per call and still work`](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      let cp;
      expectDeprecation(() => {
        cp = readOnly('first');
      }, /Computed property macros are deprecated/);

      // no dedupe: a second call fires again
      expectDeprecation(() => {
        readOnly('second');
      }, /Computed property macros are deprecated/);

      let Klass = EmberObject.extend({ first: 'a', firstAlias: cp });
      let obj = Klass.create();
      assert.strictEqual(obj.get('firstAlias'), 'a', 'the macro works');
      obj.destroy();
    }

    ['@test the deep macro modules never fire'](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      expectNoDeprecation(() => {
        metalReadOnly('first');
      });
      assert.ok(true, 'no deprecations fired');
    }

    [`${testUnless(REMOVAL_SIMULATED)} observer() fires when enabled`]() {
      setDeprecationStagesConfig({ enable: IDS });

      expectDeprecation(() => {
        observer('first', function () {});
      }, /Observers are deprecated/);
    }

    [`${testUnless(REMOVAL_SIMULATED)} addObserver and removeObserver fire when enabled`](assert) {
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
