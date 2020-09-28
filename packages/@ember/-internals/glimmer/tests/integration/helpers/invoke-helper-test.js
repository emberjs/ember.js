import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import {
  invokeHelper,
  Helper,
  helper,
  Component as EmberComponent,
  setHelperManager,
  helperCapabilities,
} from '@ember/-internals/glimmer';
import { tracked, set } from '@ember/-internals/metal';
import { getOwner } from '@ember/-internals/owner';
import { EMBER_GLIMMER_INVOKE_HELPER, EMBER_GLIMMER_HELPER_MANAGER } from '@ember/canary-features';
import Service, { inject as service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import { getValue } from '@glimmer/validator';
import { destroy, isDestroyed, registerDestructor } from '@glimmer/runtime';

if (EMBER_GLIMMER_INVOKE_HELPER) {
  moduleFor(
    'Helpers test: invokeHelper',
    class extends RenderingTestCase {
      '@test it works with a component'() {
        class PlusOneHelper extends Helper {
          compute([num]) {
            return num + 1;
          }
        }

        class PlusOne extends EmberComponent {
          @tracked number;

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return {
              positional: [this.number],
            };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        this.registerComponent('plus-one', {
          template: `{{this.value}}`,
          ComponentClass: PlusOne,
        });

        this.render(`<PlusOne @number={{this.value}} />`, {
          value: 4,
        });

        this.assertText('5');

        runTask(() => this.rerender());

        this.assertText('5');

        runTask(() => set(this.context, 'value', 5));

        this.assertText('6');
      }

      '@test it works with simple helpers'() {
        let PlusOneHelper = helper(([num]) => num + 1);

        class PlusOne extends EmberComponent {
          @tracked number;

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return {
              positional: [this.number],
            };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        this.registerComponent('plus-one', {
          template: `{{this.value}}`,
          ComponentClass: PlusOne,
        });

        this.render(`<PlusOne @number={{this.value}} />`, {
          value: 4,
        });

        this.assertText('5');

        runTask(() => this.rerender());

        this.assertText('5');

        runTask(() => set(this.context, 'value', 5));

        this.assertText('6');
      }

      '@test services can be injected if there is an owner'() {
        let numberService;

        this.registerService(
          'number',
          class extends Service {
            constructor() {
              super(...arguments);
              numberService = this;
            }

            @tracked value = 4;
          }
        );

        class PlusOneHelper extends Helper {
          @service number;

          compute() {
            return this.number.value + 1;
          }
        }

        class PlusOne extends EmberComponent {
          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return {
              positional: [this.number],
            };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        this.registerComponent('plus-one', {
          template: `{{this.value}}`,
          ComponentClass: PlusOne,
        });

        this.render(`<PlusOne />`);

        this.assertText('5');

        runTask(() => this.rerender());

        this.assertText('5');

        runTask(() => (numberService.value = 5));

        this.assertText('6');
      }

      '@test works if there is no owner'(assert) {
        class PlusOneHelper extends Helper {
          compute([num]) {
            return num + 1;
          }
        }

        class PlusOne {
          constructor(number) {
            this.number = number;
          }

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return { positional: [this.number] };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusOne(4);

        assert.notOk(getOwner(instance), 'no owner exists on the wrapper');
        assert.equal(instance.value, 5, 'helper works without an owner');
      }

      '@test tracking for arguments works for tracked properties'(assert) {
        let count = 0;

        class PlusOneHelper extends Helper {
          compute([num]) {
            count++;
            return num + 1;
          }
        }

        class PlusOne {
          @tracked number;

          constructor(number) {
            this.number = number;
          }

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return { positional: [this.number] };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusOne(4);

        assert.equal(instance.value, 5, 'helper works');
        assert.equal(instance.value, 5, 'helper works');
        assert.equal(count, 1, 'helper only called once');

        instance.number = 5;

        assert.equal(instance.value, 6, 'helper works');
        assert.equal(count, 2, 'helper called a second time');
      }

      '@test computeArgs only called when consumed values change'(assert) {
        let count = 0;

        class PlusNHelper extends Helper {
          compute([num], { n }) {
            return num + n;
          }
        }

        class PlusN {
          @tracked number;
          @tracked n;

          constructor(number, n) {
            this.number = number;
            this.n = n;
          }

          plusOne = invokeHelper(this, PlusNHelper, () => {
            count++;
            return {
              positional: [this.number],
              named: {
                n: this.n,
              },
            };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusN(4, 1);

        assert.equal(count, 0, 'computeArgs not called yet');

        assert.equal(instance.value, 5, 'helper works');
        assert.equal(instance.value, 5, 'helper works');
        assert.equal(count, 1, 'computeArgs only called once');

        instance.number = 5;

        assert.equal(instance.value, 6, 'helper works');
        assert.equal(instance.value, 6, 'helper works');
        assert.equal(count, 2, 'computeArgs called a second time');

        instance.n = 5;

        assert.equal(instance.value, 10, 'helper works');
        assert.equal(instance.value, 10, 'helper works');
        assert.equal(count, 3, 'computeArgs called a third time');
      }

      '@test helper updates based on internal state changes'(assert) {
        let count = 0;
        let helper;

        class PlusOneHelper extends Helper {
          @tracked number = 4;

          constructor() {
            super(...arguments);
            helper = this;
          }

          compute() {
            count++;
            return this.number + 1;
          }
        }

        class PlusOne {
          plusOne = invokeHelper(this, PlusOneHelper);

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusOne();

        assert.equal(instance.value, 5, 'helper works');
        assert.equal(instance.value, 5, 'helper works');
        assert.equal(count, 1, 'helper only called once');

        helper.number = 5;

        assert.equal(instance.value, 6, 'helper works');
        assert.equal(count, 2, 'helper called a second time');
      }

      '@test helper that with constant args is constant'(assert) {
        let count = 0;

        class PlusOneHelper extends Helper {
          compute([num]) {
            count++;
            return num + 1;
          }
        }

        class PlusOne {
          number;

          constructor(number) {
            this.number = number;
          }

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return { positional: [this.number] };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusOne(4);

        assert.equal(instance.value, 5, 'helper works');
        assert.equal(instance.value, 5, 'helper works');
        assert.equal(count, 1, 'helper only called once');

        instance.number = 5;

        assert.equal(instance.value, 5, 'helper works');
        assert.equal(count, 1, 'helper not called a second time');
      }

      '@test helper destroys correctly when context object is destroyed'(assert) {
        let context = {};
        let instance;

        class TestHelper extends Helper {
          constructor() {
            super(...arguments);
            instance = this;
          }
        }

        let cache = invokeHelper(context, TestHelper);

        registerDestructor(context, () => assert.step('context'));
        registerDestructor(cache, () => assert.step('cache'));
        registerDestructor(instance, () => assert.step('instance'));

        runTask(() => destroy(context));

        assert.ok(isDestroyed(context), 'context destroyed');
        assert.ok(isDestroyed(cache), 'cache destroyed');
        assert.ok(isDestroyed(instance), 'instance destroyed');

        assert.verifySteps(['instance', 'cache', 'context'], 'destructors ran in correct order');
      }

      '@test helper destroys correctly when helper cache is destroyed'(assert) {
        let context = {};
        let instance;

        class TestHelper extends Helper {
          constructor() {
            super(...arguments);
            instance = this;
          }
        }

        let cache = invokeHelper(context, TestHelper);

        registerDestructor(context, () => assert.step('context'));
        registerDestructor(cache, () => assert.step('cache'));
        registerDestructor(instance, () => assert.step('instance'));

        runTask(() => destroy(cache));

        assert.notOk(isDestroyed(context), 'context NOT destroyed');
        assert.ok(isDestroyed(cache), 'cache destroyed');
        assert.ok(isDestroyed(instance), 'instance destroyed');

        assert.verifySteps(['instance', 'cache'], 'destructors ran in correct order');
      }

      '@test simple helper destroys correctly when context object is destroyed'(assert) {
        let context = {};

        let TestHelper = helper(() => {});
        let cache = invokeHelper(context, TestHelper);

        registerDestructor(context, () => assert.step('context'));
        registerDestructor(cache, () => assert.step('cache'));

        runTask(() => destroy(context));

        assert.ok(isDestroyed(context), 'context destroyed');
        assert.ok(isDestroyed(cache), 'cache destroyed');

        assert.verifySteps(['cache', 'context'], 'destructors ran in correct order');
      }

      '@test throws an error if value is accessed after it is destroyed'() {
        expectAssertion(() => {
          let helper = invokeHelper({}, class extends Helper {});

          runTask(() => destroy(helper));

          getValue(helper);
        }, /You attempted to get the value of a helper after the helper was destroyed, which is not allowed/);
      }

      '@test asserts if no context object is passed'() {
        expectAssertion(() => {
          invokeHelper(undefined, class extends Helper {});
        }, /Expected a context object to be passed as the first parameter to invokeHelper, got undefined/);
      }

      '@test asserts if no manager exists for the helper definition'() {
        expectAssertion(() => {
          invokeHelper({}, class {});
        }, /Expected a helper definition to be passed as the second parameter to invokeHelper, but no helper manager was found. The definition value that was passed was `\(unknown function\)`. Did you use setHelperManager to associate a helper manager with this value?/);
      }
    }
  );
}

if (EMBER_GLIMMER_HELPER_MANAGER && EMBER_GLIMMER_INVOKE_HELPER) {
  class TestHelperManager {
    capabilities = helperCapabilities('3.23', {
      hasValue: true,
      hasDestroyable: true,
    });

    createHelper(Helper, args) {
      return new Helper(args);
    }

    getValue(instance) {
      return instance.value();
    }

    getDestroyable(instance) {
      return instance;
    }
  }

  class TestHelper {
    constructor(args) {
      this.args = args;

      registerDestructor(this, () => this.willDestroy());
    }

    willDestroy() {}
  }

  setHelperManager((owner) => new TestHelperManager(owner), TestHelper);

  moduleFor(
    'Helpers test: invokeHelper with custom helper managers',
    class extends RenderingTestCase {
      '@test it works with custom helper managers'() {
        class PlusOneHelper extends TestHelper {
          value() {
            return this.args.positional[0] + 1;
          }
        }

        class PlusOne extends EmberComponent {
          @tracked number;

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return {
              positional: [this.number],
            };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        this.registerComponent('plus-one', {
          template: `{{this.value}}`,
          ComponentClass: PlusOne,
        });

        this.render(`<PlusOne @number={{this.value}} />`, {
          value: 4,
        });

        this.assertText('5');

        runTask(() => this.rerender());

        this.assertText('5');

        runTask(() => set(this.context, 'value', 5));

        this.assertText('6');
      }

      '@test helper that accesses no args is constant'(assert) {
        let count = 0;

        class PlusOneHelper extends TestHelper {
          value() {
            count++;
            return 123;
          }
        }

        class PlusOne {
          @tracked number;

          constructor(number) {
            this.number = number;
          }

          plusOne = invokeHelper(this, PlusOneHelper, () => {
            return { positional: [this.number] };
          });

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusOne(4);

        assert.equal(instance.value, 123, 'helper works');
        assert.equal(instance.value, 123, 'helper works');
        assert.equal(count, 1, 'helper only called once');

        instance.number = 5;

        assert.equal(instance.value, 123, 'helper works');
        assert.equal(count, 1, 'helper not called a second time');
      }

      '@test helper destroys correctly when context object is destroyed'(assert) {
        let context = {};
        let instance;

        class MyTestHelper extends TestHelper {
          constructor() {
            super(...arguments);
            instance = this;
          }
        }

        let cache = invokeHelper(context, MyTestHelper);

        registerDestructor(context, () => assert.step('context'));
        registerDestructor(cache, () => assert.step('cache'));
        registerDestructor(instance, () => assert.step('instance'));

        runTask(() => destroy(context));

        assert.ok(isDestroyed(context), 'context destroyed');
        assert.ok(isDestroyed(cache), 'cache destroyed');
        assert.ok(isDestroyed(instance), 'instance destroyed');

        assert.verifySteps(['instance', 'cache', 'context'], 'destructors ran in correct order');
      }

      '@test args are frozen in debug builds'(assert) {
        if (!DEBUG) {
          assert.expect(0);
        } else {
          class PlusOneHelper extends TestHelper {
            value() {
              this.args.foo = 123;
            }
          }

          class PlusOne {
            number;

            constructor(number) {
              this.number = number;
            }

            plusOne = invokeHelper(this, PlusOneHelper, () => {
              return { positional: [this.number] };
            });

            get value() {
              return getValue(this.plusOne);
            }
          }

          let instance = new PlusOne(4);

          assert.throws(
            () => instance.value,
            /TypeError: Cannot add property foo, object is not extensible/
          );
        }
      }
    }
  );
}
