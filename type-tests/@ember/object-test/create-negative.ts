import { expectTypeOf } from 'expect-type';
import { Person } from './create';

// Let's see some *real* type-unsafety! These demonstrate that we just
// absolutely lie about the runtime behavior for `.create()`. 😬 The result of
// calling these with `firstName: 99` is to *change the type* of the resulting
// object from `Person` to `Person` with `firstName: number`. While we might
// *like* to prevent that call and make sure that `firstName` matches the type
// we cannot reasonably do so.

expectTypeOf(Person.create({ firstName: 99 })).toEqualTypeOf<
  Person & {
    firstName: number;
  }
>();
expectTypeOf(Person.create({}, { firstName: 99 })).toEqualTypeOf<
  Person & {
    firstName: number;
  }
>();
expectTypeOf(Person.create({}, {}, { firstName: 99 })).toEqualTypeOf<
  Person & {
    firstName: number;
  }
>();
