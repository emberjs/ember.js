import Ember from 'ember';
import { ExtractPropertyNamesOfType } from '@ember/object/-private/types';
import Observable from '@ember/object/observable';
import { expectTypeOf } from 'expect-type';

class OtherThing {
  observerOfDemo(target: DemoObservable, key: string) {}
}

class DemoObservable implements Observable {
  foo: string;
  isFoo = true;
  bar: [boolean, boolean];
  baz?: number | undefined;
  constructor() {
    this.foo = 'hello';
    this.bar = [false, true];
    this.baz = 9;
    this.addObserver('foo', this, 'fooDidChange');
    // @ts-expect-error
    this.addObserver('foo', this, 'fooDidChangeProtected');
    this.addObserver('foo', this, this.fooDidChange);
    this.addObserver('foo', this, this.fooDidChangeProtected);
    const ot = new OtherThing();
    this.addObserver('foo', ot, ot.observerOfDemo);
    Ember.addObserver(this, 'foo', this, 'fooDidChange');
    // @ts-expect-error
    Ember.addObserver(this, 'foo', this, 'fooDidChangeProtected');
    Ember.addObserver(this, 'foo', this, this.fooDidChange);
    Ember.addObserver(this, 'foo', this, this.fooDidChangeProtected);
    this.removeObserver('foo', this, 'fooDidChange');
    // @ts-expect-error
    this.removeObserver('foo', this, 'fooDidChangeProtected');
    this.removeObserver('foo', this, this.fooDidChange);
    this.removeObserver('foo', this, this.fooDidChangeProtected);
    Ember.removeObserver(this, 'foo', this, 'fooDidChange');
    // @ts-expect-error
    Ember.removeObserver(this, 'foo', this, 'fooDidChangeProtected');
    Ember.removeObserver(this, 'foo', this, this.fooDidChange);
    const lambda = () => {
      this.fooDidChange(this, 'foo');
    };
    this.addObserver('foo', lambda);
    this.addObserver('foo', (sender, key, value, rev) => {
      // cannot check type equality with `this`, can only check assignability
      let self = this;
      self = sender;
      sender = this;

      expectTypeOf(key).toEqualTypeOf<'foo'>();
      expectTypeOf(rev).toBeNumber();

      // same issue with assignability and `this` types since `value` derives
      // from `this['foo']`
      this.foo = value;
      value = this.foo;
    });
    this.removeObserver('foo', lambda);
    Ember.addObserver(this, 'foo', lambda);
    Ember.removeObserver(this, 'foo', lambda);
  }
  _super(...args: any[]) {
    throw new Error('Method not implemented.');
  }
  init(): void {
    throw new Error('Method not implemented.');
  }
  declare concatenatedProperties: string[] | null;
  declare isDestroyed: boolean;
  declare isDestroying: boolean;
  destroy(): this {
    throw new Error('Method not implemented.');
  }
  willDestroy(): void {
    throw new Error('Method not implemented.');
  }
  toString(): string {
    throw new Error('Method not implemented.');
  }

