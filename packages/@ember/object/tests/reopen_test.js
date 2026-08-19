import EmberObject, { get } from '@ember/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { classicReopen } from '@ember/object/lib/classic';

// TODO: Update these tests (or the title) to match each other.
moduleFor(
  'system/core_object/reopen',
  class extends AbstractTestCase {
    ['@test adds new properties to subclass instance'](assert) {
      let Subclass = class extends EmberObject {};
      classicReopen(Subclass, {
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      assert.equal(Subclass.create().foo(), 'FOO', 'Adds method');
      assert.equal(get(Subclass.create(), 'bar'), 'BAR', 'Adds property');
    }

    ['@test reopened properties inherited by subclasses'](assert) {
      let Subclass = class extends EmberObject {};
      let SubSub = class extends Subclass {};

      classicReopen(Subclass, {
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      assert.equal(SubSub.create().foo(), 'FOO', 'Adds method');
      assert.equal(get(SubSub.create(), 'bar'), 'BAR', 'Adds property');
    }

    ['@test allows reopening already instantiated classes'](assert) {
      let Subclass = class extends EmberObject {};

      Subclass.create();

      classicReopen(Subclass, {
        trololol: true,
      });

      assert.equal(Subclass.create().get('trololol'), true, 'reopen works');
    }
  }
);
