import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const { CoreObject } = Ember;

/** Newable tests */
const co1 = new CoreObject();

expectTypeOf(co1.isDestroyed).toBeBoolean();
expectTypeOf(co1.isDestroying).toBeBoolean();
expectTypeOf(co1.destroy()).toEqualTypeOf<Ember.CoreObject>();
expectTypeOf(co1.toString()).toBeString();

/** .create tests */
const co2 = CoreObject.create();
expectTypeOf(co2.isDestroyed).toBeBoolean();
expectTypeOf(co2.isDestroying).toBeBoolean();
expectTypeOf(co2.destroy()).toEqualTypeOf<Ember.CoreObject>();
expectTypeOf(co2.toString()).toBeString();

/** .create tests w/ initial instance data passed in */
declare class CO3 extends CoreObject {
  foo: string;
  bar: number;
}
const co3 = CO3.create({ foo: '123', bar: 456 });

expectTypeOf(co3.foo).toBeString();
expectTypeOf(co3.bar).toBeNumber();

/** .extend with a zero-argument .create()  */
class CO4 extends CO3 {
  baz(): [string, number] {
    return [this.foo, this.bar];
  }
}
const co4 = CO4.create();

expectTypeOf(co4.foo).toBeString();
expectTypeOf(co4.bar).toBeNumber();
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
