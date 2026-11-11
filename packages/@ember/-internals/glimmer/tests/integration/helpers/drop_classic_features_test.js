import Helper from '@ember/component/helper';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/owner';
import { isDestroyed, registerDestructor } from '@ember/destroyable';
import { RenderingTestCase, moduleFor, runDestroy, runTask } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: Helper',
    class extends RenderingTestCase {
      ['@test Helper extends no other class'](assert) {
        assert.strictEqual(Object.getPrototypeOf(Helper), Function.prototype);
        assert.strictEqual(Object.getPrototypeOf(Helper.prototype), Object.prototype);
      }

      ['@test the owner passes itself to the constructor'](assert) {
        let instance;
        let { owner } = this;

        this.registerCustomHelper(
          'hello-world',
          class extends Helper {
            constructor(owner) {
              super(owner);
              assert.step('constructor');
              assert.strictEqual(getOwner(this), owner, 'the owner is set in the constructor');
              instance = this;
            }

            compute([name]) {
              assert.step(`compute ${name}`);
              return `hello ${name}`;
            }
          }
        );

        this.render('{{hello-world "tomster"}}');

        this.assertText('hello tomster');
        assert.verifySteps(['constructor', 'compute tomster']);
        assert.notOk(instance instanceof EmberObject);
        assert.strictEqual(getOwner(instance), owner);
      }

      ['@test compute runs again when the arguments change'](assert) {
        this.registerCustomHelper(
          'hello-world',
          class extends Helper {
            constructor(owner) {
              super(owner);
              assert.step('constructor');
            }

            compute([name]) {
              assert.step(`compute ${name}`);
              return `hello ${name}`;
            }
          }
        );

        this.render('{{hello-world this.name}}', { name: 'tomster' });

        this.assertText('hello tomster');

        runTask(() => this.context.set('name', 'zoey'));

        this.assertText('hello zoey');
        assert.verifySteps(['constructor', 'compute tomster', 'compute zoey']);
      }

      ['@test recompute runs compute again'](assert) {
        let instance;
        let phrase = 'first';

        this.registerCustomHelper(
          'phrase',
          class extends Helper {
            constructor(owner) {
              super(owner);
              instance = this;
            }

            compute() {
              assert.step(`compute ${phrase}`);
              return phrase;
            }
          }
        );

        this.render('{{phrase}}');

        this.assertText('first');

        phrase = 'second';
        runTask(() => instance.recompute());

        this.assertText('second');
        assert.verifySteps(['compute first', 'compute second']);
      }

      ['@test willDestroy runs once when the template output goes away'](assert) {
        let instance;

        class BaseHelper extends Helper {
          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('base willDestroy');
          }
        }

        this.registerCustomHelper(
          'some-helper',
          class extends BaseHelper {
            constructor(owner) {
              super(owner);
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

        assert.verifySteps([]);

        runDestroy(this.component);

        assert.verifySteps(['base willDestroy', 'willDestroy']);
        assert.true(isDestroyed(instance));
      }

      ['@test a direct destroy() call runs willDestroy once'](assert) {
        let instance;

        this.registerCustomHelper(
          'some-helper',
          class extends Helper {
            constructor(owner) {
              super(owner);
              instance = this;
            }

            compute() {
              return 'value';
            }

            willDestroy() {
              assert.step('willDestroy');
            }
          }
        );

        this.render('{{some-helper}}');

        runTask(() => instance.destroy());

        assert.verifySteps(['willDestroy']);
        assert.true(isDestroyed(instance));

        runDestroy(this.component);

        assert.verifySteps([]);
      }

      ['@test a helper without willDestroy is destroyed by the helper manager'](assert) {
        let instance;

        this.registerCustomHelper(
          'some-helper',
          class extends Helper {
            constructor(owner) {
              super(owner);
              instance = this;
              registerDestructor(this, () => assert.step('destructor'));
            }

            compute() {
              return 'value';
            }
          }
        );

        this.render('{{some-helper}}');

        runDestroy(this.component);

        assert.verifySteps(['destructor']);
        assert.true(isDestroyed(instance));
      }

      ['@test a helper in a subexpression can recompute'](assert) {
        let instance;
        let phrase = 'overcomes by';

        this.registerCustomHelper(
          'dynamic-segment',
          class extends Helper {
            constructor(owner) {
              super(owner);
              instance = this;
            }

            compute() {
              return phrase;
            }
          }
        );

        this.registerHelper('join-words', (params) => params.join(' '));

        this.render('{{join-words "Who" (dynamic-segment) "force"}}');

        this.assertText('Who overcomes by force');

        phrase = 'believes his';
        runTask(() => instance.recompute());

        this.assertText('Who believes his force');
        assert.ok(instance instanceof Helper);
      }
    }
  );
}
