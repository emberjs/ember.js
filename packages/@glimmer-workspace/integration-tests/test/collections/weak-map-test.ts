import { trackedWeakMap } from '@glimmer/validator';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class TrackedWeakMapTest extends RenderTest {
  static suiteName = `trackedWeakMap() (rendering)`;

  @test
  'options.equals: default equals does not dirty on no-op changes'(assert: Assert) {
    const key = {};
    const obj = trackedWeakMap([[key, '123']]);

    const step = () => {
      assert.step(obj.get(key) ?? '');
      return obj.get(key);
    };

    const Foo = defineComponent({ step, obj }, '{{ (step) }}');

    this.renderComponent(Foo);

    this.assertHTML('123');
    assert.verifySteps(['123']);

    obj.set(key, '123');
    this.rerender();

    this.assertHTML('123');
    this.assertStableRerender();
    assert.verifySteps([]);
  }

  @test
  'options.equals: using equals can dirty on every change'(assert: Assert) {
    const key = {};
    const obj = trackedWeakMap([[key, '123']], { equals: () => false });

    const step = () => {
      assert.step(obj.get(key) ?? '');
      return obj.get(key);
    };

    const Foo = defineComponent({ step, obj }, '{{ (step) }}');

    this.renderComponent(Foo);

    this.assertHTML('123');
    assert.verifySteps(['123']);

    obj.set(key, '123');
    this.rerender();

    this.assertHTML('123');
    this.assertStableRerender();
    assert.verifySteps(['123']);
  }

  @test
  'get/set'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        map = trackedWeakMap();

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.set(this.obj, 123);
        }
      }
    );
  }

  @test
  'get/set existing value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        map = trackedWeakMap([[this.obj, 456]]);

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.set(this.obj, 123);
        }
      }
    );
  }

  @test
  'get/set existing value set to the same value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        map = trackedWeakMap([[this.obj, 456]]);

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.set(this.obj, 456);
        }
      },
      false
    );
  }

  @test
  'get/set existing value set to the same value (always dirtying)'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        map = trackedWeakMap([[this.obj, 456]], { equals: () => false });

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.set(this.obj, 456);
        }
      }
    );
  }

  @test
  'get/set unrelated value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        obj2 = {};
        map = trackedWeakMap([[this.obj, 456]]);

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.set(this.obj2, 123);
        }
      },
      false
    );
  }

  @test has() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        map = trackedWeakMap();

        get value() {
          return this.map.has(this.obj);
        }

        update() {
          this.map.set(this.obj, 123);
        }
      }
    );
  }

  @test delete() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        map = trackedWeakMap([[this.obj, 123]]);

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.delete(this.obj);
        }
      }
    );
  }

  @test 'delete unrelated value'() {
    this.assertReactivity(
      class extends Component {
        obj = {};
        obj2 = {};
        map = trackedWeakMap([
          [this.obj, 123],
          [this.obj2, 456],
        ]);

        get value() {
          return this.map.get(this.obj);
        }

        update() {
          this.map.delete(this.obj2);
        }
      },
      false
    );
  }
}

jitSuite(TrackedWeakMapTest);
