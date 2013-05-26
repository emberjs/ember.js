/**
  @method htmlSafe
  @for Ember.String
  @static
*/
Ember.String.htmlSafe = function(str) {
  return new Handlebars.SafeString(str);
};

var htmlSafe = Ember.String.htmlSafe;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    See `Ember.String.htmlSafe`.

    @method htmlSafe
    @for String
  */
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}
