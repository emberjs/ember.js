import { notEmpty } from '@ember/object/computed';

class Foo {
  @notEmpty('foo') notEmpty: unknown;

  // @ts-expect-error Only takes one key
  @notEmpty('foo', 'bar')
  notEmpty2: unknown;

  // @ts-expect-error Requires a key
  @notEmpty()
  notEmpty3: unknown;
}

new Foo();
