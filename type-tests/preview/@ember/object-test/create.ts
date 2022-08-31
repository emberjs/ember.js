import EmberObject, { computed } from '@ember/object';
import { expectTypeOf } from 'expect-type';

/**
 * Zero-argument case
 */
const o = EmberObject.create();
// create returns an object
expectTypeOf(o).toBeObject();
// object returned by create type-checks as an instance of EmberObject
expectTypeOf(o.isDestroyed).toBeBoolean();
expectTypeOf(o.isDestroying).toBeBoolean();
expectTypeOf(o.get).toMatchTypeOf<<K extends keyof EmberObject>(key: K) => EmberObject[K]>();

/**
 * One-argument case
 */
class O1 extends EmberObject {
  declare x: number;
  declare y: string;
  declare z: boolean;
}

const o1 = O1.create({ x: 9, y: 'hello', z: false });
expectTypeOf(o1.x).toBeNumber();
expectTypeOf(o1.y).toBeString();
expectTypeOf(o1.z).toBeBoolean();

class O2 extends EmberObject {
  declare a: number;
  declare b: number;
  declare c: number;
}
const obj = O2.create({ a: 1 }, { b: 2 }, { c: 3 });
expectTypeOf(obj.b).toBeNumber();
expectTypeOf(obj.a).toBeNumber();
expectTypeOf(obj.c).toBeNumber();

export class Person extends EmberObject {
  declare firstName: string;
  declare lastName: string;
  declare age: number;

  @computed('firstName', 'lastName')
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