  fooDidChange(obj: this, propName: string) {}
  protected fooDidChangeProtected(obj: this, propName: string) {}
  get<K extends keyof this>(key: K): this[K] {
    throw new Error('Method not implemented.');
  }
  getProperties(): {};
  getProperties<K extends keyof this>(list: K[]): Pick<this, K>;
  getProperties<K extends keyof this>(...list: K[]): Pick<this, K>;
  getProperties(...rest: any[]): any {
    throw new Error('Method not implemented.');
  }
  set<K extends keyof this>(key: K, value: this[K]): this[K] {
    throw new Error('Method not implemented.');
  }
  setProperties<K extends keyof this>(hash: Pick<this, K>): Pick<this, K> {
    throw new Error('Method not implemented.');
  }
  notifyPropertyChange(keyName: string): this {
    throw new Error('Method not implemented.');
  }
  addObserver<Target>(
    key: keyof this,
    target: Target,
    method:
      | keyof Target
      | ((this: Target, sender: this, key: string, value: any, rev: number) => void)
  ): any;
  addObserver<K extends keyof this>(
    key: K,
    method: keyof this | ((this: this, sender: this, key: K, value: this[K], rev: number) => void)
  ): any;
  addObserver(key: any, target: any, method?: any) {
    throw new Error('Method not implemented.');
  }
  removeObserver<Target>(
    key: keyof this,
    target: Target,
    method:
      | keyof Target
      | ((this: Target, sender: this, key: string, value: any, rev: number) => void)
  ): any;
  removeObserver(
    key: keyof this,
    method: keyof this | ((this: this, sender: this, key: string, value: any, rev: number) => void)
  ): any;
  removeObserver(key: any, target: any, method?: any): void {
    throw new Error('Method not implemented.');
  }
  incrementProperty(
    keyName: ExtractPropertyNamesOfType<this, number | undefined>,
    increment?: number
  ): number {
    throw new Error('Method not implemented.');
  }
  decrementProperty(
    keyName: ExtractPropertyNamesOfType<this, number | undefined>,
    decrement?: number
  ): number {
    throw new Error('Method not implemented.');
  }
  toggleProperty(keyName: ExtractPropertyNamesOfType<this, boolean | undefined>): boolean {
    throw new Error('Method not implemented.');
  }
  cacheFor<K extends keyof this>(key: K): this[K] | undefined {
    throw new Error('Method not implemented.');
  }
}
const o = new DemoObservable();

/**
 * get
 */
expectTypeOf(o.get('foo')).toBeString();
expectTypeOf(o.get('bar')).toEqualTypeOf<[boolean, boolean]>();
expectTypeOf(o.get('baz')).toEqualTypeOf<number | undefined>();

/**
 * incrementProperty, decrementProperty
 */
expectTypeOf(o.incrementProperty('baz')).toBeNumber();
expectTypeOf(o.decrementProperty('baz')).toBeNumber();
expectTypeOf(o.incrementProperty('baz', 3)).toBeNumber();
expectTypeOf(o.decrementProperty('baz', 12)).toBeNumber();
// non-numeric property case
// @ts-expect-error
o.incrementProperty('bar');
// @ts-expect-error
o.decrementProperty('bar');
// empty case
// @ts-expect-error
o.incrementProperty();
// @ts-expect-error
o.decrementProperty();

/**
 * toggleProperty
 */
expectTypeOf(o.toggleProperty('isFoo')).toBeBoolean();
// @ts-expect-error
o.toggleProperty();

/**
 * getProperties
 */
// ('foo', 'bar')
expectTypeOf(o.getProperties('foo', 'bar')).toEqualTypeOf<{
  foo: string;
  bar: [boolean, boolean];
}>();
// ['foo', 'bar']
expectTypeOf(o.getProperties(['foo', 'bar'])).toEqualTypeOf<{
  foo: string;
  bar: [boolean, boolean];
}>();
// empty cases
expectTypeOf(o.getProperties()).toEqualTypeOf<{}>();
expectTypeOf(o.getProperties([])).toEqualTypeOf<{}>();
// property that doesn't exist
// @ts-expect-error
o.getProperties('jeanShorts', 'foo');
// @ts-expect-error
o.getProperties(['foo', 'jeanShorts']);

/**
 * set
 */
expectTypeOf(o.set('foo', 'abc')).toBeString();
expectTypeOf(o.set('bar', [false, false])).toEqualTypeOf<[boolean, boolean]>();
expectTypeOf(o.set('baz', undefined)).toEqualTypeOf<number | undefined>();
expectTypeOf(o.set('baz', 10)).toEqualTypeOf<number | undefined>();
// property that doesn't exist
// @ts-expect-error
o.set('jeanShorts', 10);

/**
 * setProperties
 */
expectTypeOf(o.setProperties({ foo: 'abc', bar: [true, true] })).toEqualTypeOf<{
  foo: string;
  bar: [boolean, boolean];
}>();
// empty case
expectTypeOf(o.setProperties({})).toEqualTypeOf<{}>();
// property that doesn't exist
// @ts-expect-error
o.setProperties({ jeanShorts: 'under the pants' });

/**
 * notifyPropertyChange
 */
expectTypeOf(o.notifyPropertyChange('foo')).toEqualTypeOf<DemoObservable>();
expectTypeOf(o.notifyPropertyChange('jeanShorts')).not.toMatchTypeOf<Observable>();
