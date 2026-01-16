import type { AnyFn } from '@ember/-internals/utility-types';
import Application from '@ember/application';
import { A, NativeArray } from '@ember/array';
import Component from '@ember/component';
import EmberObject, { computed } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { service } from '@ember/service';
import { expectTypeOf } from 'expect-type';
import RSVP from 'rsvp';

class President extends EmberObject {
  name = 'Barack Obama';
}

class DetailedPresident extends President {
  firstName = 'Barack';
  lastName = 'Obama';
  @computed()
  get fullName() {
    return `${this.get('firstName')} ${this.get('lastName')}`;
  }
}

class Country extends EmberObject {
  presidentNameBinding = 'MyApp.president.name';
}

class MyApp extends Application {
  president = President.create();
  country = Country.create();

  todosController?: TodosController;
}

const App = MyApp.create();
App.country.get('presidentName');
App.president = DetailedPresident.create();
App.president.get('fullName');

declare class MyPerson extends EmberObject {
  static createMan(): MyPerson;
}
MyPerson.createMan();

class Person1 extends EmberObject {
  name?: string;
  say = (thing: string) => {
    alert(thing);
  };
}

declare class MyPerson2 extends EmberObject {
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

class Todo extends EmberObject {
  isDone = false;
}

class TodosController extends EmberObject {
  todos = A([Todo.create()]);

  @computed('todos.@each.isDone')
  get remaining() {
    const todos = this.get('todos');
    return todos.filterBy('isDone', false).get('length');
  }
}

App.todosController = TodosController.create();

const todos = App.todosController.get('todos');
let todo = todos.objectAt(0);
todo?.set('isDone', true);
App.todosController.get('remaining');
todo = Todo.create({ isDone: true });
todos.pushObject(todo);
App.todosController.get('remaining');

const NormalApp = Application.create({
  rootElement: '#sidebar',
});

class Person2 extends EmberObject {
  name = '';

  sayHello() {
    console.log('Hello from ' + this.get('name'));
  }
}
const people = A([
  Person2.create({ name: 'Juan' }),
  Person2.create({ name: 'Charles' }),
  Person2.create({ name: 'Majd' }),
]);
people.invoke('sayHello');
// @ts-expect-error
people.invoke('name');

class Obj extends EmberObject {
  name?: string;
}

const arr: NativeArray<Obj> = A([EmberObject.create(), EmberObject.create()]);
expectTypeOf(arr.setEach('name', 'unknown')).toEqualTypeOf(arr);
expectTypeOf(arr.setEach('name', undefined)).toEqualTypeOf(arr);
expectTypeOf(arr.getEach('name')).toEqualTypeOf<NativeArray<string | undefined>>();
// @ts-expect-error
arr.setEach('age', 123);
// @ts-expect-error
arr.getEach('age');

class Person3 extends EmberObject {
  name?: string;
  isHappy = false;
}
const people2 = A([
  Person3.create({ name: 'Yehuda', isHappy: true }),
  Person3.create({ name: 'Majd', isHappy: false }),
]);
const isHappy = (person: Person3): boolean => {
  return Boolean(person.get('isHappy'));
};
people2.every(isHappy);
people2.any(isHappy);
people2.isEvery('isHappy');
people2.isEvery('isHappy', true);
// TODO: Ideally we'd mark the value as being invalid
people2.isAny('isHappy', 'true');
people2.isAny('isHappy', true);
people2.isAny('isHappy');

// Examples taken from http://emberjs.com/api/classes/Em.RSVP.Promise.html
const promise = new RSVP.Promise<string>((resolve: AnyFn, reject: AnyFn) => {
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
declare function promiseReturningFunction(urn: string): RSVP.Promise<string>;

const mix1 = Mixin.create({
  foo: 1,
});

const mix2 = Mixin.create({
  bar: 2,
});

const component1 = Component.extend(mix1, mix2, {
  lyft: service(),
  cars: computed('lyft.cars').readOnly(),
});
