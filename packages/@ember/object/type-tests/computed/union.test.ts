import { union } from '@ember/object/computed';

class Foo {
  @union('foo') declare union: unknown[];
  @union('foo', 'bar', 'baz') declare union2: unknown[];

  // @ts-expect-error it requires a key
  @union()
  declare union3: unknown[];
}

new Foo();
