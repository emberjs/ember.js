
Ember.String.htmlSafe = function(str) {
  return new Handlebars.SafeString(str);
};

var htmlSafe = Ember.String.htmlSafe;

if (Ember.EXTEND_PROTOTYPES) {

  /**
    @see Ember.String.htmlSafe
  */
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };

}
