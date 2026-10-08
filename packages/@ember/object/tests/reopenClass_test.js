import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { get } from '@ember/object';
import EmberObject from '@ember/object';
import {
  moduleFor,
  AbstractTestCase,
  testUnless,
  expectClassicClassDeprecation,
} from 'internal-test-helpers';

moduleFor(
  'system/object/reopenClass',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isRemoved)} @test adds new properties to subclass`](
      assert
    ) {
      expectClassicClassDeprecation();

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

    [`${testUnless(DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isRemoved)} @test class properties inherited by subclasses`](
      assert
    ) {
      expectClassicClassDeprecation();

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
