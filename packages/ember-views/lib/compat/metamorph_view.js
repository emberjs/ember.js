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
  tagName: '',
  __metamorphType: 'Ember._Metamorph',

  instrumentName: 'metamorph',

  init() {
    this._super.apply(this, arguments);
    Ember.deprecate('Supplying a tagName to Metamorph views is unreliable and is deprecated.' +
                    ' You may be setting the tagName on a Handlebars helper that creates a Metamorph.', !this.tagName);

    Ember.deprecate(`Using ${this.__metamorphType} is deprecated.`);
  }
});

/**
 @class _MetamorphView
 @namespace Ember
 @extends Ember.View
 @uses Ember._Metamorph
 @private
*/
export default View.extend(_Metamorph, {
  __metamorphType: 'Ember._MetamorphView'
});
