import { isEqual } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

expectTypeOf(isEqual('hello', 'hello')).toEqualTypeOf<boolean>(); // true

isEqual(1, 2); // false

class Person {
  constructor(public ssn: string) {}

  isEqual(other: Person) {
    return this.ssn == other.ssn;
  }
}

let personA = new Person('123-45-6789');
let personB = new Person('123-45-6789');

isEqual(personA, personB); // true

isEqual([4, 2], [4, 2]); // false
