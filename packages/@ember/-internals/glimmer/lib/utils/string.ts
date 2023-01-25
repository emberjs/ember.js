/**
@module @ember/template
*/

import type { SafeString } from '@glimmer/runtime';
import { deprecate } from '@ember/debug';

class _TrustedString implements SafeString {
  constructor(private readonly string: string) {}

  private toString(): string {
    return `${this.string}`;
  }

  toHTML(): string {
    return this.toString();
  }
}

// TODO: before merging this, find a good home for type-only imports (presumably
// as part of landing stable types).

// A way of representing non-user-constructible types. You can conveniently use
// this by doing `interface Type extends Data<'some-type-name'> { ... }` for
// simple types, and/or you can type-parameterize it as makes sense for your use
// case (see e.g. `@ember/component/helper`'s use with functional helpers).
declare const Data: unique symbol;
declare class Opaque<Data> {
  private [Data]: Data;
}

export interface TrustedString extends _TrustedString, Opaque<'@ember/template:TrustedString'> {}

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
  @static
  @return {TrustedString} A string that will not be HTML escaped by Handlebars.
  @public
  @deprecated
*/
export function htmlSafe(str: string): TrustedString {
  deprecate(
    'As of Ember 4.12, the `htmlSafe()` function is deprecated in favor of `unsafelyTrustString`. ' +
      'The two have identical behavior, but `unsafelyTrustString` is clearer about what it does.',
    true, // TODO: flip it (better yet: automatically flip it!)
    {
      id: 'remove-html-safe',
      for: 'ember-source',
      url: 'TODO',
      until: '6.0.0',
      since: {
        available: '4.12.0',
        enabled: '5.0.0',
      },
    }
  );

  return unsafelyTrustString(str);
}

/**
  Use this method to indicate that a string should be rendered as HTML when the
  string is used in a template. To say this another way, strings marked with
  `unsafelyTrustString` will not be HTML escaped.

  A word of warning -   The `unsafelyTrustString` method does not make the
  string safe; it only tells the framework to treat the string as if it is safe
  to render as HTML. If a string contains user inputs or other untrusted data,
  you must sanitize the string before using the `unsafelyTrustString` method.
  Otherwise your code is vulnerable to [Cross-Site Scripting][XSS]. There are
  many open source sanitization libraries to choose from, both for front end and
  server-side sanitization.

  [XSS]: https://owasp.org/www-community/attacks/DOM_Based_XSS

  ```javascript
  import { unsafelyTrustString } from '@ember/template';

  const someTrustedOrSanitizedString = "<div>Hello!</div>"

  unsafelyTrustString(someTrustedorSanitizedString)
  ```

  @method unsafelyTrustString
  @for @ember/template
  @static
  @return {TrustedString} A string that will not be HTML escaped by Handlebars.
  @public
*/
export function unsafelyTrustString(str: string): TrustedString {
  let string = str === null || str === undefined ? '' : String(str);
  return new _TrustedString(string) as TrustedString;
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
  @deprecated use `isTrustedString` instead
*/
export function isHTMLSafe(str: unknown): str is TrustedString {
  deprecate(
    'As of Ember 4.12, the `isHTMLSafe()` function is deprecated in favor of `isTrustedString`. ' +
      'The two have the same basic behavior, but `isTrustedString` is clearer about what it does.',
    true, // TODO: flip it (better yet: automatically flip it!)
    {
      id: 'remove-html-safe',
      for: 'ember-source',
      url: 'TODO',
      until: '6.0.0',
      since: {
        available: '4.12.0',
        enabled: '5.0.0',
      },
    }
  );

  return (
    str !== null &&
    typeof str === 'object' &&
    typeof (str as TrustedString)['toHTML'] === 'function'
  );
}

/**
  Detects if a string was explicitly trusted using `unsafelyTrustString`.

  ```javascript
  import { unsafelyTrustString, isTrustedString } from '@ember/template';

  let plainString = 'plain string';
  let safeString = unsafelyTrustString('<div>someValue</div>');

  isTrustedString(plainString); // false
  isTrustedString(safeString);  // true
  ```

  @method isTrustedString
  @for @ember/template
  @static
  @return {Boolean} `true` if the string was decorated with `htmlSafe`, `false` otherwise.
  @public
*/
export function isTrustedString(str: unknown): str is TrustedString {
  return str instanceof _TrustedString;
}
