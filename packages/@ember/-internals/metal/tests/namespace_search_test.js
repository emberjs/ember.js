import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'NamespaceSearch',
  class extends AbstractTestCase {
    // TODO: Do we want to test for this case?
    // ['@test classToString: null as this inside class must not throw error'](assert) {
    //   let mixin = Mixin.create();
    //   assert.equal(
    //     mixin.toString(),
    //     '(unknown mixin)',
    //     'this = null should be handled on Mixin.toString() call'
    //   );
    // }
  }
);
