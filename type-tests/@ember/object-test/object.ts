import Object, { computed, get, notifyPropertyChange, set, setProperties } from '@ember/object';
import Owner from '@ember/owner';
import { expectTypeOf } from 'expect-type';

class LifetimeHooks extends Object {
  resource: {} | undefined;

  init() {
    this._super();
    this.resource = {};
  }

  willDestroy() {
    this.resource = undefined;
    this._super();
  }
}

class MyObject30 extends Object {
  constructor() {
    super();
  }
}

class MyObject31 extends Object {
  constructor(owner: Owner) {
    super(owner);
  }
}

class Foo extends Object {
  @computed()
  get a() {
    return '';
  }

  set a(newVal: string) {
    /* no-op */
  }

  b = 5;

  baz() {
    expectTypeOf(this.b).toBeNumber();
    expectTypeOf(this.a).toBeString();
    this.b = 10;

    // For some reason, `this` type lookup does not resolve correctly here. Used
    // outside a class, like `get(someFoo, 'name')`, this works correctly. Since
    // there are basically no cases inside a class where you *have* to use `get`
    // today, this is an acceptable workaround for now. It is assignable *or*
    // castable.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const a: number = this.get('b');

    expectTypeOf(this.get('b').toFixed(4)).toEqualTypeOf<string>();
    expectTypeOf(this.set('a', 'abc').split(',')).toEqualTypeOf<string[]>();
    expectTypeOf(this.set('b', 10).toFixed(4)).toEqualTypeOf<string>();

    this.setProperties({ b: 11 });
    // this.setProperties({ b: '11' }); // @ts-expect-error
    this.setProperties({
      a: 'def',
      b: 11,
    });
  }
}

export class Foo2 extends Object {
  name = '';

  changeName(name: string) {
    expectTypeOf(this.set('name', name)).toBeString();
    expectTypeOf(set(this, 'name', name)).toBeString();

    // For some reason, `this` type lookup does not resolve correctly here. Used
    // outside a class, like `get(someFoo, 'name')`, this works correctly. Since
    // there are basically no cases inside a class where you *have* to use `get`
    // today, this is an acceptable workaround for now. It is assignable *or*
    // castable.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const s: string = this.get('name');
    expectTypeOf(get(this as Foo2, 'name')).toBeString();
    expectTypeOf((this as Foo2).get('name')).toBeString();

    expectTypeOf(this.setProperties({ name })).toEqualTypeOf<{ name: string }>();
    expectTypeOf(setProperties(this, { name })).toEqualTypeOf<{ name: string }>();
  }

  bar() {
    notifyPropertyChange(this, 'name');
    // @ts-expect-error
    notifyPropertyChange(this);
    // @ts-expect-error
    notifyPropertyChange('name');
    // @ts-expect-error
    notifyPropertyChange(this, 'name', 'bar');
  }
}
