import { expectTypeOf } from 'expect-type';

import Observable from '@ember/object/observable';

expectTypeOf<Observable['get']>().toEqualTypeOf<<K extends keyof Observable>(key: K) => unknown>();
