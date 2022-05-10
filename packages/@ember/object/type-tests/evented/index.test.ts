import { expectTypeOf } from 'expect-type';

import type Mixin from '@ember/object/mixin';
import type Evented from '@ember/object/evented';

// A very naive test that at least makes sure we can import this
expectTypeOf<typeof Evented>().toMatchTypeOf<Mixin>();
