import CoreObject from '@ember/object/core';
import { expectTypeOf } from 'expect-type';

/** Newable tests */
const co1 = new CoreObject();

expectTypeOf(co1.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co1.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co1.destroy()).toEqualTypeOf<CoreObject>();
expectTypeOf(co1.toString()).toEqualTypeOf<string>();

/** .create tests */
const co2 = CoreObject.create();
expectTypeOf(co2.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(co2.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(co2.destroy()).toEqualTypeOf<CoreObject>();
expectTypeOf(co2.toString()).toEqualTypeOf<string>();

/** .create tests w/ initial instance data passed in */
declare class CO3 extends CoreObject {
  foo: string;
  bar: number;
}
const co3 = CO3.create({ foo: '123', bar: 456 });

expectTypeOf(co3.foo).toEqualTypeOf<string>();
expectTypeOf(co3.bar).toEqualTypeOf<number>();

/** .extend with a zero-argument .create()  */
class CO4 extends CO3 {
  baz(): [string, number] {
    return [this.foo, this.bar];
  }
}
const co4 = CO4.create();

expectTypeOf(co4.foo).toEqualTypeOf<string>();
expectTypeOf(co4.bar).toEqualTypeOf<number>();
expectTypeOf(co4.baz).toEqualTypeOf<() => [string, number]>();

/** .extend with inconsistent arguments passed into .create()  */
class CO5 extends CoreObject {
  foo: string | boolean = 'hello';
  bar = 123;
  baz() {
    return [this.foo, this.bar];
  }
}
// @ts-expect-error
class05.create({ foo: 99 });
expectTypeOf(CO5.create({ foo: true })).toEqualTypeOf<CO5 & { foo: boolean }>();
expectTypeOf(CO5.create({ foo: 'abc' })).toEqualTypeOf<CO5 & { foo: string }>();
expectTypeOf(CO5.create().foo).toEqualTypeOf<boolean | string>();
