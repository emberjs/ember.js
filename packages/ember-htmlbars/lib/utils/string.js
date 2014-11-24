// required so we can extend this object.
import SafeString from "htmlbars-util/safe-string";
import EmberStringUtils from "ember-runtime/system/string";

/**
  Mark a string as safe for unescaped output with Handlebars. If you
  return HTML from a Handlebars helper, use this function to
  ensure Handlebars does not escape the HTML.

  ```javascript
  Ember.String.htmlSafe('<div>someString</div>')
  ```

  @method htmlSafe
  @for Ember.String
  @static
  @return {Handlebars.SafeString} a string that will not be html escaped by Handlebars
*/
function htmlSafe(str) {
  if (typeof str !== 'string') {
    str = ''+str;
  }
  return new SafeString(str);
}

EmberStringUtils.htmlSafe = htmlSafe;
if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    Mark a string as being safe for unescaped output with Handlebars.

    ```javascript
    '<div>someString</div>'.htmlSafe()
    ```

    See [Ember.String.htmlSafe](/api/classes/Ember.String.html#method_htmlSafe).

    @method htmlSafe
    @for String
    @return {Handlebars.SafeString} a string that will not be html escaped by Handlebars
  */
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

export { SafeString, htmlSafe };
