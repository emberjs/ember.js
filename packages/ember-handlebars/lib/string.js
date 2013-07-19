/**
 * Mark a string as safe for raw output with Handlebars. If you
 * return HTML from a Handlebars helper, use this function to
 * ensure Handlebars does not escape the HTML.
 *
 * `Ember.String.htmlSafe('<div>someString</div>')`
 *
 * @method htmlSafe
 * @for Ember.String
 * @static
 * @return {Handlebars.SafeString} a string that will not be html escaped by Handlebars
 */
Ember.String.htmlSafe = function(str) {
  return new Handlebars.SafeString(str);
};

var htmlSafe = Ember.String.htmlSafe;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
   * Use `'<div>someString</div>'.htmlSafe()` to mark a string as being
   * safe for raw output with Handlebars.
   *
   * See `Ember.String.htmlSafe`.
   *
   * @method htmlSafe
   * @for String
   * @return {Handlebars.SafeString} a string that will not be html escaped by Handlebars
   */
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}
