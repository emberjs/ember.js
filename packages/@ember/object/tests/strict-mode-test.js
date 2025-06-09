import EmberObject from '@ember/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'strict mode tests',
  class extends AbstractTestCase {
    ['@test __superWrapper does not throw errors in strict mode'](assert) {
      let Foo = class extends EmberObject {
        blah() {
          return 'foo';
        }
      };

      let Bar = class extends Foo {
        blah() {
          return 'bar';
        }

        callBlah() {
          let blah = this.blah;

          return blah();
        }
      };

      let bar = Bar.create();

      assert.equal(bar.callBlah(), 'bar', 'can call local function without call/apply');
    }
  }
);
