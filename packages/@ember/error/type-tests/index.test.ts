import EmberError from '@ember/error';
import { expectTypeOf } from 'expect-type';

expectTypeOf(EmberError).toEqualTypeOf<ErrorConstructor>();
