import { guidFor } from '@ember/object/internals';
import { expectTypeOf } from 'expect-type';

expectTypeOf(guidFor('a string')).toBeString();
expectTypeOf(guidFor(123)).toBeString();
expectTypeOf(guidFor({ hello: 'world' })).toBeString();
expectTypeOf(guidFor([1, 2, 3])).toBeString();
