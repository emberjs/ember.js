import EmberObject from '../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('strict mode tests', class extends AbstractTestCase {
  ['@test __superWrapper does not throw errors in strict mode'](assert) {
    let Foo = EmberObject.extend({
      blah() {
        return 'foo';
      }
    });

    let Bar = Foo.extend({
      blah() {
        return 'bar';
      },

      callBlah() {
        let blah = this.blah;

        return blah();
      }
    });

    let bar = Bar.create();

    assert.equal(bar.callBlah(), 'bar', 'can call local function without call/apply');
  }
});
