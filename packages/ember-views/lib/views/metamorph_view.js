/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.deprecate

import View from "ember-views/views/view";
import { Mixin } from "ember-metal/mixin";

/**
@module ember
@submodule ember-views
*/

// The `morph` and `outerHTML` properties are internal only
// and not observable.

/**
  @class _Metamorph
  @namespace Ember
  @private
*/
export var _Metamorph = Mixin.create({
  isVirtual: true,
  tagName: '',

  instrumentName: 'metamorph',

  init: function() {
    this._super.apply(this, arguments);
    Ember.deprecate(
      'Supplying a tagName to Metamorph views is unreliable and is deprecated.' +
      ' You may be setting the tagName on a Handlebars helper that creates a Metamorph.',
      !this.tagName
    );
  }
});

/**
  @class _MetamorphView
  @namespace Ember
  @extends Ember.View
  @uses Ember._Metamorph
  @private
*/
export default View.extend(_Metamorph);
