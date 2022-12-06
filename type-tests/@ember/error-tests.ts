import EmberError from '@ember/error';
import { expectTypeOf } from 'expect-type';

expectTypeOf(new EmberError('Fuuuuuuuu')).toEqualTypeOf<Error>();

// allows to extend from EmberError
class AjaxError extends Error {}
