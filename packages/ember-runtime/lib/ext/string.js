/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.EXTEND_PROTOTYPES
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
    @private
    @deprecated
  */
  StringPrototype.fmt = function (...args) {
    return fmt(this, args);
  };

  /**
    See [Ember.String.w](/api/classes/Ember.String.html#method_w).

    @method w
    @for String
    @private
  */
  StringPrototype.w = function () {
    return w(this);
  };

  /**
    See [Ember.String.loc](/api/classes/Ember.String.html#method_loc).

    @method loc
    @for String
    @private
  */
  StringPrototype.loc = function (...args) {
    return loc(this, args);
  };

  /**
    See [Ember.String.camelize](/api/classes/Ember.String.html#method_camelize).

    @method camelize
    @for String
    @private
  */
  StringPrototype.camelize = function () {
    return camelize(this);
  };

  /**
    See [Ember.String.decamelize](/api/classes/Ember.String.html#method_decamelize).

    @method decamelize
    @for String
    @private
  */
  StringPrototype.decamelize = function () {
    return decamelize(this);
  };

  /**
    See [Ember.String.dasherize](/api/classes/Ember.String.html#method_dasherize).

    @method dasherize
    @for String
    @private
  */
  StringPrototype.dasherize = function () {
    return dasherize(this);
  };

  /**
    See [Ember.String.underscore](/api/classes/Ember.String.html#method_underscore).

    @method underscore
    @for String
    @private
  */
  StringPrototype.underscore = function () {
    return underscore(this);
  };

  /**
    See [Ember.String.classify](/api/classes/Ember.String.html#method_classify).

    @method classify
    @for String
    @private
  */
  StringPrototype.classify = function () {
    return classify(this);
  };

  /**
    See [Ember.String.capitalize](/api/classes/Ember.String.html#method_capitalize).

    @method capitalize
    @for String
    @private
  */
  StringPrototype.capitalize = function () {
    return capitalize(this);
  };
}
