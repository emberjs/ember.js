import type Owner from '@ember/owner';
import CoreObject from '@ember/object/core';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

expectTypeOf(CoreObject.create()).toEqualTypeOf<CoreObject>();

/** Newable tests */
const co1 = new CoreObject(owner);

expectTypeOf(co1.concatenatedProperties).toEqualTypeOf<string[] | string | undefined>();
expectTypeOf(co1.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co1.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co1.destroy()).toEqualTypeOf<CoreObject>();
expectTypeOf(co1.toString()).toEqualTypeOf<string>();

/** .create tests */

const co2 = CoreObject.create();
expectTypeOf(co2.concatenatedProperties).toEqualTypeOf<string[] | string | undefined>();
expectTypeOf(co2.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co2.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co2.destroy()).toEqualTypeOf<CoreObject>();
expectTypeOf(co2.toString()).toEqualTypeOf<string>();

/** .create tests w/ initial instance data passed in */
// @ts-expect-error: We reject arbitrary properties!
const co3 = CoreObject.create({ foo: '123', bar: 456 });
