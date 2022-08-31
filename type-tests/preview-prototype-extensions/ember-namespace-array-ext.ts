import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class Person extends Ember.Object {
  declare name: string;
}

const person = Person.create({ name: 'Joe' });
const array = [person];

expectTypeOf(array.get('length')).toBeNumber();
expectTypeOf(array.get('firstObject')).toEqualTypeOf<Person | undefined>();
expectTypeOf(array.mapBy('name')).toMatchTypeOf<string[]>();
expectTypeOf(array.map((p) => p.get('name'))).toEqualTypeOf<string[]>();
// These return `Ember.NativeArray` so use `toMatchTypeOf`
expectTypeOf(array.sortBy('name')).toMatchTypeOf<Person[]>();
expectTypeOf(array.uniq()).toMatchTypeOf<Person[]>();
expectTypeOf(array.uniqBy('name')).toMatchTypeOf<Person[]>();
