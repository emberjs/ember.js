import { DEBUG } from '@glimmer/env';
import { helperCapabilities, setHelperManager, setModifierManager } from '@glimmer/manager';
import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { tracked } from '@ember/-internals/metal';
import { set } from '@ember/object';
import { setOwner } from '@ember/-internals/owner';
import Service, { service } from '@ember/service';
import { registerDestructor } from '@glimmer/destroyable';

class TestHelperManager {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
    hasDestroyable: true,
  });

  constructor(owner) {
    this.owner = owner;
  }

  createHelper(Helper, args) {
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

  // HelperInstance
  compute() {}
  destroy() {}
}

setHelperManager((owner) => new TestHelperManager(owner), TestHelper);

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

      this.render('{{hello foo=this.foo}}', {
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

      this.render('{{hello this.foo}}', {
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
        class extends Service {
          value = 'hello';
        }
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

    ['@test allows get/set within the same tracking frame (lazy initialization)']() {
      this.registerCustomHelper(
        'hello',
        class extends TestHelper {
          @tracked foo = 123;

          value() {
            this.foo;
            this.foo = 456;
            return this.foo;
          }
        }
      );

      this.render('{{hello}}');
      this.assertText('456');
    }

    ['@test asserts against using both `hasValue` and `hasScheduledEffect`'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        helperCapabilities('3.23', {
          hasValue: true,
          hasScheduledEffect: true,
        });
      }, /You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted./);
    }

    ['@test asserts requiring either `hasValue` or `hasScheduledEffect`'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        helperCapabilities('3.23', {});
      }, /You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted./);
    }

    ['@test asserts against using `hasScheduledEffect`'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        helperCapabilities('3.23', {
          hasScheduledEffect: true,
        });
      }, /The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead/);
    }

    ['@test asserts against using incorrect version for capabilities'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
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

    '@test capabilities helper function must be used to generate capabilities'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      class OverrideTestHelperManager extends TestHelperManager {
        capabilities = {
          hasValue: true,
          hasDestroyable: true,
          hasScheduledEffect: false,
        };
      }

      class TestHelper {
        // HelperInstance
        compute() {}
        destroy() {}
      }

      setHelperManager((owner) => new OverrideTestHelperManager(owner), TestHelper);
      this.registerCustomHelper(
        'hello',
        class extends TestHelper {
          value() {
            return 'hello';
          }
        }
      );

      assert.throws(() => {
        this.render('{{hello}}');
      }, /Custom helper managers must have a `capabilities` property that is the result of calling the `capabilities\('3.23'\)` \(imported via `import \{ capabilities \} from '@ember\/helper';`\). /);

      assert.verifySteps([]);
    }

    '@test custom helpers allows get/set/get (lazy initialization) within constructor'() {
      this.registerCustomHelper(
        'hello',
        class extends TestHelper {
          @tracked foo;

          constructor() {
            super(...arguments);

            // get/set/get pattern (lazy initialization)
            let val = this.foo;
            if (val === undefined) {
              this.foo = 456;
            }
          }

          value() {
            return this.foo;
          }
        }
      );

      this.render('{{hello}}');
      this.assertText('456');
    }

    '@test custom helpers allows get/set/get (lazy initialization) within value'() {
      this.registerCustomHelper(
        'hello',
        class extends TestHelper {
          @tracked foo;

          value() {
            // get/set/get pattern (lazy initialization)
            let val = this.foo;
            if (val === undefined) {
              this.foo = 456;
            }
            return this.foo;
          }
        }
      );

      this.render('{{hello}}');
      this.assertText('456');
    }
  }
);
