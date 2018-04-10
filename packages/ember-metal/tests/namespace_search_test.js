import { classToString, Mixin } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'NamespaceSearch',
  class extends AbstractTestCase {
    ['@test classToString: null as this inside class must not throw error'](assert) {
      let mixin = Mixin.create();
      assert.equal(mixin.toString(), '(unknown)', 'this = null should be handled on Mixin.toString() call');
      assert.equal(classToString(mixin), '(unknown)', 'this = null should be handled on classToString over mixin');
    }
  }
);
