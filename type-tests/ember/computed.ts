import Ember from 'ember';
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
    this.set('firstName', first);
    this.set('lastName', last);
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

const person2 = Person.create({
  fullName: 'Fred Smith',
});

expectTypeOf(person2.firstName).toEqualTypeOf<string>();
expectTypeOf(person2.fullName).toEqualTypeOf<string>();

const person3 = Person.extend({
  firstName: 'Fred',
  fullName: 'Fred Smith',
}).create();

expectTypeOf(person3.firstName).toEqualTypeOf<string>();
expectTypeOf(person3.fullName).toEqualTypeOf<string>();

const person4 = Person.extend({
  firstName: Ember.computed(() => 'Fred'),
  fullName: Ember.computed(() => 'Fred Smith'),
}).create();

expectTypeOf(person4.firstName).toEqualTypeOf<string>();
expectTypeOf(person4.fullName).toEqualTypeOf<string>();
