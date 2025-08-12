import { trackedWeakSet } from '@glimmer/validator';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class TrackedWeakSetTest extends RenderTest {
  static suiteName = `trackedWeakSet() (rendering)`;

  @test
  'options.equals: default equals does not dirty on no-op changes'(assert: Assert) {
    let key = { foo: '123' };
    const obj = trackedWeakSet([key]);
    const step = () => {
      let str = String(obj.has(key));
      assert.step(str);
      return str;
    };

    const Foo = defineComponent({ step }, '{{(step)}}');

    this.renderComponent(Foo);

    this.assertHTML('true');
    assert.verifySteps(['true']);

    obj.add(key);
    this.rerender();

    this.assertHTML('true');
    this.assertStableRerender();
    assert.verifySteps([]);
  }

  @test
  'options.equals: using equals can dirty on every change'(assert: Assert) {
    let key = { foo: '123' };
    const obj = trackedWeakSet([key], { equals: () => false });
    const step = () => {
      let str = String(obj.has(key));
      assert.step(str);
      return str;
    };

    const Foo = defineComponent({ step }, '{{(step)}}');

    this.renderComponent(Foo);

    this.assertHTML('true');
    assert.verifySteps(['true']);

    obj.add(key);
    this.rerender();

    this.assertHTML('true');
    this.assertStableRerender();
    assert.verifySteps(['true']);
  }

  @test
  'add/has'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        set = trackedWeakSet();

        get value() {
          return this.set.has(this.obj);
        }

        update() {
          this.set.add(this.obj);
        }
      }
    );
  }

  @test
  'add/has existing value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        set = trackedWeakSet([this.obj]);

        get value() {
          return this.set.has(this.obj);
        }

        update() {
          this.set.add(this.obj);
        }
      },
      false
    );
  }

  @test
  'add/has existing value (always invalidates)'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        set = trackedWeakSet([this.obj], { equals: () => false });

        get value() {
          return this.set.has(this.obj);
        }

        update() {
          this.set.add(this.obj);
        }
      }
    );
  }

  @test
  'add/has unrelated value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        obj2 = {};
        set = trackedWeakSet();

        get value() {
          return this.set.has(this.obj);
        }

        update() {
          this.set.add(this.obj2);
        }
      },
      false
    );
  }

  @test
  delete() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        obj2 = {};
        set = trackedWeakSet([this.obj, this.obj2]);

        get value() {
          return this.set.has(this.obj);
        }

        update() {
          this.set.delete(this.obj);
        }
      }
    );
  }

  @test
  'delete unrelated value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        obj2 = {};
        set = trackedWeakSet([this.obj, this.obj2]);

        get value() {
          return this.set.has(this.obj);
        }

        update() {
          this.set.delete(this.obj2);
        }
      },
      false
    );
  }
}

jitSuite(TrackedWeakSetTest);
