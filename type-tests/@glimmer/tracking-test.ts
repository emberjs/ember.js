import { tracked } from '@glimmer/tracking';
import type { Reactive, ReadOnlyReactive, TrackedValue } from '@glimmer/tracking';
import { expectTypeOf } from 'expect-type';

// ------- public types -------
// The standalone form is assignable to the shared reactive interfaces.
expectTypeOf(tracked(0)).toMatchTypeOf<Reactive<number>>();
expectTypeOf(tracked(0)).toMatchTypeOf<TrackedValue<number>>();

// A frozen value is (structurally) a read-only reactive.
const readOnly: ReadOnlyReactive<number> = tracked(0);
// @ts-expect-error -- ReadOnlyReactive.value is read-only
readOnly.value = 1;

// ------- standalone form -------
const count = tracked(0);

expectTypeOf(count.value).toEqualTypeOf<number>();
expectTypeOf(count.get()).toEqualTypeOf<number>();
expectTypeOf(count.set(1)).toEqualTypeOf<boolean>();
expectTypeOf(count.update((n) => n + 1)).toEqualTypeOf<void>();
expectTypeOf(count.freeze()).toEqualTypeOf<void>();

// @ts-expect-error -- the value type is inferred from the initial value
count.set('hello');

// ------- standalone form with options -------
const greeting = tracked('hello', {
  equals: (a, b) => a === b,
  description: 'a greeting',
});

expectTypeOf(greeting.value).toEqualTypeOf<string>();

// @ts-expect-error -- equals must compare the value type
tracked(0, { equals: (a: string, b: string) => a === b });

// ------- decorator forms -------
class Counter {
  @tracked count = 0;
}

expectTypeOf(new Counter().count).toEqualTypeOf<number>();

// classic class form returns a decorator
expectTypeOf(tracked({ value: 'Zoey' })).toMatchTypeOf<Function>();
expectTypeOf(tracked({ initializer: () => 'Zoey' })).toMatchTypeOf<Function>();
expectTypeOf(tracked({ equals: (a: number, b: number) => a === b })).toMatchTypeOf<Function>();

// specifying the options gets you a Reactive
expectTypeOf(tracked({ value: 'Zoey' }, {})).toMatchTypeOf<Reactive<Record<string, unknown>>>();
