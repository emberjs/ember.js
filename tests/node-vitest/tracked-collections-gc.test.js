import v8 from 'node:v8';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { trackedMap, trackedSet } from 'ember-source/@ember/reactive/collections';
import { track } from 'ember-source/@glimmer/validator';

v8.setFlagsFromString('--expose_gc');
const gc = vm.runInNewContext('gc');

async function isGarbageCollected(createWeakRef) {
  const ref = createWeakRef();

  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    gc();

    if (ref.deref() === undefined) {
      return true;
    }
  }

  return ref.deref() === undefined;
}

describe('trackedSet memory retention', () => {
  it('does not retain absent object keys checked outside a tracking frame', async () => {
    const set = trackedSet();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'untracked-absent' };
      expect(set.has(key)).toBe(false);
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(set.size).toBe(0);
  });

  it('does not retain absent object keys checked inside a tracking frame', async () => {
    const set = trackedSet();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'tracked-absent' };
      track(() => {
        expect(set.has(key)).toBe(false);
      });
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(set.size).toBe(0);
  });

  it('does not retain absent function keys checked inside a tracking frame', async () => {
    const set = trackedSet();

    const collected = await isGarbageCollected(() => {
      const fn = () => 'ephemeral';
      track(() => {
        expect(set.has(fn)).toBe(false);
      });
      return new WeakRef(fn);
    });

    expect(collected).toBe(true);
  });

  it('does not retain deleted object keys after subsequent has() checks', async () => {
    const set = trackedSet();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'deleted-then-checked' };
      set.add(key);
      track(() => {
        expect(set.has(key)).toBe(true);
      });
      set.delete(key);
      expect(set.has(key)).toBe(false);
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(set.size).toBe(0);
  });

  it('does not retain cleared object keys after subsequent has() checks', async () => {
    const set = trackedSet();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'cleared-then-checked' };
      set.add(key);
      track(() => {
        expect(set.has(key)).toBe(true);
      });
      set.clear();
      expect(set.has(key)).toBe(false);
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(set.size).toBe(0);
  });
});

describe('trackedMap memory retention', () => {
  it('does not retain absent object keys read with get() or has() outside a tracking frame', async () => {
    const map = trackedMap();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'untracked-absent' };
      expect(map.get(key)).toBeUndefined();
      expect(map.has(key)).toBe(false);
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(map.size).toBe(0);
  });

  it('does not retain absent object keys read inside a tracking frame', async () => {
    const map = trackedMap();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'tracked-absent' };
      track(() => {
        expect(map.get(key)).toBeUndefined();
        expect(map.has(key)).toBe(false);
      });
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(map.size).toBe(0);
  });

  it('does not retain absent function keys read inside a tracking frame', async () => {
    const map = trackedMap();

    const collected = await isGarbageCollected(() => {
      const fn = () => 'ephemeral';
      track(() => {
        expect(map.get(fn)).toBeUndefined();
      });
      return new WeakRef(fn);
    });

    expect(collected).toBe(true);
  });

  it('does not retain deleted object keys after subsequent get()/has() checks', async () => {
    const map = trackedMap();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'deleted-then-checked' };
      map.set(key, 123);
      track(() => {
        expect(map.get(key)).toBe(123);
      });
      map.delete(key);
      expect(map.get(key)).toBeUndefined();
      expect(map.has(key)).toBe(false);
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(map.size).toBe(0);
  });

  it('does not retain cleared object keys after subsequent get()/has() checks', async () => {
    const map = trackedMap();

    const collected = await isGarbageCollected(() => {
      const key = { name: 'cleared-then-checked' };
      map.set(key, 123);
      track(() => {
        expect(map.get(key)).toBe(123);
      });
      map.clear();
      expect(map.get(key)).toBeUndefined();
      expect(map.has(key)).toBe(false);
      return new WeakRef(key);
    });

    expect(collected).toBe(true);
    expect(map.size).toBe(0);
  });
});
