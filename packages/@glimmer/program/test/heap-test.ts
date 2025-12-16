import { ProgramHeapImpl } from '@glimmer/program';

QUnit.module('Heap');

QUnit.test('Can grow', (assert) => {
  let size = 0x100000;
  let heap = new ProgramHeapImpl();

  let i = 0;

  while (i !== size - 1) {
    heap.pushRaw(1);
    i++;
  }

  // Assert that the `pushRaw` calls don't throw
  assert.expect(0);

  // Push past the allocated size and ensure we don't get an error
  heap.pushRaw(10);
  heap.pushRaw(11);
});

QUnit.test('verifies that TypedArray.slice exists', (assert) => {
  const heap = new Int32Array(10);

  assert.strictEqual(
    heap.slice().length,
    10,
    'Verifies our platform assumptions about TypedArray.slice'
  );
});
