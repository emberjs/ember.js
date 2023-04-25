import { expectTypeOf } from 'expect-type';
import { Person } from './create';

// Let's see some *real* type-unsafety! These demonstrate that we just
// absolutely lie about the runtime behavior for `.create()`. 😬 The result of
// calling these with `firstName: 99` is to *change the type* of the resulting
// object from `Person` to `Person` with `firstName: string | number`. But our
// types intentionally and explicitly do not support that, while allowing the
// user to pass in arbitrary types.

expectTypeOf(Person.create({ firstName: 99 })).toEqualTypeOf<Person>();
expectTypeOf(Person.create({}, { firstName: 99 })).toEqualTypeOf<Person>();
expectTypeOf(Person.create({}, {}, { firstName: 99 })).toEqualTypeOf<Person>();
