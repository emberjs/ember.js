/**
@module @ember/template
*/

import type { SafeString as GlimmerSafeString } from '@glimmer/runtime';

/**
  A wrapper around a string that has been marked as safe ("trusted"). **When
  rendered in HTML, Ember will not perform any escaping.**

  Note:

  1. This does not *make* the string safe; it means that some code in your
     application has *marked* it as safe using the `htmlSafe()` function.

  2. The only public API for getting a `SafeString` is calling `htmlSafe()`. It
     is *not* user-constructible.

  If a string contains user inputs or other untrusted data, you must sanitize
  the string before using the `htmlSafe` method. Otherwise your code is
  vulnerable to [Cross-Site Scripting][xss]. There are many open source
  sanitization libraries to choose from, both for front end and server-side
  sanitization.

  [xss]: https://owasp.org/www-community/attacks/DOM_Based_XSS

  ```javascript
  import { htmlSafe } from '@ember/template';

  let someTrustedOrSanitizedString = "<div>Hello!</div>"

  htmlSafe(someTrustedorSanitizedString);
  ```

  @for @ember/template
  @class SafeString
  @since 4.12.0
  @public
 */
export class SafeString implements GlimmerSafeString {
  private __string: string;

  constructor(string: string) {
    this.__string = string;
  }

  /**
    Get the string back to use as a string.

    @public
    @method toString
    @returns {String} The string marked as trusted
   */
  toString(): string {
    return `${this.__string}`;
  }

  /**
    Get the wrapped string as HTML to use without escaping.

    @public
    @method toHTML
    @returns {String} the trusted string, without any escaping applied
   */
  toHTML(): string {
    return this.toString();
  }
}

const escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const possible = /[&<>"'`=]/;
const badChars = /[&<>"'`=]/g;

function escapeChar(chr: keyof typeof escape) {
  return escape[chr];
}

export function escapeExpression(string: unknown): string {
  let s: string;
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (isHTMLSafe(string)) {
      return string.toHTML();
    } else if (string === null || string === undefined) {
      return '';
    } else if (!string) {
      return String(string);
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    s = String(string);
  } else {
    s = string;
  }

  if (!possible.test(s)) {
    return s;
  }

  // SAFETY: this is technically a lie, but it's a true lie as long as the
  // invariant it depends on is upheld: `escapeChar` will always return a string
  // as long as its input is one of the characters in `escape`, and it will only
  // be called if it matches one of the characters in the `badChar` regex, which
  // is hand-maintained to match the set escaped. (It would be nice if TS could
  // "see" into the regex to see how this works, but that'd be quite a lot of
  // extra fanciness.)
  return s.replace(badChars, escapeChar as (s: string) => string);
}

/**
  Use this method to indicate that a string should be rendered as HTML
  when the string is used in a template. To say this another way,
  strings marked with `htmlSafe` will not be HTML escaped.

  A word of warning -   The `htmlSafe` method does not make the string safe;
  it only tells the framework to treat the string as if it is safe to render
  as HTML. If a string contains user inputs or other untrusted
  data, you must sanitize the string before using the `htmlSafe` method.
  Otherwise your code is vulnerable to
  [Cross-Site Scripting](https://owasp.org/www-community/attacks/DOM_Based_XSS).
  There are many open source sanitization libraries to choose from,
  both for front end and server-side sanitization.

  ```javascript
  import { htmlSafe } from '@ember/template';

  const someTrustedOrSanitizedString = "<div>Hello!</div>"

  htmlSafe(someTrustedorSanitizedString)
  ```

  @method htmlSafe
  @for @ember/template
  @param str {String} The string to treat as trusted.
  @static
  @return {SafeString} A string that will not be HTML escaped by Handlebars.
  @public
*/
export function htmlSafe(str: string): SafeString {
  if (str === null || str === undefined) {
    str = '';
  } else if (typeof str !== 'string') {
    str = String(str);
  }
  return new SafeString(str);
}

/**
  Detects if a string was decorated using `htmlSafe`.

  ```javascript
  import { htmlSafe, isHTMLSafe } from '@ember/template';

  let plainString = 'plain string';
  let safeString = htmlSafe('<div>someValue</div>');

  isHTMLSafe(plainString); // false
  isHTMLSafe(safeString);  // true
  ```

  @method isHTMLSafe
  @for @ember/template
  @static
  @return {Boolean} `true` if the string was decorated with `htmlSafe`, `false` otherwise.
  @public
*/
export function isHTMLSafe(str: unknown): str is SafeString {
  return (
    str !== null && typeof str === 'object' && 'toHTML' in str && typeof str.toHTML === 'function'
  );
}
