/**
@module ember
@submodule ember-htmlbars
*/

import { ENV } from 'ember-environment';
import EmberStringUtils from 'ember-runtime/system/string';
import { SafeString, escapeExpression } from 'htmlbars-util';
import isEnabled from 'ember-metal/features';

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
function htmlSafe(str) {
  if (str === null || str === undefined) {
    str = '';
  } else if (typeof str !== 'string') {
    str = '' + str;
  }
  return new SafeString(str);
}

EmberStringUtils.htmlSafe = htmlSafe;
if (ENV.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

/**
  Detects if a string was decorated using `Ember.String.htmlSafe`.

  ```javascript
  var plainString = 'plain string',
      safeString = Ember.String.htmlSafe('<div>someValue</div>');

  Ember.String.isHtmlSafe(plainString); // false
  Ember.String.isHtmlSafe(safeString);  // true
  ```

  @method isHtmlSafe
  @for Ember.String
  @static
  @return {Boolean} `true` if the string was decorated with `htmlSafe`, `false` otherwise.
  @public
*/
function isHtmlSafe(str) {
  return str && typeof str.toHTML === 'function';
}

if (isEnabled('ember-string-ishtmlsafe')) {
  EmberStringUtils.isHtmlSafe = isHtmlSafe;
}

export {
  SafeString,
  htmlSafe,
  isHtmlSafe,
  escapeExpression
};
