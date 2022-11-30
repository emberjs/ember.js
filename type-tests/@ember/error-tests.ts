import Error from '@ember/error';
import { expectTypeOf } from 'expect-type';

expectTypeOf(new Error('Fuuuuuuuu')).toEqualTypeOf<Error>();

// allows to extend from EmberError
class AjaxError extends Error {}
