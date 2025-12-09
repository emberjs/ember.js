import { trackedObject } from '@glimmer/validator';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class TrackedObjectTest extends RenderTest {
  static suiteName = `trackedObject() (rendering)`;

  @test
  'it works when used directly in a template'() {
    const obj = trackedObject<Record<PropertyKey, unknown>>({ foo: 123 });

    const Foo = defineComponent({ obj }, '{{obj.foo}}');

    this.renderComponent(Foo);

    this.assertHTML('123');

    obj['foo'] = 456;
    this.rerender();

    this.assertHTML('456');
    this.assertStableRerender();
  }

  @test
  'options.equals: default equals does not dirty on no-op changes'(assert: Assert) {
    const obj = trackedObject({ foo: '123' });
    const step = (x: string) => {
      assert.step(x);
      return x;
    };

    const Foo = defineComponent({ step, obj }, '{{step obj.foo}}');

    this.renderComponent(Foo);

    this.assertHTML('123');
    assert.verifySteps(['123']);

    obj['foo'] = '123';
    this.rerender();

    this.assertHTML('123');
    this.assertStableRerender();
    assert.verifySteps([]);
  }

  @test
  'options.equals: using equals can dirty on every change'(assert: Assert) {
    const obj = trackedObject({ foo: '123' }, { equals: () => false });
    const step = (x: string) => {
      assert.step(x);
      return x;
    };

    const Foo = defineComponent({ step, obj }, '{{step obj.foo}}');

    this.renderComponent(Foo);

    this.assertHTML('123');
    assert.verifySteps(['123']);

    obj['foo'] = '123';
    this.rerender();

    this.assertHTML('123');
    this.assertStableRerender();
    assert.verifySteps(['123']);
  }

  @test
  'each: set existing value'() {
    this.assertEachReactivity(
      class extends Component {
        collection = trackedObject({ foo: 123 }, { equals: () => false });
        update() {
          this.collection.foo = 789;
        }
      }
    );
  }

  // TODO: glimmer-vm does not implement each-in, so we can't test this just yet
  //   eachInReactivityTest(
  //     '{{each-in}} works with new items',
  //     class extends Component {
  //       collection = trackedObject<Record<string, number>>({
  //         foo: 123,
  //       });
  //
  //       update() {
  //         this.collection['bar'] = 456;
  //       }
  //     }
  //   );
  //
  //   eachInReactivityTest(
  //     '{{each-in}} works when updating old items',
  //     class extends Component {
  //       collection = trackedObject({
  //         foo: 123,
  //       });
  //
  //       update() {
  //         this.collection.foo = 456;
  //       }
  //     }
  //   );

  @test
  'it works'() {
    this.assertReactivity(
      class extends Component {
        obj = trackedObject<{ foo?: number }>();

        get value() {
          return this.obj['foo'];
        }

        update() {
          this.obj['foo'] = 123;
        }
      }
    );
  }

  @test
  'in operator works'() {
    this.assertReactivity(
      class extends Component {
        obj = trackedObject<{ foo?: number }>();

        get value() {
          return 'foo' in this.obj;
        }

        update() {
          this.obj['foo'] = 123;
        }
      }
    );
  }

  @test
  'for in works'() {
    this.assertReactivity(
      class extends Component {
        obj = trackedObject<{ foo?: number }>();

        get value() {
          let keys = [];

          for (let key in this.obj) {
            keys.push(key);
          }

          return keys;
        }

        update() {
          this.obj['foo'] = 123;
        }
      }
    );
  }

  @test
  'Object.keys works'() {
    this.assertReactivity(
      class extends Component {
        obj = trackedObject<{ foo?: number }>();

        get value() {
          return Object.keys(this.obj);
        }

        update() {
          this.obj['foo'] = 123;
        }
      }
    );
  }

  @test
  'delete works'() {
    this.assertReactivity(
      class extends Component {
        obj: { foo?: number } = trackedObject({ foo: 1 });

        get value() {
          return this.obj.foo;
        }

        update() {
          delete this.obj.foo;
        }
      }
    );
  }
}

jitSuite(TrackedObjectTest);
