import type { AnyFn } from '@ember/-internals/utility-types';
import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class President extends Ember.Object {
  name = 'Barack Obama';
}

class DetailedPresident extends President {
  firstName = 'Barack';
  lastName = 'Obama';
  @Ember.computed()
  get fullName() {
    return `${this.get('firstName')} ${this.get('lastName')}`;
  }
}

class Country extends Ember.Object {
  presidentNameBinding = 'MyApp.president.name';
}

class MyApp extends Ember.Application {
  president = President.create();
  country = Country.create();

  todosController?: TodosController;
}

const App = MyApp.create();
App.country.get('presidentName');
App.president = DetailedPresident.create();
App.president.get('fullName');

declare class MyPerson extends Ember.Object {
  static createMan(): MyPerson;
}
MyPerson.createMan();

class Person1 extends Ember.Object {
  name?: string;
  say = (thing: string) => {
    alert(thing);
  };
}

declare class MyPerson2 extends Ember.Object {
  helloWorld(): void;
}
MyPerson2.create().helloWorld();

class Tom extends Person1 {
  name = 'Tom Dale';
  helloWorld() {
    this.say('Hi my name is ' + this.get('name'));
  }
}
const tom = Tom.create();
tom.helloWorld();

const PersonReopened = Person1.reopen({ isPerson: true });
PersonReopened.create().get('isPerson');

class Todo extends Ember.Object {
  isDone = false;
}

class TodosController extends Ember.Object {
  todos = [Todo.create()];

  @Ember.computed('todos.@each.isDone')
  get remaining() {
    const todos = this.get('todos');
    return todos.filter((todo) => todo.get('isDone') === false).length;
  }
}

App.todosController = TodosController.create();

const todos = App.todosController.get('todos');
let todo = todos[0];
todo?.set('isDone', true);
App.todosController.get('remaining');
todo = Todo.create({ isDone: true });
todos.push(todo);
App.todosController.get('remaining');

const NormalApp = Ember.Application.create({
  rootElement: '#sidebar',
});

class Person2 extends Ember.Object {
  name = '';

  sayHello() {
    console.log('Hello from ' + this.get('name'));
  }
}
class Person3 extends Ember.Object {
  name?: string;
  isHappy = false;
}
const people2 = [
  Person3.create({ name: 'Yehuda', isHappy: true }),
  Person3.create({ name: 'Majd', isHappy: false }),
];
const isHappy = (person: Person3): boolean => {
  return Boolean(person.get('isHappy'));
};
people2.every(isHappy);

// Examples taken from http://emberjs.com/api/classes/Em.RSVP.Promise.html
const promise = new Ember.RSVP.Promise<string>((resolve: AnyFn, reject: AnyFn) => {
  // on success
  resolve('ok!');

  // on failure
  reject('no-k!');
});

promise.then(
  (value) => {
    // on fulfillment
    expectTypeOf(value).toBeString();
  },
  (reason: unknown) => {
    // on rejection
  }
);

// make sure Ember.RSVP.Promise can be reference as a type
declare function promiseReturningFunction(urn: string): Ember.RSVP.Promise<string>;

const mix1 = Ember.Mixin.create({
  foo: 1,
});

const mix2 = Ember.Mixin.create({
  bar: 2,
});

const component1 = Ember.Component.extend(mix1, mix2, {
  lyft: Ember.inject.service(),
  cars: Ember.computed('lyft.cars').readOnly(),
});
