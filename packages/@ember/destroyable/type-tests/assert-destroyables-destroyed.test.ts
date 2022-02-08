import { assertDestroyablesDestroyed } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

if (assertDestroyablesDestroyed) {
  expectTypeOf(assertDestroyablesDestroyed()).toEqualTypeOf<void>();
}
