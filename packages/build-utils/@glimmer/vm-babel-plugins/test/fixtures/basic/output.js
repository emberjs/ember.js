import { assert, deprecate } from '@glimmer/global-context';

if (
  true
  /* DEBUG */
) {
  console.log('foo');
}

true &&
  assert(foo, 'TESTING 123', {
    id: 'test',
  });
true &&
  !bar &&
  deprecate('TESTING 123', bar, {
    id: 'test',
  });
