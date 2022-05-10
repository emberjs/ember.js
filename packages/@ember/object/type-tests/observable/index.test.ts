import { expectTypeOf } from 'expect-type';

import type Mixin from '@ember/object/mixin';
import type Observable from '@ember/object/observable';

// A very naive test that at least makes sure we can import this
expectTypeOf<typeof Observable>().toMatchTypeOf<Mixin>();
