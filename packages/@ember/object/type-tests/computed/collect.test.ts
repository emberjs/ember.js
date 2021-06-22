import { collect } from '@ember/object/computed';

class Foo {
  @collect('foo') declare collect: unknown[];
  @collect('foo', 'bar', 'baz') declare collect2: unknown[];

  // @ts-expect-error it requires a key
  @collect()
  declare collect3: unknown[];
}

new Foo();
