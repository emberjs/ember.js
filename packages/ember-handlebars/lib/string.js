/**
  @method htmlSafe
  @for Ember.String
  @static
*/
Ember.String.htmlSafe = function(str) {
  return new Handlebars.SafeString(str);
};

var htmlSafe = Ember.String.htmlSafe;

if (Ember.EXTEND_PROTOTYPES && (Ember.PROTOTYPE_EXTENSIONS.all || Ember.PROTOTYPE_EXTENSIONS.String)) {

  /**
    See {{#crossLink "Ember.String/htmlSafe"}}{{/crossLink}}

    @method htmlSafe
    @for String
  */
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };

}
