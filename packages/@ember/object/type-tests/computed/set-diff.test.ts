import { setDiff } from '@ember/object/computed';

class Foo {
  @setDiff('foo', 'bar') declare setDiff: boolean;

  // @ts-expect-error Requires a second key parameter
  @setDiff('foo')
  declare setDiff2: boolean;

  // @ts-expect-error Requires a key
  @setDiff()
  declare setDiff3: boolean;
}

new Foo();
