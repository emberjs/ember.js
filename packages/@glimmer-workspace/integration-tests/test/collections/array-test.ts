import { TrackedArray } from '@glimmer/validator';
import {
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { reactivityTest } from '../-helpers/reactivity';

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
    reactivityTest(
      this,
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
    reactivityTest(
      this,
      class extends Component {
        arr = new TrackedArray<string>();

        constructor(owner: Owner, args: object) {
          super(owner, args);
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
    reactivityTest(
      this,
      class extends Component {
        arr = new TrackedArray<string>();

        constructor(owner: Owner, args: object) {
          super(owner, args);
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
}

jitSuite(TrackedArrayTest);

// QUnit.module('reactivity', () => {
//   eachReactivityTest(
//     '{{each}} works with new items',
//     class extends Component {
//       collection = new TrackedArray([1, 2, 3]);
//
//       update() {
//         this.collection.push(4);
//       }
//     }
//   );
//
//   eachReactivityTest(
//     '{{each}} works when updating old items',
//     class extends Component {
//       collection = new TrackedArray([1, 2, 3]);
//
//       update() {
//         this.collection[2] = 5;
//       }
//     }
//   );
//
//   eachInReactivityTest(
//     '{{each-in}} works with new items',
//     class extends Component {
//       collection = new TrackedArray([1, 2, 3]);
//
//       update() {
//         this.collection.push(4);
//       }
//     }
//   );
//
//   eachInReactivityTest(
//     '{{each-in}} works when updating old items',
//     class extends Component {
//       collection = new TrackedArray([1, 2, 3]);
//
//       update() {
//         this.collection[2] = 5;
//       }
//     }
//   );
//
//   ARRAY_GETTER_METHODS.forEach((method) => {
//     reactivityTest(
//       `${method} individual index`,
//       class extends Component {
//         arr = new TrackedArray(['foo', 'bar']);
//
//         get value() {
//           // @ts-ignore -- this can't be represented easily in TS, and we
//           // don't actually care that it is; we're *just* testing reactivity.
//           return this.arr[method](() => {
//             /* no op */
//           });
//         }
//
//         update() {
//           this.arr[0] = 'bar';
//         }
//       }
//     );
//
//     reactivityTest(
//       `${method} collection tag`,
//       class extends Component {
//         arr = new TrackedArray(['foo', 'bar']);
//
//         get value() {
//           // @ts-ignore -- this can't be represented easily in TS, and we
//           // don't actually care that it is; we're *just* testing reactivity.
//           return this.arr[method](() => {
//             /* no op */
//           });
//         }
//
//         update() {
//           this.arr.sort();
//         }
//       }
//     );
//   });
//
//   ARRAY_SETTER_METHODS.forEach((method) => {
//     reactivityTest(
//       `${method} individual index`,
//       class extends Component {
//         arr = new TrackedArray(['foo', 'bar']);
//
//         get value() {
//           return this.arr[0];
//         }
//
//         update() {
//           // @ts-ignore -- this can't be represented easily in TS, and we
//           // don't actually care that it is; we're *just* testing reactivity.
//           this.arr[method](undefined);
//         }
//       }
//     );
//
//     reactivityTest(
//       `${method} collection tag`,
//       class extends Component {
//         arr = new TrackedArray(['foo', 'bar']);
//
//         get value() {
//           return void this.arr.forEach(() => {
//             /* no op */
//           });
//         }
//
//         update() {
//           // @ts-ignore -- this can't be represented easily in TS, and we
//           // don't actually care that it is; we're *just* testing reactivity.
//           this.arr[method](undefined);
//         }
//       }
//     );
//   });
// });
