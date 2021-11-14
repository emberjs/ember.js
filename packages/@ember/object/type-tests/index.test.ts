import { expectTypeOf } from 'expect-type';

import EmberObject from '@ember/object';

expectTypeOf(EmberObject.create()).toEqualTypeOf<EmberObject>();
