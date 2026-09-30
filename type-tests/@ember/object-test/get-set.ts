import { get, set } from '@ember/object';
import { expectTypeOf } from 'expect-type';

const basicPojo = { greeting: 'hello' };

expectTypeOf(get(basicPojo, 'greeting')).toEqualTypeOf<string>();
expectTypeOf(get(basicPojo, 'salutation')).toEqualTypeOf<unknown>();
expectTypeOf(set(basicPojo, 'greeting', 'ahoy')).toEqualTypeOf<string>();
// This matches the runtime behavior. As a result, we do not catch setting things this way.
// But in a world where native property access works everywhere, this is somewhat useful.
// It means you can set anything on a target object.
// The type will not be updated with that change,
// but it will at least type check in a way that matches the dynamic runtime behavior.
expectTypeOf(set(basicPojo, 'salutation', 'heyo')).toBeString();

declare let whoKnows: unknown;
expectTypeOf(get(whoKnows, 'any-string')).toEqualTypeOf<unknown>();
// @ts-expect-error
set(whoKnows, 'any-string', 123);
