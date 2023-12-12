import { enableDestroyableTracking } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

if (enableDestroyableTracking) {
  expectTypeOf(enableDestroyableTracking()).toEqualTypeOf<void>();
}
