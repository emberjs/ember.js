import { trySet } from '@ember/object';
import { expectTypeOf } from 'expect-type';

const obj = { name: 'Zoey' };

const result = trySet(obj, 'contacts.twitter', '@emberjs');
expectTypeOf(result).toEqualTypeOf<string | undefined>();

// @ts-expect-error requires a value
trySet(obj, 'contacts.twitter');

// @ts-expect-error requires a key
trySet(obj);

// @ts-expect-error requires an object
trySet('contacts.twitter', '@emberjs');
