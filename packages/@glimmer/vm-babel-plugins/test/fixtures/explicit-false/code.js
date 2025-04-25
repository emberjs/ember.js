import { DEBUG } from '@glimmer/env';
import { assert, deprecate } from '@glimmer/global-context';

if (DEBUG) {
  console.log('foo');
}

assert(foo, 'TESTING 123', { id: 'test' });
deprecate('TESTING 123', bar, { id: 'test' });
