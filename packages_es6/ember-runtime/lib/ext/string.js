/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember-metal/core"; // Ember.EXTEND_PROTOTYPES, Ember.assert, Ember.FEATURES
import EmberStringUtils from "ember-runtime/system/string";

var fmt        = EmberStringUtils.fmt,
    w          = EmberStringUtils.w,
    loc        = EmberStringUtils.loc,
    camelize   = EmberStringUtils.capitalize,
    decamelize = EmberStringUtils.decamelize,
    dasherize  = EmberStringUtils.dasherize,
    underscore = EmberStringUtils.underscore,
    capitalize = EmberStringUtils.capitalize,
    classify   = EmberStringUtils.classify;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    See [Ember.String.fmt](/api/classes/Ember.String.html#method_fmt).

    @method fmt
    @for String
  */
  String.prototype.fmt = function() {
    return fmt(this, arguments);
  };

  /**
    See [Ember.String.w](/api/classes/Ember.String.html#method_w).

    @method w
    @for String
  */
  String.prototype.w = function() {
    return w(this);
  };

  /**
    See [Ember.String.loc](/api/classes/Ember.String.html#method_loc).

    @method loc
    @for String
  */
  String.prototype.loc = function() {
    return loc(this, arguments);
  };

  /**
    See [Ember.String.camelize](/api/classes/Ember.String.html#method_camelize).

    @method camelize
    @for String
  */
  String.prototype.camelize = function() {
    return camelize(this);
  };

  /**
    See [Ember.String.decamelize](/api/classes/Ember.String.html#method_decamelize).

    @method decamelize
    @for String
  */
  String.prototype.decamelize = function() {
    return decamelize(this);
  };

  /**
    See [Ember.String.dasherize](/api/classes/Ember.String.html#method_dasherize).

    @method dasherize
    @for String
  */
  String.prototype.dasherize = function() {
    return dasherize(this);
  };

  /**
    See [Ember.String.underscore](/api/classes/Ember.String.html#method_underscore).

    @method underscore
    @for String
  */
  String.prototype.underscore = function() {
    return underscore(this);
  };

  /**
    See [Ember.String.classify](/api/classes/Ember.String.html#method_classify).

    @method classify
    @for String
  */
  String.prototype.classify = function() {
    return classify(this);
  };

  /**
    See [Ember.String.capitalize](/api/classes/Ember.String.html#method_capitalize).

    @method capitalize
    @for String
  */
  String.prototype.capitalize = function() {
    return capitalize(this);
  };
}
