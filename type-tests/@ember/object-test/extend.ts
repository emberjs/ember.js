import EmberObject from '@ember/object';
import { expectTypeOf } from 'expect-type';

class Person extends EmberObject {
  declare firstName: string;
  declare lastName: string;

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
  get fullName2(): string {
    return `${this.get('firstName')} ${this.get('lastName')}`;
  }
}

expectTypeOf(Person.prototype.firstName).toBeString();
expectTypeOf(Person.prototype.fullName).toBeString();

// We cannot forbid extra properties, but we do at least smush them onto the
// resulting type.
const person = Person.create({
  firstName: 'Joe',
  lastName: 'Blow',
  extra: 42,
});

expectTypeOf(person.fullName).toBeString();
expectTypeOf(person.extra).toBeNumber();

class PersonWithStatics extends EmberObject {
  static isPerson = true;
}
const PersonWithStatics2 = PersonWithStatics.extend({});
class PersonWithStatics3 extends PersonWithStatics {}
class PersonWithStatics4 extends PersonWithStatics2 {}
expectTypeOf(PersonWithStatics.isPerson).toBeBoolean();
expectTypeOf(PersonWithStatics2.isPerson).toBeBoolean();
expectTypeOf(PersonWithStatics3.isPerson).toBeBoolean();
expectTypeOf(PersonWithStatics4.isPerson).toBeBoolean();
