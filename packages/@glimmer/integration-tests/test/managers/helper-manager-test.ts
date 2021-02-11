import { helperCapabilities, setHelperManager, setModifierManager } from '@glimmer/manager';
import { registerDestructor } from '@glimmer/destroyable';
import { RenderTest, test, jitSuite, tracked, defineComponent, trackedObj } from '../..';
import { Arguments, Owner } from '@glimmer/interfaces';
import { setOwner } from '@glimmer/owner';

class TestHelperManager {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
    hasDestroyable: true,
  });

  constructor(public owner: Owner | undefined) {}

  createHelper(
    Helper: { new (owner: Owner | undefined, args: Arguments): TestHelper },
    args: Arguments
  ) {
    return new Helper(this.owner, args);
  }

  getValue(instance: TestHelper) {
    return instance.value();
  }

  getDestroyable(instance: TestHelper) {
    return instance;
  }

  getDebugName() {
    return 'TEST_HELPER';
  }
}

abstract class TestHelper {
  constructor(owner: Owner, public args: Arguments) {
    setOwner(this, owner);

    registerDestructor(this, () => this.willDestroy());
  }

  abstract value(): unknown;

  willDestroy() {}
}

setHelperManager((owner) => new TestHelperManager(owner), TestHelper);

class HelperManagerTest extends RenderTest {
  static suiteName = 'Helper Managers';

  @test 'it works'() {
    class Hello extends TestHelper {
      value() {
        return 'hello';
      }
    }

    const Main = defineComponent({ hello: Hello }, '{{hello}}');

    this.renderComponent(Main);

    this.assertHTML('hello');

    this.rerender();

    this.assertHTML('hello');
  }

  @test 'tracks changes to named arguments'(assert: Assert) {
    let count = 0;

    class Hello extends TestHelper {
      value() {
        count++;
        return this.args.named.foo;
      }
    }

    let args = trackedObj({ foo: 123 });

    this.renderComponent(defineComponent({ hello: Hello }, '{{hello foo=@foo}}'), args);

    assert.equal(count, 1, 'rendered once');
    this.assertHTML('123');

    this.rerender();

    assert.equal(count, 1, 'rendered once');
    this.assertHTML('123');

    args.foo = 456;
    this.rerender();

    assert.equal(count, 2, 'rendered twice');
    this.assertHTML('456');
  }

  @test 'tracks changes to positional arguments'(assert: Assert) {
    let count = 0;

    class Hello extends TestHelper {
      value() {
        count++;
        return this.args.positional[0];
      }
    }

    let args = trackedObj({ foo: 123 });

    this.renderComponent(defineComponent({ hello: Hello }, '{{hello @foo}}'), args);

    assert.equal(count, 1, 'rendered once');
    this.assertHTML('123');

    this.rerender();

    assert.equal(count, 1, 'rendered once');
    this.assertHTML('123');

    args.foo = 456;
    this.rerender();

    assert.equal(count, 2, 'rendered twice');
    this.assertHTML('456');
  }

  @test 'tracks changes to tracked properties'(assert: Assert) {
    let count = 0;
    let instance: Hello;

    class Hello extends TestHelper {
      @tracked foo = 123;

      constructor(owner: Owner, args: Arguments) {
        super(owner, args);
        instance = this;
      }

      value() {
        count++;
        return this.foo;
      }
    }
    this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));

    assert.equal(count, 1, 'rendered once');
    this.assertHTML('123');

    this.rerender();

    assert.equal(count, 1, 'rendered once');
    this.assertHTML('123');

    instance!.foo = 456;
    this.rerender();

    assert.equal(count, 2, 'rendered twice');
    this.assertHTML('456');
  }

  @test 'destroyable is associated correctly'(assert: Assert) {
    class Hello extends TestHelper {
      value() {
        return 'hello';
      }

      willDestroy() {
        assert.ok(true, 'destructor called');
      }
    }

    this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));

    this.assertHTML('hello');
  }

  @test 'debug name is used for backtracking message'(assert: Assert) {
    class Hello extends TestHelper {
      @tracked foo = 123;

      value() {
        // eslint-disable-next-line no-unused-expressions
        this.foo;
        this.foo = 456;
      }
    }

    assert.throws(() => {
      this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));
    }, /You attempted to update `foo` on/);
  }

  @test 'asserts against using both `hasValue` and `hasScheduledEffect`'(assert: Assert) {
    assert.throws(() => {
      helperCapabilities('3.23', {
        hasValue: true,
        hasScheduledEffect: true,
      });
    }, /You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted./);
  }

  @test 'asserts requiring either `hasValue` or `hasScheduledEffect`'(assert: Assert) {
    assert.throws(() => {
      helperCapabilities('3.23', {});
    }, /You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted./);
  }

  @test 'asserts against using `hasScheduledEffect`'(assert: Assert) {
    assert.throws(() => {
      helperCapabilities('3.23', {
        hasScheduledEffect: true,
      });
    }, /The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead/);
  }

  @test 'asserts against using incorrect version for capabilities'(assert: Assert) {
    assert.throws(() => {
      helperCapabilities('aoeu' as any, {
        hasScheduledEffect: true,
      });
    }, /Invalid helper manager compatibility specified/);
  }

  @test 'helper manager and modifier manager can be associated with the same value'() {
    abstract class TestModifierHelper extends TestHelper {}

    setModifierManager(() => ({} as any), TestHelper);

    class Hello extends TestModifierHelper {
      value() {
        return 'hello';
      }
    }

    this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));

    this.assertHTML('hello');

    this.rerender();

    this.assertHTML('hello');
  }

  @test 'capabilities helper function must be used to generate capabilities'(assert: Assert) {
    class OverrideTestHelperManager extends TestHelperManager {
      capabilities = {
        hasValue: true,
        hasDestroyable: true,
        hasScheduledEffect: false,
      } as any;
    }

    class TestHelper {}

    setHelperManager((owner) => new OverrideTestHelperManager(owner), TestHelper);

    class Hello extends TestHelper {
      value() {
        return 'hello';
      }
    }

    assert.throws(() => {
      this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));
    }, /Custom helper managers must have a `capabilities` property that is the result of calling the `capabilities\('3.23'\)` \(imported via `import \{ capabilities \} from '@ember\/helper';`\). /);
  }

  @test
  'custom helpers gives helpful assertion when reading then mutating a tracked value within constructor'(
    assert: Assert
  ) {
    class Hello extends TestHelper {
      @tracked foo = 123;

      constructor(owner: Owner, args: Arguments) {
        super(owner, args);

        // first read the tracked property
        // eslint-disable-next-line no-unused-expressions
        this.foo;

        // then attempt to update the tracked property
        this.foo = 456;
      }

      value() {
        return this.foo;
      }
    }

    assert.throws(() => {
      this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));
    }, /You attempted to update `foo` on /);
  }

  @test
  'custom helpers gives helpful assertion when reading then mutating a tracked value within value'(
    assert: Assert
  ) {
    class Hello extends TestHelper {
      @tracked foo = 123;

      value() {
        // first read the tracked property
        // eslint-disable-next-line no-unused-expressions
        this.foo;

        // then attempt to update the tracked property
        this.foo = 456;
      }
    }

    assert.throws(() => {
      this.renderComponent(defineComponent({ hello: Hello }, '{{hello}}'));
    }, /You attempted to update `foo` on /);
  }
}

jitSuite(HelperManagerTest);
