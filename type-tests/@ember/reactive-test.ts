import { trackedArray, trackedObject, trackedWeakSet, trackedSet, trackedMap, trackedWeakMap } from '@ember/reactive';
import { expectTypeOf } from 'expect-type';


// ------- trackedArray -------
expectTypeOf(trackedArray()).toEqualTypeOf<unknown[]>();
expectTypeOf(trackedArray([1, 3])).toEqualTypeOf<number[]>();

// ------- trackedObject -------
expectTypeOf(trackedObject()).toEqualTypeOf<object>();
expectTypeOf(trackedObject({ foo: 2 } as const)).toEqualTypeOf<{ readonly foo: 2 }>();

// ------- trackedWeakSet -------
expectTypeOf(trackedWeakSet<object>()).toEqualTypeOf<WeakSet<object>>();
expectTypeOf(trackedWeakSet([{ foo: 2 } as const])).toEqualTypeOf<WeakSet<{ readonly foo: 2 }>>();

// ------- trackedSet -------
expectTypeOf(trackedSet<number>()).toEqualTypeOf<Set<number>>();
expectTypeOf(trackedSet(new Set([1, 2, 3]))).toEqualTypeOf<Set<number>>()


// ------- trackedMap -------
expectTypeOf(trackedMap<string, number>()).toEqualTypeOf<Map<string, number>>();
expectTypeOf(trackedMap(new Map([['foo', 2]]))).toEqualTypeOf<Map<string, number>>();

// ------- trackedWeakMap -------
expectTypeOf(trackedWeakMap<object, string>()).toEqualTypeOf<WeakMap<object, string>>();
expectTypeOf(trackedWeakMap([[{ greet: 'hi'}, 2], [{greet: 'hello'}, 3]])).toEqualTypeOf<WeakMap<{ greet: string}, number>>();
