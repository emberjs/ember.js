import { SafeString } from '@ember/template/-private/handlebars';
import { htmlSafe, isHTMLSafe } from '@ember/template';
import { expectTypeOf } from 'expect-type';

const handlebarsSafeString: SafeString = htmlSafe('lorem ipsum...');
expectTypeOf(htmlSafe('lorem ipsum...')).toEqualTypeOf<SafeString>();
// @ts-expect-error
const regularString: string = htmlSafe('lorem ipsum...');

expectTypeOf(isHTMLSafe).guards.toEqualTypeOf<SafeString>();

function isSafeTest(a: string | SafeString) {
  if (isHTMLSafe(a)) {
    a = a.toString();
  }

  a.toLowerCase();
}
