import EmberObject from '../../../system/object';

QUnit.module('system/object/detectInstance');

QUnit.test('detectInstance detects instances correctly', function() {
  let A = EmberObject.extend();
  let B = A.extend();
  let C = A.extend();

  let o = EmberObject.create();
  let a = A.create();
  let b = B.create();
  let c = C.create();

  ok(EmberObject.detectInstance(o), 'o is an instance of EmberObject');
  ok(EmberObject.detectInstance(a), 'a is an instance of EmberObject');
  ok(EmberObject.detectInstance(b), 'b is an instance of EmberObject');
  ok(EmberObject.detectInstance(c), 'c is an instance of EmberObject');

  ok(!A.detectInstance(o), 'o is not an instance of A');
  ok(A.detectInstance(a), 'a is an instance of A');
  ok(A.detectInstance(b), 'b is an instance of A');
  ok(A.detectInstance(c), 'c is an instance of A');

  ok(!B.detectInstance(o), 'o is not an instance of B');
  ok(!B.detectInstance(a), 'a is not an instance of B');
  ok(B.detectInstance(b), 'b is an instance of B');
  ok(!B.detectInstance(c), 'c is not an instance of B');

  ok(!C.detectInstance(o), 'o is not an instance of C');
  ok(!C.detectInstance(a), 'a is not an instance of C');
  ok(!C.detectInstance(b), 'b is not an instance of C');
  ok(C.detectInstance(c), 'c is an instance of C');
});
