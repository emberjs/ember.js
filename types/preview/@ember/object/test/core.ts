import CoreObject from '@ember/object/core';
import { expectTypeOf } from 'expect-type';

/** Newable tests */
const co1 = new CoreObject();

// TODO: Enable in TS 3.0  see: https://github.com/typed-ember/ember-cli-typescript/issues/291
// co1.concatenatedProperties; // $ExpectType string[]
co1.isDestroyed; // $ExpectType boolean
co1.isDestroying; // $ExpectType boolean
co1.destroy(); // $ExpectType CoreObject
co1.toString(); // $ExpectType string

/** .create tests */
const co2 = CoreObject.create();
// TODO: Enable in TS 3.0  see: https://github.com/typed-ember/ember-cli-typescript/issues/291
// co2.concatenatedProperties; // $ExpectType string[]
co2.isDestroyed; // $ExpectType boolean
co2.isDestroying; // $ExpectType boolean
co2.destroy(); // $ExpectType CoreObject
co2.toString(); // $ExpectType string

/** .create tests w/ initial instance data passed in */
declare class CO3 extends CoreObject {
  foo: string;
  bar: number;
}
const co3 = CO3.create({ foo: '123', bar: 456 });

co3.foo; // $ExpectType string
co3.bar; // $ExpectType number

/** .extend with a zero-argument .create()  */
class CO4 extends CO3 {
  baz(): [string, number] {
    return [this.foo, this.bar];
  }
}
const co4 = CO4.create();

co4.foo; // $ExpectType string
co4.bar; // $ExpectType number
co4.baz; // $ExpectType () => [string, number]

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
expectTypeOf(CO5.create({ foo: true })).toEqualTypeOf<CO5>();
expectTypeOf(CO5.create({ foo: 'abc' })).toEqualTypeOf<CO5>();
expectTypeOf(CO5.create().foo).toEqualTypeOf<boolean | string>();
