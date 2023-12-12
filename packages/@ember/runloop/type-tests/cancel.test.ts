import { cancel, next } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

let runNext = next(null, () => {
  // will not be executed
});

expectTypeOf(cancel(runNext)).toEqualTypeOf<boolean>();
