import { expectTypeOf } from 'expect-type';

import EmberObject from '@ember/object';

expectTypeOf(EmberObject.create()).toEqualTypeOf<EmberObject>();

/**
 * Zero-argument case
 */
const o = EmberObject.create();
// create returns an object
expectTypeOf(o).toMatchTypeOf<object>();

// object returned by create type-checks as an instance of Ember.Object
expectTypeOf(o.isDestroyed).toEqualTypeOf<boolean>(); // from instance
expectTypeOf(o.isDestroying).toEqualTypeOf<boolean>(); // from instance
expectTypeOf(o.get).toEqualTypeOf<(key: keyof EmberObject) => unknown>(); // from prototype

/**
 * One-argument case
 */
const o1 = EmberObject.create({ x: 9, y: 'hello', z: false });
expectTypeOf(o1.x).toEqualTypeOf<number>();
expectTypeOf(o1.y).toEqualTypeOf<string>();
expectTypeOf(o1.z).toEqualTypeOf<boolean>();

const obj = EmberObject.create({ a: 1 }, { b: 2 }, { c: 3 });
expectTypeOf(obj.b).toEqualTypeOf<number>();
expectTypeOf(obj.a).toEqualTypeOf<number>();
expectTypeOf(obj.c).toEqualTypeOf<number>();

export class Person extends EmberObject {
  firstName!: string;
  lastName!: string;
  age!: number;
}
const p = new Person();

expectTypeOf(p.firstName).toEqualTypeOf<string>();
// get is deprecated and only returns unknown now
expectTypeOf(p.get('firstName')).toEqualTypeOf<unknown>();
// @ts-expect-error Can't get unknown properties
p.get('invalid');

const p2 = Person.create({ firstName: 'string' });
expectTypeOf(p2.firstName).toEqualTypeOf<string>();

const p2b = Person.create({}, { firstName: 'string' });
expectTypeOf(p2b.firstName).toEqualTypeOf<string>();

const p2c = Person.create({}, {}, { firstName: 'string' });
expectTypeOf(p2c.firstName).toEqualTypeOf<string>();

// @ts-expect-error extend is no longer available in the public API
Person.extend({ fullName: 6 });

// @ts-expect-error reopen is no longer available in the public API
Person.reopen({ fullName: 6 });

// @ts-expect-error reopenClass is no longer available in the public API
Person.reopenClass({ fullName: 6 });
