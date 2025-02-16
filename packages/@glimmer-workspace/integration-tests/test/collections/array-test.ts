import { TrackedArray } from '@glimmer/validator';
import {
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

const ARRAY_GETTER_METHODS = [
  'concat',
  'entries',
  'every',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'forEach',
  'includes',
  'indexOf',
  'join',
  'keys',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'values',
];

const ARRAY_SETTER_METHODS = [
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
];

class TrackedArrayTest extends RenderTest {
  static suiteName = `TrackedArray (rendering)`;

  @test
  'getting and setting an index'() {
    this.assertReactivity(
      class extends Component {
        arr = new TrackedArray(['foo']);

        get value() {
          return this.arr[0];
        }

        update() {
          this.arr[0] = 'bar';
        }
      }
    );
  }

  @test
  'Can push into a newly created TrackedArray during construction'() {
    this.assertReactivity(
      class extends Component {
        arr = new TrackedArray<string>();

        constructor(...args: unknown[]) {
          super(...args);
          this.arr.push('hello');
        }

        get value() {
          return this.arr[0];
        }

        update() {
          this.arr[0] = 'goodbye';
        }
      }
    );
  }

  @test
  'Can unshift into a newly created TrackedArray during construction'() {
    this.assertReactivity(
      class extends Component {
        arr = new TrackedArray<string>();

        constructor(...args: unknown[]) {
          super(...args);
          this.arr.unshift('hello');
        }

        get value() {
          return this.arr[0];
        }

        update() {
          this.arr[0] = 'goodbye';
        }
      }
    );
  }

  @test
  '{{each}} works with new items'() {
    this.assertEachReactivity(
      class extends Component {
        collection = new TrackedArray([1, 2, 3]);

        update() {
          this.collection.push(4);
        }
      }
    );
  }

  @test
  '{{each}} works when updating old items'() {
    this.assertEachReactivity(
      class extends Component {
        collection = new TrackedArray([1, 2, 3]);

        update() {
          this.collection[2] = 5;
        }
      }
    );
  }

  @test({ skip: true })
  '{{each-in}} works with new items'() {
    this.assertEachInReactivity(
      class extends Component {
        collection = new TrackedArray([1, 2, 3]);

        update() {
          this.collection.push(4);
        }
      }
    );
  }

  @test({ skip: true })
  '{{each-in}} works when updating old items'() {
    this.assertEachInReactivity(
      class extends Component {
        collection = new TrackedArray([1, 2, 3]);

        update() {
          this.collection[2] = 5;
        }
      }
    );
  }

  @test
  ARRAY_GETTER_METHODS() {
    ARRAY_GETTER_METHODS.forEach((method) => {
      this.assertReactivity(
        class extends Component {
          arr = new TrackedArray(['foo', 'bar']);

          get value() {
            // @ts-expect-error -- this can't be represented easily in TS, and we
            // don't actually care that it is; we're *just* testing reactivity.
            return this.arr[method](() => {
              /* no op */
            });
          }

          update() {
            this.arr[0] = 'bar';
          }
        },
        true,
        `[[${method} individual index]]`
      );

      this.assertReactivity(
        class extends Component {
          arr = new TrackedArray(['foo', 'bar']);

          get value() {
            // @ts-expect-error -- this can't be represented easily in TS, and we
            // don't actually care that it is; we're *just* testing reactivity.
            return this.arr[method](() => {
              /* no op */
            });
          }

          update() {
            this.arr.sort();
          }
        },
        true,
        `[[${method} collection tag]]`
      );
    });
  }

  @test
  ARRAY_SETTER_METHODS() {
    ARRAY_SETTER_METHODS.forEach((method) => {
      this.assertReactivity(
        class extends Component {
          arr = new TrackedArray(['foo', 'bar']);

          get value() {
            return this.arr[0];
          }

          update() {
            // @ts-expect-error -- this can't be represented easily in TS, and we
            // don't actually care that it is; we're *just* testing reactivity.
            this.arr[method](undefined);
          }
        },
        true,
        `[[${method} individual index]]`
      );

      this.assertReactivity(
        class extends Component {
          arr = new TrackedArray(['foo', 'bar']);

          get value() {
            return void this.arr.forEach(() => {
              /* no op */
            });
          }

          update() {
            // @ts-expect-error -- this can't be represented easily in TS, and we
            // don't actually care that it is; we're *just* testing reactivity.
            this.arr[method](undefined);
          }
        },
        true,

        `[[${method} collection tag]]`
      );
    });
  }
}

jitSuite(TrackedArrayTest);
