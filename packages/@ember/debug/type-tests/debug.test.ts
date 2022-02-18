import { debug } from '@ember/debug';
import { expectTypeOf } from 'expect-type';

expectTypeOf(debug("I'm a debug notice!")).toEqualTypeOf<void>();

// @ts-expect-error requires a string
debug(1);
