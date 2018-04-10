import { classToString } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'NamespaceSearch',
  class extends AbstractTestCase {
    ['@test classToString: null as this inside class must not throw error'](assert) {
      function F() {"use strict"; return this };
      result = classToString(F.bind(null);
      assert.equal(result, null, 'this = null should be handled');
    }
  }
);
