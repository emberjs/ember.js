import EmberError from '@ember/error';
import { expectTypeOf } from 'expect-type';

expectTypeOf(EmberError('Blah')).toEqualTypeOf<Error>();
expectTypeOf(new EmberError('Blah')).toEqualTypeOf<Error>();
