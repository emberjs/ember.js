/**
@module @ember/template
*/

export class SafeString {
  private readonly string: string;

  constructor(string: string) {
    this.string = string;
  }

  toString(): string {
    return `${this.string}`;
  }

  toHTML(): string {
    return this.toString();
  }
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

  var plainString = 'plain string',
      safeString = htmlSafe('<div>someValue</div>');

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
    // SAFETY: cast `as SafeString` only present to make this check "legal"; we
    // can further improve this by changing the behavior to do an `in` check
    // instead, but that's worth landing as a separate change for bisecting if
    // it happens to have an impact on e.g. perf.
    str !== null && typeof str === 'object' && typeof (str as SafeString).toHTML === 'function'
  );
}
