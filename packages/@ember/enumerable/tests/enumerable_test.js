import Enumerable from '@ember/enumerable';
import { A } from '@ember/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Enumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      assert.ok(Enumerable.detect(A()));
    }
  }
);
