import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { defineProperty, tracked, track, nativeDescDecorator } from '../..';

import { value, validate } from '@glimmer/validator';

moduleFor(
  '@tracked decorator - classic classes',
  class extends AbstractTestCase {
    [`@test validators for tracked getters with dependencies should invalidate when the dependencies invalidate`](
      assert
    ) {
      let obj = {};

      defineProperty(obj, 'first', tracked());
      defineProperty(obj, 'last', tracked());

      defineProperty(
        obj,
        'full',
        nativeDescDecorator({
          get() {
            return `${this.first} ${this.last}`;
          },

          set(value) {
            let [first, last] = value.split(' ');

            this.first = first;
            this.last = last;
          },
        })
      );

      obj.first = 'Tom';
      obj.last = 'Dale';

      let tag = track(() => obj.full);
      let snapshot = value(tag);

      assert.equal(obj.full, 'Tom Dale', 'The full name starts correct');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      obj.full = 'Melanie Sumner';

      assert.equal(validate(tag, snapshot), false);

      assert.equal(obj.full, 'Melanie Sumner');
      assert.equal(obj.first, 'Melanie');
      assert.equal(obj.last, 'Sumner');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);
    }

    [`@test can pass a default value to the tracked decorator`](assert) {
      class Tracked {
        get full() {
          return `${this.first} ${this.last}`;
        }
      }

      defineProperty(Tracked.prototype, 'first', tracked({ value: 'Tom' }));
      defineProperty(Tracked.prototype, 'last', tracked({ value: 'Dale' }));

      let obj = new Tracked();

      assert.equal(obj.full, 'Tom Dale', 'Default values are correctly assign');
    }

    [`@test errors if used directly on a classic class`]() {
      expectAssertion(() => {
        class Tracked {
          get full() {
            return `${this.first} ${this.last}`;
          }
        }

        defineProperty(Tracked.prototype, 'first', tracked);
      }, "@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()");
    }

    [`@test errors on any keys besides 'value', 'get', or 'set' being passed`]() {
      expectAssertion(() => {
        class Tracked {
          get full() {
            return `${this.first} ${this.last}`;
          }
        }

        defineProperty(
          Tracked.prototype,
          'first',
          tracked({
            foo() {},
          })
        );
      }, "The options object passed to tracked() may only contain a 'value' or 'initializer' property, not both. Received: [foo]");
    }

    [`@test errors if 'value' and 'get'/'set' are passed together`]() {
      expectAssertion(() => {
        class Tracked {
          get full() {
            return `${this.first} ${this.last}`;
          }
        }

        defineProperty(
          Tracked.prototype,
          'first',
          tracked({
            value: 123,
            initializer: () => 123,
          })
        );
      }, "The options object passed to tracked() may only contain a 'value' or 'initializer' property, not both. Received: [value,initializer]");
    }

    [`@test errors on anything besides an options object being passed`]() {
      expectAssertion(() => {
        class Tracked {
          get full() {
            return `${this.first} ${this.last}`;
          }
        }

        defineProperty(Tracked.prototype, 'first', tracked(null));
      }, "tracked() may only receive an options object containing 'value' or 'initializer', received null");
    }
  }
);

moduleFor(
  '@tracked decorator - native decorator behavior',
  class extends AbstractTestCase {
    [`@test errors if options are passed to native decorator`]() {
      expectAssertion(() => {
        class Tracked {
          @tracked() first;

          get full() {
            return `${this.first} ${this.last}`;
          }
        }

        new Tracked();
      }, "You attempted to set a default value for first with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';");
    }

    [`@test errors if options are passed to native decorator (GH#17764)`](assert) {
      class Tracked {
        @tracked value;
      }

      let obj = new Tracked();

      assert.strictEqual(obj.value, undefined, 'uninitilized value defaults to undefined');
    }
  }
);
