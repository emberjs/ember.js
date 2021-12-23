import { oneWay } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(oneWay('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @oneWay('foo') oneWay: unknown;

  // @ts-expect-error Only takes one key
  @oneWay('foo', 'bar')
  oneWay2: unknown;

  // @ts-expect-error Requires a key
  @oneWay()
  oneWay3: unknown;
}

new Foo();
