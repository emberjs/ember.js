import Helper, { helper } from '@ember/component/helper';
import Service, { service } from '@ember/service';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/owner';
import { RenderingTestCase, moduleFor, runDestroy, runTask } from 'internal-test-helpers';

/*
  The classic `Helper` API, which the `EMBER_DROP_CLASSIC_FEATURES` build
  flag removes. These tests run only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: Helper',
    class extends RenderingTestCase {
      ['@test Helper extends EmberObject'](assert) {
        let instance;

        this.registerCustomHelper(
          'hello-world',
          class extends Helper {
            init() {
              super.init(...arguments);
              instance = this;
            }

            compute() {
              return 'hello';
            }
          }
        );

        this.render('{{hello-world}}');

        assert.ok(instance instanceof Helper);
        assert.ok(instance instanceof EmberObject);
      }

      ['@test init runs with the owner set and injections available'](assert) {
        let { owner } = this;

        owner.register(
          'service:name-builder',
          class extends Service {
            build() {
              return 'tomster';
            }
          }
        );

        this.registerCustomHelper(
          'hello-world',
          class extends Helper {
            @service('name-builder')
            nameBuilder;

            init() {
              super.init(...arguments);
              assert.step('init');
              assert.strictEqual(getOwner(this), owner, 'the owner is set in init');
              this.name = this.get('nameBuilder').build();
            }

            compute() {
              return `hello ${this.name}`;
            }
          }
        );

        this.render('{{hello-world}}');

        this.assertText('hello tomster');
        assert.verifySteps(['init']);
      }

      ['@test Helper.extend defines a helper'](assert) {
        let instance;

        this.registerCustomHelper(
          'hello-world',
          Helper.extend({
            greeting: 'hello',

            init() {
              this._super(...arguments);
              instance = this;
            },

            compute([name]) {
              return `${this.greeting} ${name}`;
            },
          })
        );

        this.render('{{hello-world "tomster"}}');

        this.assertText('hello tomster');

        runTask(() => {
          instance.set('greeting', 'hi');
          instance.recompute();
        });

        this.assertText('hi tomster');
        assert.strictEqual(instance.get('greeting'), 'hi');
      }

      ['@test willDestroy runs and the destroy flags are set when the template output goes away'](
        assert
      ) {
        let instance;

        this.registerCustomHelper(
          'some-helper',
          class extends Helper {
            init() {
              super.init(...arguments);
              instance = this;
            }

            compute() {
              return 'value';
            }

            willDestroy() {
              super.willDestroy(...arguments);
              assert.step('willDestroy');
            }
          }
        );

        this.render('{{some-helper}}');

        assert.false(instance.isDestroying);
        assert.false(instance.isDestroyed);

        runDestroy(this.component);

        assert.verifySteps(['willDestroy']);
        assert.true(instance.isDestroying);
        assert.true(instance.isDestroyed);
      }

      ['@test Helper.helper is the helper function'](assert) {
        assert.strictEqual(Helper.helper, helper);
      }
    }
  );
}
