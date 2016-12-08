import EmberObject from '../../../system/object';

QUnit.module('system/object/detect');

QUnit.test('detect detects classes correctly', function() {
  let A = EmberObject.extend();
  let B = A.extend();
  let C = A.extend();

  ok(EmberObject.detect(EmberObject), 'EmberObject is an EmberObject class');
  ok(EmberObject.detect(A), 'A is an EmberObject class');
  ok(EmberObject.detect(B), 'B is an EmberObject class');
  ok(EmberObject.detect(C), 'C is an EmberObject class');

  ok(!A.detect(EmberObject), 'EmberObject is not an A class');
  ok(A.detect(A), 'A is an A class');
  ok(A.detect(B), 'B is an A class');
  ok(A.detect(C), 'C is an A class');

  ok(!B.detect(EmberObject), 'EmberObject is not a B class');
  ok(!B.detect(A), 'A is not a B class');
  ok(B.detect(B), 'B is a B class');
  ok(!B.detect(C), 'C is not a B class');

  ok(!C.detect(EmberObject), 'EmberObject is not a C class');
  ok(!C.detect(A), 'A is not a C class');
  ok(!C.detect(B), 'B is not a C class');
  ok(C.detect(C), 'C is a C class');
});
