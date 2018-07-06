import { get } from 'ember-metal';
import EmberObject from '../../../lib/system/object';
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

      assert.equal(Subclass.create().foo(), 'FOO', 'Adds method');
      assert.equal(get(Subclass.create(), 'bar'), 'BAR', 'Adds property');
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

      assert.equal(SubSub.create().foo(), 'FOO', 'Adds method');
      assert.equal(get(SubSub.create(), 'bar'), 'BAR', 'Adds property');
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
