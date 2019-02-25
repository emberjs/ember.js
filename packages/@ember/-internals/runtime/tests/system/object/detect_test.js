import EmberObject from '../../../lib/system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/object/detect',
  class extends AbstractTestCase {
    ['@test detect detects classes correctly'](assert) {
      let A = EmberObject.extend();
      let B = A.extend();
      let C = A.extend();

      assert.ok(EmberObject.detect(EmberObject), 'EmberObject is an EmberObject class');
      assert.ok(EmberObject.detect(A), 'A is an EmberObject class');
      assert.ok(EmberObject.detect(B), 'B is an EmberObject class');
      assert.ok(EmberObject.detect(C), 'C is an EmberObject class');

      assert.ok(!A.detect(EmberObject), 'EmberObject is not an A class');
      assert.ok(A.detect(A), 'A is an A class');
      assert.ok(A.detect(B), 'B is an A class');
      assert.ok(A.detect(C), 'C is an A class');

      assert.ok(!B.detect(EmberObject), 'EmberObject is not a B class');
      assert.ok(!B.detect(A), 'A is not a B class');
      assert.ok(B.detect(B), 'B is a B class');
      assert.ok(!B.detect(C), 'C is not a B class');

      assert.ok(!C.detect(EmberObject), 'EmberObject is not a C class');
      assert.ok(!C.detect(A), 'A is not a C class');
      assert.ok(!C.detect(B), 'B is not a C class');
      assert.ok(C.detect(C), 'C is a C class');
    }
  }
);
