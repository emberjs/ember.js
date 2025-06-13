import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class LifetimeHooks extends Ember.Object {
  resource: {} | undefined;

  init(properties?: object) {
    super.init(properties);
    this.resource = {};
  }

  willDestroy() {
    this.resource = undefined;
    super.willDestroy();
  }
}

class MyObject30 extends Ember.Object {
  constructor() {
    super();
  }
}

class MyObject31 extends Ember.Object {
  constructor(owner: Ember.EngineInstance) {
    super(owner);
  }
}

class Foo extends Ember.Object {
  @Ember.computed()
  get a() {
    return '';
  }

  set a(newVal: string) {
    /* no-op */
  }

  b = 5;

  baz() {
    this.b = 10;
    expectTypeOf(this.b.toFixed(4)).toEqualTypeOf<string>();
  }
}

export class Foo2 extends Ember.Object {
  name = '';

  changeName(name: string) {
    expectTypeOf(Ember.set(this, 'name', name)).toBeString();

    expectTypeOf(Ember.get(this as Foo2, 'name')).toBeString();

    expectTypeOf(Ember.setProperties(this, { name })).toEqualTypeOf<{ name: string }>();
  }

  bar() {
    Ember.notifyPropertyChange(this, 'name');
    // @ts-expect-error
    Ember.notifyPropertyChange(this);
    // @ts-expect-error
    Ember.notifyPropertyChange('name');
    // @ts-expect-error
    Ember.notifyPropertyChange(this, 'name', 'bar');
  }
}
