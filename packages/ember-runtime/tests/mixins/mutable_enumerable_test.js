import MutableEnumerable from '../../mixins/mutable_enumerable';
import ArrayProxy from '../../system/array_proxy';
import { A } from '../../mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('MutableEnumerable', class extends AbstractTestCase {
  ['@test should be mixed into A()'](assert) {
    assert.ok(MutableEnumerable.detect(A()));
  }

  ['@test should be mixed into ArrayProxy'](assert) {
    assert.ok(MutableEnumerable.detect(ArrayProxy.create()));
  }
});

