import { trackedObject } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

// The whole point here is that Object *is* the thing we are matching, ESLint!
expectTypeOf<ReturnType<typeof trackedObject>>().toMatchTypeOf<object>();

// @ts-expect-error - Required keys should require a value
trackedObject<{ foo: number }>();
// @ts-expect-error - Required keys should require a value
trackedObject<{ foo: number }>({});

// Optional keys should not require a value
trackedObject<{ foo?: number }>();

module('@glimmer/validator: trackedObject', function () {
  test('basic usage', (assert) => {
    let original = { foo: 123 };
    let obj = trackedObject(original);

    assert.ok(obj instanceof Object);
    expectTypeOf(obj).toEqualTypeOf<{ foo: number }>();
    assert.deepEqual(Object.keys(obj), ['foo']);
    assert.strictEqual(obj.foo, 123);

    obj.foo = 456;
    assert.strictEqual(obj.foo, 456, 'object updated correctly');
    assert.strictEqual(original.foo, 123, 'original object was not updated');
  });

  test('preserves getters', (assert) => {
    let obj = trackedObject({
      foo: 123,
      get bar(): number {
        return this.foo;
      },
    });

    expectTypeOf(obj).toEqualTypeOf<{ foo: number; readonly bar: number }>();

    obj.foo = 456;
    assert.strictEqual(obj.foo, 456, 'object updated correctly');
    assert.strictEqual(obj.bar, 456, 'getter cloned correctly');
  });
});
