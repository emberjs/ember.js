import { get } from 'ember-metal';
import EmberObject from '../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/core_object/reopen',
  class extends AbstractTestCase {
    ['@test adds new properties to subclass instance'](assert) {
      let Subclass = EmberObject.extend();
      Subclass.reopen({
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      assert.equal(new Subclass().foo(), 'FOO', 'Adds method');
      assert.equal(get(new Subclass(), 'bar'), 'BAR', 'Adds property');
    }

    ['@test reopened properties inherited by subclasses'](assert) {
      let Subclass = EmberObject.extend();
      let SubSub = Subclass.extend();

      Subclass.reopen({
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      assert.equal(new SubSub().foo(), 'FOO', 'Adds method');
      assert.equal(get(new SubSub(), 'bar'), 'BAR', 'Adds property');
    }

    ['@test allows reopening already instantiated classes'](assert) {
      let Subclass = EmberObject.extend();

      Subclass.create();

      Subclass.reopen({
        trololol: true,
      });

      assert.equal(Subclass.create().get('trololol'), true, 'reopen works');
    }
  }
);
