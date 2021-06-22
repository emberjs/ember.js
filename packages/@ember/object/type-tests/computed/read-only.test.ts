import { readOnly } from '@ember/object/computed';

class Foo {
  @readOnly('foo') readOnly: unknown;

  // @ts-expect-error Only takes one key
  @readOnly('foo', 'bar')
  readOnly2: unknown;

  // @ts-expect-error Requires a key
  @readOnly()
  readOnly3: unknown;
}

new Foo();
