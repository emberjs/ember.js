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
    See {{#crossLink "Ember.String/htmlSafe"}}{{/crossLink}}

    @method htmlSafe
    @for String
  */
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}
