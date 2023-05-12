import { HeapImpl } from '@glimmer/program';

QUnit.module('Heap');

QUnit.test('Can grow', (assert) => {
  let size = 0x100000;
  let heap = new HeapImpl();

  let i = 0;

  while (i !== size - 1) {
    heap.pushRaw(1);
    i++;
  }

  // Should grow here
  heap.pushRaw(10);

  // Slices the buffer. Passing MAX_SAFE_INTEGER ensures
  // we get the whole thing out
  let serialized = heap.capture(Number.MAX_SAFE_INTEGER);
  let serializedHeap = new Int32Array(serialized.buffer);
  assert.strictEqual(serializedHeap.length, size);
  assert.strictEqual(serializedHeap[size - 1], 10);

  heap.pushRaw(11);

  serialized = heap.capture(Number.MAX_SAFE_INTEGER);
  serializedHeap = new Int32Array(serialized.buffer);

  assert.strictEqual(
    typeof serializedHeap.slice,
    'function',
    'the heap has a slice method; if this test fails, it means our assumptions about browser support for TypedArray.slice are wrong'
  );

  assert.strictEqual(serializedHeap.length, size * 2);
  assert.strictEqual(serializedHeap[size], 11);
});
