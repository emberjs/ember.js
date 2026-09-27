import { cached, tracked } from '@glimmer/tracking';
import { expectTypeOf } from 'expect-type';

class Counter {
  @tracked count = 0;
  @tracked accessor accessorCount = 0;
  @tracked({ equals: (a: number, b: number) => a === b }) withOptions = 0;
  @tracked({ description: 'accessor with options' }) accessor accessorWithOptions = 0;

  @cached
  get doubled() {
    return this.count * 2;
  }
}

let counter = new Counter();
expectTypeOf(counter.count).toEqualTypeOf<number>();
expectTypeOf(counter.accessorCount).toEqualTypeOf<number>();
expectTypeOf(counter.withOptions).toEqualTypeOf<number>();
expectTypeOf(counter.accessorWithOptions).toEqualTypeOf<number>();
expectTypeOf(counter.doubled).toEqualTypeOf<number>();

// The standalone form is unaffected by the decorator overloads.
expectTypeOf(tracked(0).value).toEqualTypeOf<number>();

class Invalid {
  // @ts-expect-error -- @tracked is not valid on methods
  @tracked method() {}

  // @ts-expect-error -- @cached is only valid on getters
  @cached field = 1;
}
new Invalid();
