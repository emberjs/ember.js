import { expectTypeOf } from 'expect-type';
import CoreObject from '../types/core';

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
