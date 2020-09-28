import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import {
  setHelperManager,
  setModifierManager,
  helperCapabilities,
  invokeHelper,
  Helper,
  Component as EmberComponent,
} from '@ember/-internals/glimmer';
import { tracked, set } from '@ember/-internals/metal';
import { setOwner, getOwner } from '@ember/-internals/owner';
import { EMBER_GLIMMER_HELPER_MANAGER } from '@ember/canary-features';
import Service, { inject as service } from '@ember/service';
import { backtrackingMessageFor } from '../../utils/backtracking-rerender';
import { registerDestructor } from '@glimmer/runtime';
import { getValue } from '@glimmer/validator';

class TestHelperManager {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
    hasDestroyable: true,
  });

  constructor(owner) {
    this.owner = owner;
  }

  createHelper(definition, args) {
    let Helper = definition.class;
    return new Helper(this.owner, args);
  }

  getValue(instance) {
    return instance.value();
  }

  getDestroyable(instance) {
    return instance;
  }

  getDebugName() {
    return 'TEST_HELPER';
  }
}

class TestHelper {
  constructor(owner, args) {
    setOwner(this, owner);
    this.args = args;

    registerDestructor(this, () => this.willDestroy());
  }

  willDestroy() {}
}

setHelperManager(owner => new TestHelperManager(owner), TestHelper);

if (EMBER_GLIMMER_HELPER_MANAGER) {
  moduleFor(
    'Helpers test: helper managers',
    class extends RenderingTestCase {
      ['@test it works']() {
        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            value() {
              return 'hello';
            }
          }
        );

        this.render('{{hello}}');

        this.assertText('hello');

        runTask(() => this.rerender());

        this.assertText('hello');
      }

      ['@test tracks changes to named arguments'](assert) {
        let count = 0;

        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            value() {
              count++;
              return this.args.named.foo;
            }
          }
        );

        this.render('{{hello foo=foo}}', {
          foo: 123,
        });

        assert.equal(count, 1, 'rendered once');
        this.assertText('123');

        runTask(() => this.rerender());

        assert.equal(count, 1, 'rendered once');
        this.assertText('123');

        runTask(() => set(this.context, 'foo', 456));

        assert.equal(count, 2, 'rendered twice');
        this.assertText('456');
      }

      ['@test tracks changes to positional arguments'](assert) {
        let count = 0;

        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            value() {
              count++;
              return this.args.positional[0];
            }
          }
        );

        this.render('{{hello foo}}', {
          foo: 123,
        });

        assert.equal(count, 1, 'rendered once');
        this.assertText('123');

        runTask(() => this.rerender());

        assert.equal(count, 1, 'rendered once');
        this.assertText('123');

        runTask(() => set(this.context, 'foo', 456));

        assert.equal(count, 2, 'rendered twice');
        this.assertText('456');
      }

      ['@test tracks changes to tracked properties'](assert) {
        let count = 0;
        let instance;

        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            @tracked foo = 123;

            constructor(...args) {
              super(...args);
              instance = this;
            }

            value() {
              count++;
              return this.foo;
            }
          }
        );

        this.render('{{hello}}');

        assert.equal(count, 1, 'rendered once');
        this.assertText('123');

        runTask(() => this.rerender());

        assert.equal(count, 1, 'rendered once');
        this.assertText('123');

        runTask(() => (instance.foo = 456));

        assert.equal(count, 2, 'rendered twice');
        this.assertText('456');
      }

      ['@test services can be injected']() {
        this.registerService(
          'hello',
          Service.extend({
            value: 'hello',
          })
        );

        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            @service hello;

            value() {
              return this.hello.value;
            }
          }
        );

        this.render('{{hello}}');

        this.assertText('hello');
      }

      ['@test destroyable is associated correctly'](assert) {
        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            value() {
              return 'hello';
            }

            willDestroy() {
              assert.ok(true, 'destructor called');
            }
          }
        );

        this.render('{{hello}}');

        this.assertText('hello');
      }

      ['@test debug name is used for backtracking message']() {
        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            @tracked foo = 123;

            value() {
              this.foo;
              this.foo = 456;
            }
          }
        );

        let expectedMessage = backtrackingMessageFor('foo', '.*', {
          renderTree: ['\\(result of a `TEST_HELPER` helper\\)'],
        });

        expectAssertion(() => {
          this.render('{{hello}}');
        }, expectedMessage);
      }

      ['@test asserts against using both `hasValue` and `hasScheduledEffect`']() {
        expectAssertion(() => {
          helperCapabilities('3.23', {
            hasValue: true,
            hasScheduledEffect: true,
          });
        }, /You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted./);
      }

      ['@test asserts requiring either `hasValue` or `hasScheduledEffect`']() {
        expectAssertion(() => {
          helperCapabilities('3.23', {});
        }, /You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted./);
      }

      ['@test asserts against using `hasScheduledEffect`']() {
        expectAssertion(() => {
          helperCapabilities('3.23', {
            hasScheduledEffect: true,
          });
        }, /The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead/);
      }

      ['@test asserts against using incorrect version for capabilities']() {
        expectAssertion(() => {
          helperCapabilities('aoeu', {
            hasScheduledEffect: true,
          });
        }, /Invalid helper manager compatibility specified/);
      }

      ['@test helper manager and modifier manager can be associated with the same value']() {
        setModifierManager(() => ({}), TestHelper);

        this.registerCustomHelper(
          'hello',
          class extends TestHelper {
            value() {
              return 'hello';
            }
          }
        );

        this.render('{{hello}}');

        this.assertText('hello');

        runTask(() => this.rerender());

        this.assertText('hello');
      }
    }
  );

  moduleFor(
    'Helpers test: invokeHelper',
    class extends RenderingTestCase {
      ['@test it works with the example from the RFC Summary']() {
        class PlusOneHelper extends Helper {
          compute([num]) {
            return num + 1;
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

        this.render(`<PlusOne @number={{4}} />`);

        this.assertText('5');

        runTask(() => this.rerender());

        this.assertText('5');
      }

      ['@test there is an owner'](assert) {
        class PlusOneHelper extends Helper {
          compute([num]) {
            return num + 1;
          }
        }

        let cache;
        class PlusOne {
          constructor(number) {
            this.number = number;
          }

          get plusOne() {
            if (cache) return cache;

            cache = invokeHelper(this, PlusOneHelper, () => {
              return { positional: [this.number] };
            });

            return cache;
          }

          get value() {
            return getValue(this.plusOne);
          }
        }

        let instance = new PlusOne(4);

        setOwner(instance, this.owner);

        assert.ok(getOwner(instance));
        assert.equal(instance.value, 5);
      }

      ['@test there is no owner'](assert) {
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

        assert.notOk(getOwner(instance));
        assert.equal(instance.value, 5);
      }
    }
  );
}
