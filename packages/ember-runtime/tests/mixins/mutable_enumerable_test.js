import MutableEnumerable from '../../lib/mixins/mutable_enumerable';
import ArrayProxy from '../../lib/system/array_proxy';
import { A } from '../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'MutableEnumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      assert.ok(MutableEnumerable.detect(A()));
    }

    ['@test should be mixed into ArrayProxy'](assert) {
      assert.ok(MutableEnumerable.detect(ArrayProxy.create()));
    }
  }
);
