import { Storage } from '@glimmer/low-level';

QUnit.module('[low-level glue] Storage');

QUnit.test('basic functionality', assert => {
  let storage = new Storage();

  let ref = {};
  let func = () => null;

  let p1 = storage.add(ref);
  let p2 = storage.add(func);
  let p3 = storage.add('hello');
  let p4 = storage.add(null);

  assert.strictEqual(storage.deref(p1), ref, 'storage.deref(p1)');
  assert.strictEqual(storage.deref(p2), func, 'storage.deref(p2)');
  assert.strictEqual(storage.deref(p3), 'hello', 'storage.deref(p3)');
  assert.strictEqual(storage.deref(p4), null, 'storage.deref(p4)');

  storage.drop(p2);

  let newFunc = () => null;

  let secondP2 = storage.add(newFunc);

  // it's ok if this test eventually fails if we go
  // with a smarter strategy -- this is just a smoke
  // test for now
  assert.strictEqual(p2, secondP2, 'p2 === secondP2');

  assert.strictEqual(storage.deref(p2), newFunc, 'storage.deref(p2)');

  storage.drop(p1);
  storage.drop(secondP2);
  storage.drop(p4);
  storage.drop(p3);

  let newFunc2 = () => null;
  let newRef = {};

  let newP1 = storage.add(newRef);
  let newP2 = storage.add(newFunc2);
  let newP3 = storage.add('hello');
  let newP4 = storage.add(null);

  assert.strictEqual(storage.deref(newP1), newRef, 'newP1');
  assert.strictEqual(storage.deref(newP2), newFunc2, 'newP2');
  assert.strictEqual(storage.deref(newP3), 'hello', 'newP3');
  assert.strictEqual(storage.deref(newP4), null, 'newP4');

  // it's ok if this test eventually fails if we go
  // with a smarter strategy -- this is just a smoke
  // test for now
  assert.strictEqual(storage['next'], 4);
});
