import { track, trackedValue, validateTag, valueForTag } from '@glimmer/validator';

import { module, test } from './-utils';

module('@glimmer/validator: trackedValue()', () => {
  test('creates reactive storage', (assert) => {
    const x = trackedValue('hello');

    assert.strictEqual(x.value, 'hello');
    assert.strictEqual(x.get(), 'hello');
  });

  test('updates when value is set', (assert) => {
    const x = trackedValue('hello');

    x.value = 'world';
    assert.strictEqual(x.value, 'world');
  });

  test('updates when set() is called', (assert) => {
    const x = trackedValue('hello');

    assert.true(x.set('world'), 'set() returns true when the value changes');
    assert.strictEqual(x.value, 'world');

    assert.false(x.set('world'), 'set() returns false when the value is equal');
  });

  test('updates when update() is called', (assert) => {
    const x = trackedValue('hello');

    x.update((value) => value + ' world');
    assert.strictEqual(x.value, 'hello world');
  });

  test('cannot be updated when frozen', (assert) => {
    const x = trackedValue('hello');

    x.freeze();

    assert.throws(() => x.set('world'), /frozen/u);
    assert.throws(() => (x.value = 'world'), /frozen/u);
    assert.strictEqual(x.value, 'hello');
  });

  test('reading consumes and writing dirties', (assert) => {
    const x = trackedValue(0);

    const tag = track(() => x.value);
    let snapshot = valueForTag(tag);

    assert.true(validateTag(tag, snapshot), 'tag is valid before a change');

    x.value = 1;
    assert.false(validateTag(tag, snapshot), 'tag is invalidated by a change');

    snapshot = valueForTag(tag);
    assert.true(validateTag(tag, snapshot), 'tag is valid after snapshotting');
  });

  test('default equals (Object.is) does not dirty on no-op changes', (assert) => {
    const x = trackedValue(0);

    const tag = track(() => x.value);
    const snapshot = valueForTag(tag);

    x.value = 0;
    assert.true(validateTag(tag, snapshot), 'tag is still valid after setting an equal value');
  });

  test('options.equals: () => false dirties on every set', (assert) => {
    const x = trackedValue(0, { equals: () => false });

    const tag = track(() => x.value);
    const snapshot = valueForTag(tag);

    x.value = 0;
    assert.false(validateTag(tag, snapshot), 'tag is invalidated by a no-op set');
  });

  test('options.equals: custom comparisons are respected', (assert) => {
    const x = trackedValue({ id: 1 }, { equals: (a, b) => a.id === b.id });

    const tag = track(() => x.value);
    const snapshot = valueForTag(tag);

    x.value = { id: 1 };
    assert.true(validateTag(tag, snapshot), 'tag is still valid after setting an equal value');

    x.value = { id: 2 };
    assert.false(validateTag(tag, snapshot), 'tag is invalidated by a different value');
  });

  test('update() reads without consuming', (assert) => {
    const x = trackedValue(0);

    const tag = track(() => x.update((value) => value));
    const snapshot = valueForTag(tag);

    x.value = 1;
    assert.true(validateTag(tag, snapshot), 'update() did not entangle with the value');
  });

  test('methods can be detached from the instance', (assert) => {
    const x = trackedValue(0);
    const { get, set, update } = x;

    set(1);
    assert.strictEqual(get(), 1);

    update((value) => value + 1);
    assert.strictEqual(get(), 2);
  });
});
