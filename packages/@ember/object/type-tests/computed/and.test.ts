import { and } from '@ember/object/computed';

class Foo {
  @and('foo') and: unknown;

  @and('foo', 'bar', 'baz', 'qux') and2: unknown;

  // @ts-expect-error Requires a key
  @and()
  and3: unknown;

  // @ts-expect-error Arguments must be keys
  @and('foo', 1)
  and4: unknown;
}

new Foo();
