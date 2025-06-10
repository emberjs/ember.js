import { get } from '@ember/object';
import EmberObject from '@ember/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/object/reopenClass',
  class extends AbstractTestCase {
    ['@test adds new properties to subclass'](assert) {
      let Subclass = class extends EmberObject {};
      Subclass.reopenClass({
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      assert.equal(Subclass.foo(), 'FOO', 'Adds method');
      assert.equal(get(Subclass, 'bar'), 'BAR', 'Adds property');
    }

    ['@test class properties inherited by subclasses'](assert) {
      let Subclass = class extends EmberObject {};
      Subclass.reopenClass({
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      let SubSub = class extends Subclass {};

      assert.equal(SubSub.foo(), 'FOO', 'Adds method');
      assert.equal(get(SubSub, 'bar'), 'BAR', 'Adds property');
    }
  }
);
