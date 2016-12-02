/**
@module ember
@submodule ember-glimmer
*/

import { deprecate } from 'ember-metal';

export class SafeString {
  constructor(string) {
    this.string = string;
  }

  toString() {
    return `${this.string}`;
  }

  toHTML() {
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
      url: 'http://emberjs.com/deprecations/v2.x#toc_use-ember-string-htmlsafe-over-ember-handlebars-safestring'
    }
  );

  return SafeString;
}

const escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  // jscs:disable
  "'": '&#x27;',
  // jscs:enable
  '`': '&#x60;',
  '=': '&#x3D;'
};

const possible = /[&<>"'`=]/;
const badChars = /[&<>"'`=]/g;

function escapeChar(chr) {
  return escape[chr];
}

export function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
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
  Ember.String.htmlSafe('<div>someString</div>')
  ```

  @method htmlSafe
  @for Ember.String
  @static
  @return {Handlebars.SafeString} A string that will not be HTML escaped by Handlebars.
  @public
*/
export function htmlSafe(str) {
  if (str === null || str === undefined) {
    str = '';
  } else if (typeof str !== 'string') {
    str = '' + str;
  }
  return new SafeString(str);
}

/**
  Detects if a string was decorated using `Ember.String.htmlSafe`.

  ```javascript
  var plainString = 'plain string',
      safeString = Ember.String.htmlSafe('<div>someValue</div>');

  Ember.String.isHTMLSafe(plainString); // false
  Ember.String.isHTMLSafe(safeString);  // true
  ```

  @method isHTMLSafe
  @for Ember.String
  @static
  @return {Boolean} `true` if the string was decorated with `htmlSafe`, `false` otherwise.
  @public
*/
export function isHTMLSafe(str) {
  return str && typeof str.toHTML === 'function';
}
