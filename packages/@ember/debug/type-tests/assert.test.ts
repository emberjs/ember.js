import { assert } from '@ember/debug';
import { expectTypeOf } from 'expect-type';

let str: unknown;
assert('Must pass a string', typeof str === 'string');

// Fail unconditionally
assert('This code path should never be run');

expectTypeOf(assert('foo')).toEqualTypeOf<void>();

// @ts-expect-error inverted order
assert(typeof str === 'string', 'Must pass a string');

// Functions as a type guard
let otherStr: unknown;
assert('Must pass a string', typeof otherStr === 'string');
expectTypeOf(otherStr).toEqualTypeOf<string>();
