import Component from '@ember/component';
import EmberObject, { computed, get, getProperties, set, setProperties } from '@ember/object';
import { addObserver, removeObserver } from '@ember/object/observers';
import { expectTypeOf } from 'expect-type';

class MyComponent extends Component {
  foo = 'bar';

  init() {
    this._super();
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

  @computed('foo')
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

class Person extends EmberObject {
  name = '';
  age = 0;

  @computed()
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
  expectTypeOf(getProperties(person, 'name', 'age')).toEqualTypeOf<{
    name: string;
    age: number;
  }>();
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
  expectTypeOf(person.getProperties('name', 'age', 'capitalized')).toEqualTypeOf<{
    name: string;
    age: number;
    capitalized: string;
  }>();
  expectTypeOf(getProperties(pojo, 'name', 'age')).toEqualTypeOf<
    Pick<typeof pojo, 'name' | 'age'>
  >();
}

function testSet() {
  expectTypeOf(set(person, 'name', 'Joe')).toBeString();
  expectTypeOf(set(person, 'age', 35)).toBeNumber();
  expectTypeOf(set(person, 'capitalized', 'JOE')).toBeString();
  expectTypeOf(person.set('name', 'Joe')).toBeString();
  expectTypeOf(person.set('age', 35)).toBeNumber();
  expectTypeOf(person.set('capitalized', 'JOE')).toBeString();
  expectTypeOf(set(pojo, 'name', 'Joe')).toBeString();
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
  expectTypeOf(person.setProperties({ name: 'Joe' })).toEqualTypeOf<Pick<Person, 'name'>>();
  expectTypeOf(person.setProperties({ name: 'Joe', age: 35 })).toEqualTypeOf<
    Pick<Person, 'name' | 'age'>
  >();
  expectTypeOf(person.setProperties({ name: 'Joe', capitalized: 'JOE' })).toEqualTypeOf<{
    name: string;
    capitalized: string;
  }>();
  expectTypeOf(setProperties(pojo, { name: 'Joe', age: 35 })).toEqualTypeOf<
    Pick<typeof pojo, 'name' | 'age'>
  >();
}

function testDynamic() {
  const obj: Record<string, string> = {};
  const dynamicKey = 'dummy' as string;

  // These all are "too loose" in `noUncheckedIndexedAccess`, but `get` has
  // never properly supported that flag, and there is no path to doing so. If
  // someone wants that support, they should switch to using direct property
  // access instead of using `get` (which has many other advantages).
  expectTypeOf(get(obj, 'dummy')).toEqualTypeOf<string>();
  expectTypeOf(get(obj, dynamicKey)).toEqualTypeOf<string>();
  expectTypeOf(getProperties(obj, 'dummy')).toEqualTypeOf<{ dummy: string }>();
  expectTypeOf(getProperties(obj, ['dummy'])).toEqualTypeOf<{ dummy: string }>();
  expectTypeOf(getProperties(obj, dynamicKey)).toEqualTypeOf<Record<string, string>>();
  expectTypeOf(getProperties(obj, [dynamicKey])).toEqualTypeOf<Record<string, string>>();
  expectTypeOf(set(obj, 'dummy', 'value')).toBeString();
  expectTypeOf(set(obj, dynamicKey, 'value')).toBeString();
  expectTypeOf(setProperties(obj, { dummy: 'value ' })).toEqualTypeOf<
    Record<'dummy', string>
  >();
  expectTypeOf(setProperties(obj, { [dynamicKey]: 'value' })).toEqualTypeOf<
    Record<string, string>
  >();
}
