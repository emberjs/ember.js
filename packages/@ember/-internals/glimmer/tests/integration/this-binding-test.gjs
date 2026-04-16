import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

moduleFor(
  'Path expression this-binding for class methods',
  class extends RenderingTestCase {
    ['@test foo.foo maintains this binding when invoked from a template'](assert) {
      let instance;
      let seenThis;

      class Foo {
        constructor() {
          instance = this;
        }

        foo() {
          seenThis = this;
        }
      }

      let foo = new Foo();

      let TestComponent = <template>{{ (foo.foo) }}</template>;
      this.render(`<this.TestComponent />`, { TestComponent });

      assert.strictEqual(seenThis, instance, 'this binding is maintained');
    }
  }
);
