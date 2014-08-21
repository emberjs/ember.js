/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.EXTEND_PROTOTYPES, Ember.assert, Ember.FEATURES
import {
  fmt,
  w,
  loc,
  camelize,
  decamelize,
  dasherize,
  underscore,
  capitalize,
  classify
} from 'ember-runtime/system/string';

var StringPrototype = String.prototype;

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    See [Ember.String.fmt](/api/classes/Ember.String.html#method_fmt).

    @method fmt
    @for String
  */
  StringPrototype.fmt = function () {
    return fmt(this, arguments);
  };

  /**
    See [Ember.String.w](/api/classes/Ember.String.html#method_w).

    @method w
    @for String
  */
  StringPrototype.w = function () {
    return w(this);
  };

  /**
    See [Ember.String.loc](/api/classes/Ember.String.html#method_loc).

    @method loc
    @for String
  */
  StringPrototype.loc = function () {
    return loc(this, arguments);
  };

  /**
    See [Ember.String.camelize](/api/classes/Ember.String.html#method_camelize).

    @method camelize
    @for String
  */
  StringPrototype.camelize = function () {
    return camelize(this);
  };

  /**
    See [Ember.String.decamelize](/api/classes/Ember.String.html#method_decamelize).

    @method decamelize
    @for String
  */
  StringPrototype.decamelize = function () {
    return decamelize(this);
  };

  /**
    See [Ember.String.dasherize](/api/classes/Ember.String.html#method_dasherize).

    @method dasherize
    @for String
  */
  StringPrototype.dasherize = function () {
    return dasherize(this);
  };

  /**
    See [Ember.String.underscore](/api/classes/Ember.String.html#method_underscore).

    @method underscore
    @for String
  */
  StringPrototype.underscore = function () {
    return underscore(this);
  };

  /**
    See [Ember.String.classify](/api/classes/Ember.String.html#method_classify).

    @method classify
    @for String
  */
  StringPrototype.classify = function () {
    return classify(this);
  };

  /**
    See [Ember.String.capitalize](/api/classes/Ember.String.html#method_capitalize).

    @method capitalize
    @for String
  */
  StringPrototype.capitalize = function () {
    return capitalize(this);
  };
}
