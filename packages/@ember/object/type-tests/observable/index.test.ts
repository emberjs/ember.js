import { expectTypeOf } from 'expect-type';

import Observable from '@ember/object/observable';

// A very naive test that at least makes sure we can import this
expectTypeOf<Observable['get']>().toMatchTypeOf<Function>();
