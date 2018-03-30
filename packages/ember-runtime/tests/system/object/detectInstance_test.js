import EmberObject from '../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/object/detectInstance',
  class extends AbstractTestCase {
    ['@test detectInstance detects instances correctly'](assert) {
      let A = EmberObject.extend();
      let B = A.extend();
      let C = A.extend();

      let o = EmberObject.create();
      let a = A.create();
      let b = B.create();
      let c = C.create();

      assert.ok(EmberObject.detectInstance(o), 'o is an instance of EmberObject');
      assert.ok(EmberObject.detectInstance(a), 'a is an instance of EmberObject');
      assert.ok(EmberObject.detectInstance(b), 'b is an instance of EmberObject');
      assert.ok(EmberObject.detectInstance(c), 'c is an instance of EmberObject');

      assert.ok(!A.detectInstance(o), 'o is not an instance of A');
      assert.ok(A.detectInstance(a), 'a is an instance of A');
      assert.ok(A.detectInstance(b), 'b is an instance of A');
      assert.ok(A.detectInstance(c), 'c is an instance of A');

      assert.ok(!B.detectInstance(o), 'o is not an instance of B');
      assert.ok(!B.detectInstance(a), 'a is not an instance of B');
      assert.ok(B.detectInstance(b), 'b is an instance of B');
      assert.ok(!B.detectInstance(c), 'c is not an instance of B');

      assert.ok(!C.detectInstance(o), 'o is not an instance of C');
      assert.ok(!C.detectInstance(a), 'a is not an instance of C');
      assert.ok(!C.detectInstance(b), 'b is not an instance of C');
      assert.ok(C.detectInstance(c), 'c is an instance of C');
    }
  }
);
