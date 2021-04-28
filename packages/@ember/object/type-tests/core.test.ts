import { expectTypeOf } from 'expect-type';

import CoreObject from '@ember/object/core';

expectTypeOf(CoreObject.create()).toEqualTypeOf<CoreObject>();
