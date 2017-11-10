/**
@module @ember/template
*/

import { deprecate } from 'ember-debug';

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

export function getSafeString() {
  deprecate(
    'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe',
    false,
    {
      id: 'ember-htmlbars.ember-handlebars-safestring',
      until: '3.0.0',
      url: 'https://emberjs.com/deprecations/v2.x#toc_use-ember-string-htmlsafe-over-ember-handlebars-safestring',
    },
  );

  return SafeString;
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

export function escapeExpression(string: any): string {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string === null || string === undefined) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) { return string; }
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
  @return {Handlebars.SafeString} A string that will not be HTML escaped by Handlebars.
  @public
*/
export function htmlSafe(str: string) {
  if (str === null || str === undefined) {
    str = '';
  } else if (typeof str !== 'string') {
    str = '' + str;
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
export function isHTMLSafe(str: string | SafeString): str is SafeString {
  return str !== null && typeof str === 'object' && typeof str.toHTML === 'function';
}
