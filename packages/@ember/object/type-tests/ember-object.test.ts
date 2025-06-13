import { expectTypeOf } from 'expect-type';

import EmberObject from '@ember/object';
import type Owner from '@ember/owner';

// Good enough for tests
let owner = {} as Owner;

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

/**
 * One-argument case
 */
// @ts-expect-error: there are *no* types in common here, so we reject them.
const o1 = EmberObject.create({ x: 9, y: 'hello', z: false });

// @ts-expect-error: there are *no* types in common here, so we reject them.
const obj = EmberObject.create({ a: 1 }, { b: 2 }, { c: 3 });

export class Person extends EmberObject {
  firstName!: string;
  lastName!: string;
  age!: number;
}
const p = new Person(owner);

expectTypeOf(p.firstName).toEqualTypeOf<string>();

expectTypeOf(p.cacheFor('age')).toEqualTypeOf<unknown>();

const p2 = Person.create({ firstName: 'string' });
expectTypeOf(p2.firstName).toEqualTypeOf<string>();

const p2b = Person.create({}, { firstName: 'string' });
expectTypeOf(p2b.firstName).toEqualTypeOf<string>();

const p2c = Person.create({}, {}, { firstName: 'string' });
expectTypeOf(p2c.firstName).toEqualTypeOf<string>();
