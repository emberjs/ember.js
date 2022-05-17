import Enumerable from '@ember/enumerable';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Enumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      assert.ok(Enumerable.detect(A()));
    }

    ['@test should be mixed into ArrayProxy'](assert) {
      assert.ok(Enumerable.detect(ArrayProxy.create()));
    }
  }
);
