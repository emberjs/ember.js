import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class Person extends Ember.Object {
  name = '';

  sayHello() {
    alert(`Hello. My name is ${this.get('name')}`);
  }
}

expectTypeOf(Person.reopen()).toMatchTypeOf<typeof Person>();

expectTypeOf(Person.create().name).toEqualTypeOf<string>();
expectTypeOf(Person.create().sayHello()).toBeVoid();

// Here, a basic check that `reopenClass` *works*, but we intentionally do not
// provide types for how it changes the original class (as spec'd in RFC 0800).
const Person2 = Person.reopenClass({
  species: 'Homo sapiens',

  createPerson(name: string): Person {
    return Person.create({ name });
  },
});

// The original class types are carried along
expectTypeOf(Person2.create().name).toEqualTypeOf<string>();
expectTypeOf(Person2.create().sayHello()).toBeVoid();
// But we aren't trying to merge in new classes anymore.
// @ts-expect-error
Person2.species;

const tom = Person2.create({
  name: 'Tom Dale',
});

// @ts-expect-error
const badTom = Person2.create({ name: 99 });

// @ts-expect-error
const yehuda = Person2.createPerson('Yehuda Katz');

tom.sayHello(); // "Hello. My name is Tom Dale"
yehuda.sayHello(); // "Hello. My name is Yehuda Katz"
// @ts-expect-error
alert(Person2.species); // "Homo sapiens"

// The same goes for `.reopen()`: it will "work" in a bare minimum sense, but it
// will not try to change the types.
const Person3 = Person2.reopen({
  goodbyeMessage: 'goodbye',

  sayGoodbye(this: Person) {
    alert(`${this.get('goodbyeMessage')}, ${this.get('name')}`);
  },
});

const person3 = Person3.create();
person3.get('name');
person3.get('goodbyeMessage');
person3.sayHello();
// @ts-expect-error
person3.sayGoodbye();

interface AutoResizeMixin {
  resizable: true;
}
const AutoResizeMixin = Ember.Mixin.create({ resizable: true });

// And the same here.
const Reopened = Ember.Object.reopenClass({ a: 1 }, { b: 2 }, { c: 3 });
// @ts-expect-error
Reopened.a;
// @ts-expect-error
Reopened.b;
// @ts-expect-error
Reopened.c;
