import EmberObject from '@ember/object';
import { A, NativeArray } from '@ember/array';
import { expectTypeOf } from 'expect-type';

class Person extends EmberObject {
  name = '';
  isHappy = false;
}

const people = A([
  Person.create({ name: 'Yehuda', isHappy: true }),
  Person.create({ name: 'Majd', isHappy: false }),
]);

expectTypeOf(people.get('length')).toBeNumber();
expectTypeOf(people.get('lastObject')).toEqualTypeOf<Person | undefined>();
expectTypeOf(people.get('firstObject')).toEqualTypeOf<Person | undefined>();
expectTypeOf(people.isAny('isHappy')).toBeBoolean();
expectTypeOf(people.isAny('isHappy', false)).toBeBoolean();
// TODO: Ideally we'd mark the value as being invalid
people.isAny('isHappy', 'false');

expectTypeOf(people.objectAt(0)).toEqualTypeOf<Person | undefined>();
expectTypeOf(people.objectsAt([1, 2, 3])).toEqualTypeOf<Array<Person | undefined>>();

expectTypeOf(people.filterBy('isHappy')).toMatchTypeOf<Person[]>();
expectTypeOf(people.filterBy('isHappy')).toMatchTypeOf<NativeArray<Person>>();
expectTypeOf(people.rejectBy('isHappy')).toMatchTypeOf<Person[]>();
expectTypeOf(people.rejectBy('isHappy')).toMatchTypeOf<NativeArray<Person>>();
expectTypeOf(people.filter((person) => person.get('name') === 'Yehuda')).toMatchTypeOf<Person[]>();
expectTypeOf(people.filter((person) => person.get('name') === 'Yehuda')).toMatchTypeOf<Person[]>();

expectTypeOf(people.get('[]')).toEqualTypeOf<typeof people>();
expectTypeOf(people.get('[]').get('firstObject')).toEqualTypeOf<Person | undefined>();

expectTypeOf(people.mapBy('isHappy')).toMatchTypeOf<boolean[]>();
expectTypeOf(people.mapBy('name.length')).toMatchTypeOf<unknown[]>();

const last = people.get('lastObject');
expectTypeOf(last).toEqualTypeOf<Person | undefined>();
if (last) {
  expectTypeOf(last.get('name')).toBeString();
}

const first = people.get('lastObject');
if (first) {
  expectTypeOf(first.get('isHappy')).toBeBoolean();
}

const letters = A(['a', 'b', 'c']);
const codes = letters.map((item, index, array) => {
  expectTypeOf(item).toBeString();
  expectTypeOf(index).toBeNumber();
  expectTypeOf(array).toMatchTypeOf<string[]>();
  return item.charCodeAt(0);
});
expectTypeOf(codes).toMatchTypeOf<number[]>();

const value = '1,2,3';
const filters = A(value.split(','));
filters.push('4');
filters.sort();

const multiSortArr = A([
  { k: 'a', v: 'z' },
  { k: 'a', v: 'y' },
  { k: 'b', v: 'c' },
]);
multiSortArr.sortBy('k', 'v');
