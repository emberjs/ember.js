import { expectTypeOf } from 'expect-type';

import CoreObject from '@ember/object/core';

expectTypeOf(CoreObject.create()).toEqualTypeOf<CoreObject>();

/** Newable tests */
const co1 = new CoreObject();

expectTypeOf(co1.concatenatedProperties).toEqualTypeOf<string[]>();
expectTypeOf(co1.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co1.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co1.destroy()).toEqualTypeOf<CoreObject>();
expectTypeOf(co1.toString()).toEqualTypeOf<string>();

/** .create tests */
const co2 = CoreObject.create();
expectTypeOf(co2.concatenatedProperties).toEqualTypeOf<string[]>();
expectTypeOf(co2.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co2.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co2.destroy()).toEqualTypeOf<CoreObject>();
expectTypeOf(co2.toString()).toEqualTypeOf<string>();

/** .create tests w/ initial instance data passed in */
const co3 = CoreObject.create({ foo: '123', bar: 456 });

expectTypeOf(co3.foo).toEqualTypeOf<string>();
expectTypeOf(co3.bar).toEqualTypeOf<number>();

// @ts-expect-error extend is no longer available in the public API
CoreObject.extend({ baz: 6 });

// @ts-expect-error reopen is no longer available in the public API
CoreObject.reopen({ baz: 6 });

// @ts-expect-error reopenClass is no longer available in the public API
CoreObject.reopenClass({ baz: 6 });
