/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import EmberStringUtils from 'ember-runtime/system/string';
import { SafeString, escapeExpression } from 'htmlbars-util';

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
  @return {Handlebars.SafeString} a string that will not be html escaped by Handlebars
  @public
*/
function htmlSafe(str) {
  if (str === null || str === undefined) {
    return '';
  }

  if (typeof str !== 'string') {
    str = '' + str;
  }
  return new SafeString(str);
}

EmberStringUtils.htmlSafe = htmlSafe;
if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

export {
  SafeString,
  htmlSafe,
  escapeExpression
};
