import { htmlSafe, isHTMLSafe, SafeString } from '@ember/template';
import { expectTypeOf } from 'expect-type';

let trusted = htmlSafe('lorem ipsum...');
expectTypeOf(trusted).toEqualTypeOf<SafeString>();
expectTypeOf(trusted).not.toBeString();
expectTypeOf(isHTMLSafe).guards.toEqualTypeOf<SafeString>();
expectTypeOf(trusted.toHTML()).toBeString();
expectTypeOf(trusted.toString()).toBeString();

expectTypeOf<SafeString>().toMatchTypeOf<{
  toString(): string;
  toHTML(): string;
}>();

// @ts-expect-error -- we do not allow construction by exporting only the type.
new SafeString('whatever');
