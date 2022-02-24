import { Owner } from '@ember/-internals/owner';
import CoreObject from '@ember/object/core';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

expectTypeOf(CoreObject.create()).toEqualTypeOf<CoreObject>();

/** Newable tests */
const co1 = new CoreObject(owner);

expectTypeOf(co1.concatenatedProperties).toEqualTypeOf<string[]>();
expectTypeOf(co1.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co1.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co1.destroy()).toEqualTypeOf<void>();
expectTypeOf(co1.toString()).toEqualTypeOf<string>();

/** .create tests */
const co2 = CoreObject.create();
expectTypeOf(co2.concatenatedProperties).toEqualTypeOf<string[]>();
expectTypeOf(co2.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co2.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co2.destroy()).toEqualTypeOf<void>();
expectTypeOf(co2.toString()).toEqualTypeOf<string>();

/** .create tests w/ initial instance data passed in */
const co3 = CoreObject.create({ foo: '123', bar: 456 });

expectTypeOf(co3.foo).toEqualTypeOf<string>();
expectTypeOf(co3.bar).toEqualTypeOf<number>();

// NOTE: This is marked as @internal and will not be publicly available
CoreObject.extend({ baz: 6 });

// NOTE: This is marked as @internal and will not be publicly available
CoreObject.reopen({ baz: 6 });

// NOTE: This is marked as @internal and will not be publicly available
CoreObject.reopenClass({ baz: 6 });
