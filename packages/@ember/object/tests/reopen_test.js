import { DEPRECATIONS } from '@ember/-internals/deprecations';
import EmberObject, { get } from '@ember/object';
import {
  moduleFor,
  AbstractTestCase,
  testUnless,
  expectClassicClassDeprecation,
} from 'internal-test-helpers';

// TODO: Update these tests (or the title) to match each other.
moduleFor(
  'system/core_object/reopen',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isRemoved)} @test adds new properties to subclass instance`](
      assert
    ) {
      expectClassicClassDeprecation();

      let Subclass = class extends EmberObject {};
      Subclass.reopen({
        foo() {
          return 'FOO';
        },
        bar: 'BAR',
      });

      assert.equal(Subclass.create().foo(), 'FOO', 'Adds method');
      assert.equal(get(Subclass.create(), 'bar'), 'BAR', 'Adds property');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isRemoved)} @test reopened properties inherited by subclasses`](
      assert
    ) {
      expectClassicClassDeprecation();

      let Subclass = class extends EmberObject {};
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

    [`${testUnless(DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isRemoved)} @test allows reopening already instantiated classes`](
      assert
    ) {
      expectClassicClassDeprecation();

      let Subclass = class extends EmberObject {};

      Subclass.create();

      Subclass.reopen({
        trololol: true,
      });

      assert.equal(Subclass.create().get('trololol'), true, 'reopen works');
    }
  }
);
