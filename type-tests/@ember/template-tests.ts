import {
  htmlSafe,
  isHTMLSafe,
  isTrustedString,
  unsafelyTrustString,
  type TrustedString,
} from '@ember/template';
import { expectTypeOf } from 'expect-type';

expectTypeOf(unsafelyTrustString('lorem ipsum...')).toEqualTypeOf<TrustedString>();
expectTypeOf(isTrustedString).guards.toEqualTypeOf<TrustedString>();

expectTypeOf(unsafelyTrustString('lorem ipsum...')).not.toBeString();

expectTypeOf(htmlSafe).toEqualTypeOf(unsafelyTrustString);
expectTypeOf(isHTMLSafe).toEqualTypeOf(isTrustedString);

function isSafeTest(s: string | TrustedString) {
  if (isTrustedString(s)) {
    s = s.toHTML();
  }

  s.toLowerCase();
}
