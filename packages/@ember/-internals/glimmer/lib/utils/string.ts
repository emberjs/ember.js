/**
@module @ember/template
*/

export class SafeString {
  public string: string;

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

/**
  Escapes the passed string, making it safe for use in templates.
  
  Replaces &, <, >, ", ', `, = in the string with the HTML-entity equivalents.
  SafeString values created with `htmlSafe` are left untouched.

  ```javascript
  import { escapeExpression } from '@ember/template';

  escapeExpression('<div>someString</div>')
  ```

  @method escapeExpression
  @for @ember/template
  @static
  @return {String} An escaped string, safe for use in templates.
  @public
*/
export function escapeExpression(string: any): string {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string === null || string === undefined) {
      return '';
    } else if (!string) {
      return String(string);
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = String(string);
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

/**
  Mark a string as safe for unescaped output with Ember templates. If you
  return HTML from a helper, use this function to
  ensure Ember's rendering layer does not escape the HTML.

  ```javascript
  import { htmlSafe } from '@ember/template';

  htmlSafe('<div>someString</div>')
  ```

  @method htmlSafe
  @for @ember/template
  @static
  @return {SafeString} A string that will not be HTML escaped by Handlebars.
  @public
*/
export function htmlSafe(str: string) {
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
export function isHTMLSafe(str: any | null | undefined): str is SafeString {
  return str !== null && typeof str === 'object' && typeof str.toHTML === 'function';
}
