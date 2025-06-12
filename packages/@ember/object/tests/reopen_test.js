import { get } from '@ember/object';
import CoreObject from '@ember/object/core';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

// TODO: Update these tests (or the title) to match each other.
moduleFor(
  'system/core_object/reopen',
  class extends AbstractTestCase {
    ['@test adds new properties to subclass instance'](assert) {
      let Subclass = class extends CoreObject {};
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
      let Subclass = class extends CoreObject {};
      let SubSub = class extends Subclass {};

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
      let Subclass = class extends CoreObject {};

      Subclass.create();

      Subclass.reopen({
        trololol: true,
      });

      let instance = Subclass.create();

      assert.equal(get(instance, 'trololol'), true, 'reopen works');
    }
  }
);
