require('ember-runtime/core');
require('ember-runtime/system/string');

/**
@module ember
@submodule ember-runtime
*/



var fmt = Ember.String.fmt,
    w   = Ember.String.w,
    loc = Ember.String.loc,
    camelize = Ember.String.camelize,
    decamelize = Ember.String.decamelize,
    dasherize = Ember.String.dasherize,
    underscore = Ember.String.underscore,
    classify = Ember.String.classify;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    See {{#crossLink "Ember.String/fmt"}}{{/crossLink}}

    @method fmt
    @for String
  */
  String.prototype.fmt = function() {
    return fmt(this, arguments);
  };

  /**
    See {{#crossLink "Ember.String/w"}}{{/crossLink}}

    @method w
    @for String
  */
  String.prototype.w = function() {
    return w(this);
  };

  /**
    See {{#crossLink "Ember.String/loc"}}{{/crossLink}}

    @method loc
    @for String
  */
  String.prototype.loc = function() {
    return loc(this, arguments);
  };

  /**
    See {{#crossLink "Ember.String/camelize"}}{{/crossLink}}

    @method camelize
    @for String
  */
  String.prototype.camelize = function() {
    return camelize(this);
  };

  /**
    See {{#crossLink "Ember.String/decamelize"}}{{/crossLink}}

    @method decamelize
    @for String
  */
  String.prototype.decamelize = function() {
    return decamelize(this);
  };

  /**
    See {{#crossLink "Ember.String/dasherize"}}{{/crossLink}}

    @method dasherize
    @for String
  */
  String.prototype.dasherize = function() {
    return dasherize(this);
  };

  /**
    See {{#crossLink "Ember.String/underscore"}}{{/crossLink}}

    @method underscore
    @for String
  */
  String.prototype.underscore = function() {
    return underscore(this);
  };

  /**
    See {{#crossLink "Ember.String/classify"}}{{/crossLink}}

    @method classify
    @for String
  */
  String.prototype.classify = function() {
    return classify(this);
  };
}

