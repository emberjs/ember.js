import Ember from 'ember';
import { set } from '@ember/object';
import { expectTypeOf } from 'expect-type';

function customMacro(message: string) {
  return Ember.computed(() => {
    return [message, message];
  });
}

class Person extends Ember.Object {
  firstName = '';
  lastName = '';
  age = 0;

  // Equivalent to a per-instance `defineProperty` call.
  @Ember.computed()
  get noArgs() {
    return 'test';
  }

  @Ember.computed('firstName', 'lastName')
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @(Ember.computed('fullName').readOnly())
  get fullNameReadonly() {
    return this.fullName;
  }

  @Ember.computed('firstName', 'lastName')
  get fullNameWritable(): string {
    return this.fullName;
  }

  set fullNameWritable(value: string) {
    const [first, last] = value.split(' ');
    set(this, 'firstName', first);
    set(this, 'lastName', last);
  }

  @(Ember.computed().meta({ foo: 'bar' }).readOnly())
  get combinators() {
    return this.firstName;
  }

  @customMacro('hi')
  declare hiTwice: string[];
}

const person = Person.create({
  firstName: 'Fred',
  lastName: 'Smith',
  age: 29,
});

expectTypeOf(person.firstName).toEqualTypeOf<string>();
expectTypeOf(person.age).toEqualTypeOf<number>();
expectTypeOf(person.noArgs).toEqualTypeOf<string>();
expectTypeOf(person.fullName).toEqualTypeOf<string>();
expectTypeOf(person.fullNameReadonly).toEqualTypeOf<string>();
expectTypeOf(person.fullNameWritable).toEqualTypeOf<string>();
expectTypeOf(person.combinators).toEqualTypeOf<string>();
