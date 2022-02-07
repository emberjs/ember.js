import { SafeString } from '@ember/-internals/glimmer';
import { htmlSafe, isHTMLSafe } from '@ember/template';
import { expectTypeOf } from 'expect-type';

let safe = htmlSafe('<div>someString</div>');
expectTypeOf(safe).toEqualTypeOf<SafeString>();

expectTypeOf(isHTMLSafe(safe)).toEqualTypeOf<boolean>();

isHTMLSafe('unsafe');
isHTMLSafe(1);
isHTMLSafe(null);
isHTMLSafe(undefined);
