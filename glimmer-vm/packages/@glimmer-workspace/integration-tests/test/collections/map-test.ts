import { trackedMap } from '@glimmer/validator';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class TrackedMapTest extends RenderTest {
  static suiteName = `trackedMap() (rendering)`;

  @test
  'options.equals: default equals does not dirty on no-op changes'(assert: Assert) {
    const obj = trackedMap([['foo', '123']]);
    const step = () => {
      assert.step(obj.get('foo') ?? '');
      return obj.get('foo');
    };

    const Foo = defineComponent({ step, obj }, '{{ (step) }}');

    this.renderComponent(Foo);

    this.assertHTML('123');
    assert.verifySteps(['123']);

    obj.set('foo', '123');
    this.rerender();

    this.assertHTML('123');
    this.assertStableRerender();
    assert.verifySteps([]);
  }

  @test
  'options.equals: using equals can dirty on every change'(assert: Assert) {
    const obj = trackedMap([['foo', '123']], { equals: () => false });
    const step = () => {
      assert.step(obj.get('foo') ?? '');
      return obj.get('foo');
    };

    const Foo = defineComponent({ step, obj }, '{{ (step) }}');

    this.renderComponent(Foo);

    this.assertHTML('123');
    assert.verifySteps(['123']);

    obj.set('foo', '123');
    this.rerender();

    this.assertHTML('123');
    this.assertStableRerender();
    assert.verifySteps(['123']);
  }

  @test
  'get/set'() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          return this.map.get('foo');
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  'get/set existing value'() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap([['foo', 456]]);

        get value() {
          return this.map.get('foo');
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  'get/set unrelated value'() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap([['foo', 456]]);

        get value() {
          return this.map.get('foo');
        }

        update() {
          this.map.set('bar', 123);
        }
      },
      false
    );
  }

  @test
  has() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          return this.map.has('foo');
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  entries() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          return this.map.entries();
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  keys() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          return this.map.keys();
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  values() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          return this.map.values();
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  forEach() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          this.map.forEach(() => {
            /* no op! */
          });
          return 'test';
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  size() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap();

        get value() {
          return this.map.size;
        }

        update() {
          this.map.set('foo', 123);
        }
      }
    );
  }

  @test
  delete() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap([['foo', 123]]);

        get value() {
          return this.map.get('foo');
        }

        update() {
          this.map.delete('foo');
        }
      }
    );
  }

  @test
  'delete unrelated value'() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap([
          ['foo', 123],
          ['bar', 456],
        ]);

        get value() {
          return this.map.get('foo');
        }

        update() {
          this.map.delete('bar');
        }
      },
      false
    );
  }

  @test
  clear() {
    this.assertReactivity(
      class extends Component {
        map = trackedMap([['foo', 123]]);

        get value() {
          return this.map.get('foo');
        }

        update() {
          this.map.clear();
        }
      }
    );
  }

  @test
  'each: set'() {
    this.assertEachReactivity(
      class extends Component {
        collection = trackedMap([['foo', 123]]);
        update() {
          this.collection.set('bar', 456);
        }
      }
    );
  }

  @test
  'each: set matching existing value'() {
    this.assertEachReactivity(
      class extends Component {
        collection = trackedMap([['foo', 123]]);
        update() {
          this.collection.set('foo', 123);
        }
      }
    );
  }

  @test
  'each: set existing value'() {
    this.assertEachReactivity(
      class extends Component {
        collection = trackedMap([['foo', 123]], { equals: () => false });
        update() {
          this.collection.set('foo', 789);
        }
      }
    );
  }

  // SKIPPED for now because glimmer-vm doesn't implement each-in
  // @test
  'each-in: set'() {
    this.assertEachInReactivity(
      class extends Component {
        collection = trackedMap([['foo', 123]]);

        update() {
          this.collection.set('bar', 456);
        }
      }
    );
  }

  // SKIPPED for now because glimmer-vm doesn't implement each-in
  // @test
  'each-in: set existing value'() {
    this.assertEachInReactivity(
      class extends Component {
        collection = trackedMap([['foo', 123]]);

        update() {
          this.collection.set('foo', 789);
        }
      }
    );
  }
}

jitSuite(TrackedMapTest);
