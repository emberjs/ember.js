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
    capitalize = Ember.String.capitalize,
    classify = Ember.String.classify;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    See `Ember.String.fmt`.

    @method fmt
    @for String
  */
  String.prototype.fmt = function() {
    return fmt(this, arguments);
  };

  /**
    See `Ember.String.w`.

    @method w
    @for String
  */
  String.prototype.w = function() {
    return w(this);
  };

  /**
    See `Ember.String.loc`.

    @method loc
    @for String
  */
  String.prototype.loc = function() {
    return loc(this, arguments);
  };

  /**
    See `Ember.String.camelize`.

    @method camelize
    @for String
  */
  String.prototype.camelize = function() {
    return camelize(this);
  };

  /**
    See `Ember.String.decamelize`.

    @method decamelize
    @for String
  */
  String.prototype.decamelize = function() {
    return decamelize(this);
  };

  /**
    See `Ember.String.dasherize`.

    @method dasherize
    @for String
  */
  String.prototype.dasherize = function() {
    return dasherize(this);
  };

  /**
    See `Ember.String.underscore`.

    @method underscore
    @for String
  */
  String.prototype.underscore = function() {
    return underscore(this);
  };

  /**
    See `Ember.String.classify`.

    @method classify
    @for String
  */
  String.prototype.classify = function() {
    return classify(this);
  };

  /**
    See `Ember.String.capitalize`.

    @method capitalize
    @for String
  */
  String.prototype.capitalize = function() {
    return capitalize(this);
  };

}

