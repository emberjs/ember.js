/**
 * What user code throws while a template renders or updates reaches the code
 * that asked for the render (compat, GXT_MODE).
 *
 * Glimmer does not log an error of a helper, a condition, a binding or a
 * re-render and carry on: the render, or the revalidation of the run loop,
 * throws it.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import EmberObject, { computed, set } from '@ember/object';
import ObjectProxy from '@ember/object/proxy';

const BoomClass = EmberObject.extend({
  init() {
    this._super(...arguments);
    throw new Error('the helper failed to initialize');
  },
  compute() {
    return 'computed';
  },
});

function boomFn(): never {
  throw new Error('the helper function failed');
}

moduleFor(
  'GXT errors: helpers resolved by name',
  class extends RenderingTestCase {
    ['@test what creating a helper class without a helper manager throws reaches the render'](
      assert: QUnit['assert']
    ) {
      this.owner.register('helper:boom-class', BoomClass);

      assert.throws(() => {
        this.render('{{boom-class}}');
      }, /the helper failed to initialize/);
    }

    ['@test ... also when the helper has arguments'](assert: QUnit['assert']) {
      this.owner.register('helper:boom-class', BoomClass);

      assert.throws(() => {
        this.render('{{boom-class "an argument"}}');
      }, /the helper failed to initialize/);
    }

    ['@test what a function registered as a helper throws reaches the render'](
      assert: QUnit['assert']
    ) {
      this.owner.register('helper:boom-fn', boomFn);

      assert.throws(() => {
        this.render('{{boom-fn}}');
      }, /the helper function failed/);
    }

    ['@test ... also when the function has arguments'](assert: QUnit['assert']) {
      this.owner.register('helper:boom-fn', boomFn);

      assert.throws(() => {
        this.render('{{boom-fn "an argument"}}');
      }, /the helper function failed/);
    }
  }
);

moduleFor(
  'GXT errors: {{#if}} conditions',
  class extends RenderingTestCase {
    ['@test what the truthiness of a condition throws after a change reaches the run loop'](
      assert: QUnit['assert']
    ) {
      const BoomProxy = ObjectProxy.extend({
        isTruthy: computed(function () {
          throw new Error('the truthiness failed');
        }),
      });

      this.render('{{#if this.value}}yes{{else}}no{{/if}}', { value: false });
      this.assertText('no');

      assert.throws(() => {
        runTask(() => set(this.context, 'value', BoomProxy.create({ content: {} })));
      }, /the truthiness failed/);
    }
  }
);
