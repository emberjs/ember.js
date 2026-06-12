import { tracked } from '@glimmer/tracking';
import { expectTypeOf } from 'expect-type';

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
