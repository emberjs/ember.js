import type Array from '@ember/array';
import { A } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';
import { expectTypeOf } from 'expect-type';

const pets = ['dog', 'cat', 'fish'];
const proxy = ArrayProxy.create({ content: A(pets) });

proxy.get('firstObject'); // 'dog'
proxy.set('content', A(['amoeba', 'paramecium']));
proxy.get('firstObject'); // 'amoeba'

const overridden = ArrayProxy.create({
  content: A(pets),
  objectAtContent(this: ArrayProxy<string>, idx: number): string | undefined {
    return (this.get('content') as Array<string>).objectAt(idx)?.toUpperCase();
  },
});

overridden.get('firstObject'); // 'DOG'

class MyNewProxy<T> extends ArrayProxy<T> {
  isNew = true;
}

const x = MyNewProxy.create({ content: A([1, 2, 3]) }) as MyNewProxy<number>;
expectTypeOf(x.get('firstObject')).toEqualTypeOf<number | undefined>();
expectTypeOf(x.isNew).toBeBoolean();
