import EmberObject from '@ember/object';
import { expectTypeOf } from 'expect-type';
import type NativeArray from '@ember/array/-private/native-array';

class Person extends EmberObject {
  declare name: string;
}

const person = Person.create({ name: 'Joe' });
const array = [person];

expectTypeOf(array.get('length')).toBeNumber();
expectTypeOf(array.get('firstObject')).toEqualTypeOf<Person | undefined>();
expectTypeOf(array.mapBy('name')).toEqualTypeOf<NativeArray<string>>();
expectTypeOf(array.map((p) => p.get('name'))).toEqualTypeOf<string[]>();
// These use `toMatchTypeOf` instead of `toEqualTypeOf` because they are not
// actually returning `Array`; they return `Ember.NativeArray`
expectTypeOf(array.sortBy('name')).toMatchTypeOf<Person[]>();
expectTypeOf(array.uniq()).toMatchTypeOf<Person[]>();
expectTypeOf(array.uniqBy('name')).toMatchTypeOf<Person[]>();
expectTypeOf(array.uniqBy((p) => p.get('name'))).toMatchTypeOf<Person[]>();
