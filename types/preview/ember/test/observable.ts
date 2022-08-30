import Ember from 'ember';
import { assertType } from './lib/assert';
import { expectTypeOf } from 'expect-type';

class MyComponent extends Ember.Component {
  foo = 'bar';

  init() {
    this._super();
    this.addObserver('foo', this, 'fooDidChange');
    this.addObserver('foo', this, this.fooDidChange);
    Ember.addObserver(this, 'foo', this, 'fooDidChange');
    Ember.addObserver(this, 'foo', this, this.fooDidChange);
    this.removeObserver('foo', this, 'fooDidChange');
    this.removeObserver('foo', this, this.fooDidChange);
    Ember.removeObserver(this, 'foo', this, 'fooDidChange');
    Ember.removeObserver(this, 'foo', this, this.fooDidChange);
    const lambda = () => {
      this.fooDidChange(this, 'foo');
    };
    this.addObserver('foo', lambda);
    this.removeObserver('foo', lambda);
    Ember.addObserver(this, 'foo', lambda);
    Ember.removeObserver(this, 'foo', lambda);
  }

  @Ember.computed('foo')
  get bar(): string {
    return this.foo;
  }

  fooDidChange(sender: MyComponent, key: string) {
    // your code
  }
}

const myComponent = MyComponent.create();
myComponent.addObserver('foo', null, () => {});
myComponent.set('foo', 'baz');
expectTypeOf(myComponent.get('foo')).toEqualTypeOf<string>();

class Person extends Ember.Object {
  name = '';
  age = 0;

  @Ember.computed()
  get capitalized() {
    return this.get('name').toUpperCase();
  }
}
const person = Person.create({
  name: 'Fred',
  age: 29,
});

const pojo = { name: 'Fred', age: 29 };

function testGet() {
  expectTypeOf(Ember.get(person, 'name')).toEqualTypeOf<string>();
  expectTypeOf(Ember.get(person, 'age')).toEqualTypeOf<number>();
  expectTypeOf(Ember.get(person, 'capitalized')).toEqualTypeOf<string>();
  expectTypeOf(person.get('name')).toEqualTypeOf<string>();
  expectTypeOf(person.get('age')).toEqualTypeOf<number>();
  expectTypeOf(person.get('capitalized')).toEqualTypeOf<string>();
  expectTypeOf(Ember.get(pojo, 'name')).toEqualTypeOf<string>();
}

function testGetProperties() {
  assertType<{ name: string }>(Ember.getProperties(person, 'name'));
  assertType<{ name: string; age: number }>(Ember.getProperties(person, 'name', 'age'));
  assertType<{ name: string; age: number }>(Ember.getProperties(person, ['name', 'age']));
  assertType<{ name: string; age: number; capitalized: string }>(
    Ember.getProperties(person, 'name', 'age', 'capitalized')
  );
  assertType<{ name: string }>(person.getProperties('name'));
  assertType<{ name: string; age: number }>(person.getProperties('name', 'age'));
  assertType<{ name: string; age: number }>(person.getProperties(['name', 'age']));
  assertType<{ name: string; age: number; capitalized: string }>(
    person.getProperties('name', 'age', 'capitalized')
  );
  assertType<{ name: string; age: number }>(Ember.getProperties(pojo, 'name', 'age'));
}

function testSet() {
  assertType<string>(Ember.set(person, 'name', 'Joe'));
  assertType<number>(Ember.set(person, 'age', 35));
  assertType<string>(Ember.set(person, 'capitalized', 'JOE'));
  assertType<string>(person.set('name', 'Joe'));
  assertType<number>(person.set('age', 35));
  assertType<string>(person.set('capitalized', 'JOE'));
  assertType<string>(Ember.set(pojo, 'name', 'Joe'));
}

function testSetProperties() {
  assertType<{ name: string }>(Ember.setProperties(person, { name: 'Joe' }));
  assertType<{ name: string; age: number }>(Ember.setProperties(person, { name: 'Joe', age: 35 }));
  assertType<{ name: string; capitalized: string }>(
    Ember.setProperties(person, { name: 'Joe', capitalized: 'JOE' })
  );
  assertType<{ name: string }>(person.setProperties({ name: 'Joe' }));
  assertType<{ name: string; age: number }>(person.setProperties({ name: 'Joe', age: 35 }));
  assertType<{ name: string; capitalized: string }>(
    person.setProperties({ name: 'Joe', capitalized: 'JOE' })
  );
  assertType<{ name: string; age: number }>(Ember.setProperties(pojo, { name: 'Joe', age: 35 }));
}

function testDynamic() {
  const obj: Record<string, string> = {};
  const dynamicKey = 'dummy' as string;

  // These all are "too loose" in `noUncheckedIndexedAccess`, but `get` has
  // never properly supported that flag, and there is no path to doing so. If
  // someone wants that support, they should switch to using direct property
  // access instead of using `get` (which has many other advantages).
  expectTypeOf(Ember.get(obj, 'dummy')).toEqualTypeOf<string>();
  expectTypeOf(Ember.get(obj, dynamicKey)).toEqualTypeOf<string>();
  expectTypeOf(Ember.getProperties(obj, 'dummy')).toEqualTypeOf<{ dummy: string }>();
  expectTypeOf(Ember.getProperties(obj, ['dummy'])).toEqualTypeOf<{ dummy: string }>();
  expectTypeOf(Ember.getProperties(obj, dynamicKey)).toEqualTypeOf<Record<string, string>>();
  expectTypeOf(Ember.getProperties(obj, [dynamicKey])).toEqualTypeOf<Record<string, string>>();
  expectTypeOf(Ember.set(obj, 'dummy', 'value')).toBeString();
  expectTypeOf(Ember.set(obj, dynamicKey, 'value')).toBeString();
  expectTypeOf(Ember.setProperties(obj, { dummy: 'value ' })).toEqualTypeOf<
    Record<'dummy', string>
  >();
  expectTypeOf(Ember.setProperties(obj, { [dynamicKey]: 'value' })).toEqualTypeOf<
    Record<string, string>
  >();
}
