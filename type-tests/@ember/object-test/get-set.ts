import { get, set } from '@ember/object';
import { expectTypeOf } from 'expect-type';

const basicPojo = { greeting: 'hello' };

expectTypeOf(get(basicPojo, 'greeting')).toEqualTypeOf<string>();
expectTypeOf(get(basicPojo, 'salutation')).toEqualTypeOf<unknown>();
expectTypeOf(set(basicPojo, 'greeting', 'ahoy')).toEqualTypeOf<string>();
// This matches the runtime behavior. We do not catch setting things this way,
// as a result, but in a world where native property access works everywhere,
// this is actually somewhat useful: it means you can set anything on a target
// object, and although the type will not be updated with that change, it will
// at least type check in a way that matches the dynamic runtime behavior.
expectTypeOf(set(basicPojo, 'salutation', 'heyo')).toBeString();

declare let whoKnows: unknown;
expectTypeOf(get(whoKnows, 'any-string')).toEqualTypeOf<unknown>();
// @ts-expect-error
set(whoKnows, 'any-string', 123);
