import { Input, Textarea } from '@ember/component';
import { expectTypeOf } from 'expect-type';

// Minimal check that we are exporting both type and value
expectTypeOf(Input).toEqualTypeOf<Input>();
expectTypeOf(Textarea).toEqualTypeOf<Textarea>();
