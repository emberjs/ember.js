import { Heap } from '@glimmer/program';

QUnit.module('Heap');

QUnit.test('Can grow', assert => {
  let size = 0x100000;
  let heap = new Heap();

  let i = 0;

  while (i !== size - 1) {
    heap.push(1);
    i++;
  }

  // Should grow here
  heap.push(10);

  // Slices the buffer. Passing MAX_SAFE_INTEGER ensures
  // we get the whole thing out
  let serialized = heap.capture(Number.MAX_SAFE_INTEGER);
  let serializedHeap = new Uint32Array(serialized.buffer);
  assert.equal(serializedHeap.length, size);
  assert.equal(serializedHeap[size - 1], 10);

  heap.push(11);

  serialized = heap.capture(Number.MAX_SAFE_INTEGER);
  serializedHeap = new Uint32Array(serialized.buffer);

  if (serializedHeap.slice) {
    assert.equal(serializedHeap.length, size * 2);
  } else {
    // IE11 only gives you a buffer with residents in the slots
    assert.equal(serializedHeap.length, size + 1);
  }
  assert.equal(serializedHeap[size], 11);
});
