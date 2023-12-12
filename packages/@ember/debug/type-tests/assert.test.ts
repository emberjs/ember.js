import { assert } from '@ember/debug';
import { expectTypeOf } from 'expect-type';

let str: unknown;
assert('Must pass a string', typeof str === 'string');
expectTypeOf(assert).parameter(0).toBeString();

expectTypeOf(assert('foo')).toBeNever();

// Narrows
declare let test: string | undefined;
assert('desc', !!test);
expectTypeOf(test).toBeString();

// Functions as a type guard
let otherStr: unknown;
assert('Must pass a string', typeof otherStr === 'string');
expectTypeOf(otherStr).toEqualTypeOf<string>();

// Fail unconditionally
assert('This code path should never be run');
