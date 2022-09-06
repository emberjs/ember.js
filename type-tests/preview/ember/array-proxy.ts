import type Array from '@ember/array';
import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const pets = ['dog', 'cat', 'fish'];
const proxy = Ember.ArrayProxy.create({ content: Ember.A(pets) });

proxy.get('firstObject'); // 'dog'
proxy.set('content', Ember.A(['amoeba', 'paramecium']));
proxy.get('firstObject'); // 'amoeba'

const overridden = Ember.ArrayProxy.create({
  content: Ember.A(pets),
  objectAtContent(this: Ember.ArrayProxy<string>, idx: number): string | undefined {
    return (this.get('content') as Array<string>).objectAt(idx)?.toUpperCase();
  },
});

overridden.get('firstObject'); // 'DOG'

class MyNewProxy<T> extends Ember.ArrayProxy<T> {
  isNew = true;
}

const x = MyNewProxy.create({ content: Ember.A([1, 2, 3]) }) as MyNewProxy<number>;
expectTypeOf(x.get('firstObject')).toEqualTypeOf<number | undefined>();
expectTypeOf(x.isNew).toBeBoolean();
