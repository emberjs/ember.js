import { expectTypeOf } from 'expect-type';

import EmberObject from '@ember/object';
import { Owner } from '@ember/-internals/owner';

// Good enough for tests
let owner = {} as Owner;

expectTypeOf(EmberObject.create()).toEqualTypeOf<EmberObject>();

/**
 * Zero-argument case
 */
const o = EmberObject.create();
// create returns an object
expectTypeOf(o).toMatchTypeOf<object>();

// object returned by create type-checks as an instance of Ember.Object
expectTypeOf(o.isDestroyed).toEqualTypeOf<boolean>(); // from instance
expectTypeOf(o.isDestroying).toEqualTypeOf<boolean>(); // from instance

/**
 * One-argument case
 */
const o1 = EmberObject.create({ x: 9, y: 'hello', z: false });
expectTypeOf(o1.x).toEqualTypeOf<number>();
expectTypeOf(o1.y).toEqualTypeOf<string>();
expectTypeOf(o1.z).toEqualTypeOf<boolean>();

const obj = EmberObject.create({ a: 1 }, { b: 2 }, { c: 3 });
expectTypeOf(obj.b).toEqualTypeOf<number>();
expectTypeOf(obj.a).toEqualTypeOf<number>();
expectTypeOf(obj.c).toEqualTypeOf<number>();

export class Person extends EmberObject {
  firstName!: string;
  lastName!: string;
  age!: number;
}
const p = new Person(owner);

expectTypeOf(p.firstName).toEqualTypeOf<string>();

// get not preferred for TS only returns unknown
expectTypeOf(p.get('firstName')).toEqualTypeOf<unknown>();
// Also returns unknown for invalid properties
expectTypeOf(p.get('invalid')).toEqualTypeOf<unknown>();

expectTypeOf(p.incrementProperty('age')).toEqualTypeOf<number>();
expectTypeOf(p.incrementProperty('age', 2)).toEqualTypeOf<number>();
// @ts-expect-error must increment by a value
p.incrementProperty('age', 'foo');

expectTypeOf(p.decrementProperty('age')).toEqualTypeOf<number>();
expectTypeOf(p.decrementProperty('age', 2)).toEqualTypeOf<number>();
// @ts-expect-error must decrement by a value
p.decrementProperty('age', 'foo');

expectTypeOf(p.toggleProperty('age')).toEqualTypeOf<boolean>();

expectTypeOf(p.cacheFor('age')).toEqualTypeOf<unknown>();

// get is not preferred for TS and only returns unknown
const getPropertiesResult = p.getProperties('firstName', 'lastName', 'invalid');
expectTypeOf(getPropertiesResult).toEqualTypeOf<{
  firstName: unknown;
  lastName: unknown;
  invalid: unknown;
}>();
// @ts-expect-error doesn't have unknown properties
getPropertiesResult.unknown;

expectTypeOf(p.set('firstName', 'Joe')).toEqualTypeOf<string>();
expectTypeOf(p.set('invalid', 1)).toEqualTypeOf<number>();

const setPropertiesResult = p.setProperties({ firstName: 'Joe', invalid: 1 });
expectTypeOf(setPropertiesResult).toEqualTypeOf<{
  firstName: string;
  invalid: number;
}>();
expectTypeOf(setPropertiesResult.firstName).toEqualTypeOf<string>();
expectTypeOf(setPropertiesResult.invalid).toEqualTypeOf<number>();
// @ts-expect-error doesn't have unknown properties
setPropertiesResult.unknown;

expectTypeOf(p.notifyPropertyChange('firstName')).toEqualTypeOf(p);

const p2 = Person.create({ firstName: 'string' });
expectTypeOf(p2.firstName).toEqualTypeOf<string>();

const p2b = Person.create({}, { firstName: 'string' });
expectTypeOf(p2b.firstName).toEqualTypeOf<string>();

const p2c = Person.create({}, {}, { firstName: 'string' });
expectTypeOf(p2c.firstName).toEqualTypeOf<string>();

// NOTE: This is marked as @internal and will not be publicly available
Person.extend({ fullName: 6 });

// NOTE: This is marked as @internal and will not be publicly available
Person.reopen({ fullName: 6 });

// NOTE: This is marked as @internal and will not be publicly available
Person.reopenClass({ fullName: 6 });

class MyComponent extends EmberObject {
  foo = 'bar';

  constructor(owner: Owner) {
    super(owner);

    this.addObserver('foo', this, 'fooDidChange');

    this.addObserver('foo', this, this.fooDidChange);
    this.removeObserver('foo', this, 'fooDidChange');

    this.removeObserver('foo', this, this.fooDidChange);
    const lambda = () => {
      this.fooDidChange(this, 'foo');
    };
    this.addObserver('foo', lambda);
    this.removeObserver('foo', lambda);
  }

  fooDidChange(_sender: this, _key: string) {
    // your code
  }
}

const myComponent = MyComponent.create();
myComponent.addObserver('foo', null, () => {});
myComponent.set('foo', 'baz');
