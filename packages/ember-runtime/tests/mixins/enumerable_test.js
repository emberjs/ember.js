import Enumerable from '../../mixins/enumerable';
import ArrayProxy from '../../system/array_proxy';
import { A } from '../../mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('Enumerable', class extends AbstractTestCase {
  ['@test should be mixed into A()'](assert) {
    assert.ok(Enumerable.detect(A()));
  }

  ['@test should be mixed into ArrayProxy'](assert) {
    assert.ok(Enumerable.detect(ArrayProxy.create()));
  }
});
