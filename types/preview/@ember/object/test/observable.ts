import { expectTypeOf } from 'expect-type';
import EmberObject, { computed, getProperties, get, setProperties, set } from '@ember/object';
import { removeObserver, addObserver } from '@ember/object/observers';

class MyComponent extends EmberObject {
  foo = 'bar';

  init() {
    this._super.apply(this);
    this.addObserver('foo', this, 'fooDidChange');
    this.addObserver('foo', this, this.fooDidChange);
    addObserver(this, 'foo', this, 'fooDidChange');
    addObserver(this, 'foo', this, this.fooDidChange);
    this.removeObserver('foo', this, 'fooDidChange');
    this.removeObserver('foo', this, this.fooDidChange);
    removeObserver(this, 'foo', this, 'fooDidChange');
    removeObserver(this, 'foo', this, this.fooDidChange);
    const lambda = () => {
      this.fooDidChange(this, 'foo');
    };
    this.addObserver('foo', lambda);
    this.removeObserver('foo', lambda);
    addObserver(this, 'foo', lambda);
    removeObserver(this, 'foo', lambda);
  }

  fooDidChange(sender: this, key: string) {
    // your code
  }
}

const myComponent = MyComponent.create();
myComponent.addObserver('foo', null, () => {});
myComponent.set('foo', 'baz');

class Person extends EmberObject {
  name = 'Fred';
  age = 29;

  @computed()
  get capitalized() {
    return this.get('name').toUpperCase();
  }
}
const person = Person.create();

const pojo = { name: 'Fred', age: 29 };

function testGet() {
  expectTypeOf(get(person, 'name')).toEqualTypeOf<string>();
  expectTypeOf(get(person, 'age')).toEqualTypeOf<number>();
  expectTypeOf(get(person, 'capitalized')).toEqualTypeOf<string>();
  expectTypeOf(person.get('name')).toEqualTypeOf<string>();
  expectTypeOf(person.get('age')).toEqualTypeOf<number>();
  expectTypeOf(person.get('capitalized')).toEqualTypeOf<string>();
  expectTypeOf(get(pojo, 'name')).toEqualTypeOf<string>();
}

function testGetProperties() {
  expectTypeOf(getProperties(person, 'name')).toEqualTypeOf<{ name: string }>();
  expectTypeOf(getProperties(person, 'name', 'age')).toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf(getProperties(person, ['name', 'age'])).toEqualTypeOf<{
    name: string;
    age: number;
  }>();
  expectTypeOf(getProperties(person, 'name', 'age', 'capitalized')).toEqualTypeOf<
    Pick<Person, 'name' | 'age' | 'capitalized'>
  >();
  expectTypeOf(person.getProperties('name')).toEqualTypeOf<{ name: string }>();
  expectTypeOf(person.getProperties('name', 'age')).toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf(person.getProperties(['name', 'age'])).toEqualTypeOf<{
    name: string;
    age: number;
  }>();
  expectTypeOf(person.getProperties('name', 'age', 'capitalized')).toEqualTypeOf<
    Pick<Person, 'name' | 'age' | 'capitalized'>
  >();
  expectTypeOf(getProperties(pojo, 'name', 'age')).toEqualTypeOf<{ name: string; age: number }>();
}

function testSet() {
  expectTypeOf(set(person, 'name', 'Joe')).toEqualTypeOf<string>();
  expectTypeOf(set(person, 'age', 35)).toEqualTypeOf<number>();
  expectTypeOf(set(person, 'capitalized', 'JOE')).toEqualTypeOf<string>();
  expectTypeOf(person.set('name', 'Joe')).toEqualTypeOf<string>();
  expectTypeOf(person.set('age', 35)).toEqualTypeOf<number>();
  expectTypeOf(person.set('capitalized', 'JOE')).toEqualTypeOf<string>();
  expectTypeOf(set(pojo, 'name', 'Joe')).toEqualTypeOf<string>();
}

function testSetProperties() {
  expectTypeOf(setProperties(person, { name: 'Joe' })).toEqualTypeOf<{ name: string }>();
  expectTypeOf(setProperties(person, { name: 'Joe', age: 35 })).toEqualTypeOf<{
    name: string;
    age: number;
  }>();
  expectTypeOf(setProperties(person, { name: 'Joe', capitalized: 'JOE' })).toEqualTypeOf<
    Pick<Person, 'name' | 'capitalized'>
  >();
  expectTypeOf(person.setProperties({ name: 'Joe' })).toEqualTypeOf<{ name: string }>();
  expectTypeOf(person.setProperties({ name: 'Joe', age: 35 })).toEqualTypeOf<
    Pick<Person, 'name' | 'age'>
  >();
  expectTypeOf(person.setProperties({ name: 'Joe', capitalized: 'JOE' })).toEqualTypeOf<
    Pick<Person, 'name' | 'capitalized'>
  >();
  expectTypeOf(setProperties(pojo, { name: 'Joe', age: 35 })).toEqualTypeOf<
    Pick<Person, 'name' | 'age'>
  >();
}

function testDynamic() {
  const obj: any = {};
  const dynamicKey: string = 'dummy'; // eslint-disable-line @typescript-eslint/no-inferrable-types

  expectTypeOf(get(obj, 'dummy')).toBeAny();
  expectTypeOf(get(obj, dynamicKey)).toBeAny();
  expectTypeOf(getProperties(obj, 'dummy')).toEqualTypeOf<{ dummy: any }>();
  expectTypeOf(getProperties(obj, ['dummy'])).toEqualTypeOf<{ dummy: any }>();
  expectTypeOf(getProperties(obj, dynamicKey)).toEqualTypeOf<Record<string, any>>();
  expectTypeOf(getProperties(obj, [dynamicKey])).toEqualTypeOf<Record<string, any>>();
  expectTypeOf(set(obj, 'dummy', 'value')).toBeAny();
  expectTypeOf(set(obj, dynamicKey, 'value')).toBeAny();
  expectTypeOf(setProperties(obj, { dummy: 'value ' })).toEqualTypeOf<Record<'dummy', any>>();
  expectTypeOf(setProperties(obj, { [dynamicKey]: 'value' })).toEqualTypeOf<
    Record<string | number, any>
  >();
}
