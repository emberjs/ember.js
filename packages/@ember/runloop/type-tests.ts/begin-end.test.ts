import { begin, end } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

expectTypeOf(begin()).toEqualTypeOf<void>();

// code to be executed within a RunLoop
expectTypeOf(end()).toEqualTypeOf<void>();
