import { get, set } from '@ember/object';
import { expectTypeOf } from 'expect-type';

const basicPojo = { greeting: 'hello' };

expectTypeOf(get(basicPojo, 'greeting')).toEqualTypeOf<string>();
expectTypeOf(get(basicPojo, 'salutation')).toEqualTypeOf<unknown>();
expectTypeOf(set(basicPojo, 'greeting', 'ahoy')).toEqualTypeOf<string>();
// @ts-expect-error
set(basicPojo, 'salutation', 'heyo');

declare let whoKnows: unknown;
expectTypeOf(get(whoKnows, 'any-string')).toEqualTypeOf<unknown>();
// @ts-expect-error
set(whoKnows, 'any-string', 123);
