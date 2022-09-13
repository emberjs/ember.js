import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

/**
 * Zero-argument case
 */
const o = Ember.Object.create();
// create returns an object
expectTypeOf(o).toBeObject();
// object returned by create type-checks as an instance of Ember.Object
expectTypeOf(o.isDestroyed).toBeBoolean();
expectTypeOf(o.isDestroying).toBeBoolean();
expectTypeOf(o.get).toMatchTypeOf<<K extends keyof Ember.Object>(key: K) => Ember.Object[K]>();

/**
 * One-argument case
 */
class O1 extends Ember.Object {
  declare x: number;
  declare y: string;
  declare z: boolean;
}

const o1 = O1.create({ x: 9, y: 'hello', z: false });
expectTypeOf(o1.x).toBeNumber();
expectTypeOf(o1.y).toBeString();
expectTypeOf(o1.z).toBeBoolean();

class O2 extends Ember.Object {
  declare a: number;
  declare b: number;
  declare c: number;
}
const obj = O2.create({ a: 1 }, { b: 2 }, { c: 3 });
expectTypeOf(obj.b).toBeNumber();
expectTypeOf(obj.a).toBeNumber();
expectTypeOf(obj.c).toBeNumber();

export class Person extends Ember.Object {
  declare firstName: string;
  declare lastName: string;
  declare age: number;

  @Ember.computed('firstName', 'lastName')
  get fullName() {
    return [this.firstName + this.lastName].join(' ');
  }
}
const p = Person.create();

expectTypeOf(p.firstName).toBeString();
expectTypeOf(p.fullName).toBeString();
expectTypeOf(p.get('fullName')).toBeString();

Person.create({ firstName: 'string' });
Person.create({}, { firstName: 'string' });
Person.create({}, {}, { firstName: 'string' });
