/* global Metamorph:true */

/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.deprecate
// var emberDeprecate = Ember.deprecate;

import { get } from "ember-metal/property_get";
import set from "ember-metal/property_set";

import CoreView from "ember-views/views/core_view";
import View from "ember-views/views/view";
import { Mixin } from "ember-metal/mixin";
import run from "ember-metal/run_loop";

/**
@module ember
@submodule ember-handlebars
*/

var Metamorph = requireModule('metamorph');

function notifyMutationListeners() {
  run.once(View, 'notifyMutationListeners');
}

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
    this._super();
    if (this.tagName) {
      Ember.deprecate('Supplying a tagName to Metamorph views is unreliable and is deprecated. You may be setting the tagName on a Handlebars helper that creates a Metamorph.');
      this.isVirtual = false;
    }
  }
});

export var _wrapMap = Metamorph._wrapMap;

/**
  @class _MetamorphView
  @namespace Ember
  @extends Ember.View
  @uses Ember._Metamorph
  @private
*/
export var _MetamorphView = View.extend(_Metamorph);

/**
  @class _SimpleMetamorphView
  @namespace Ember
  @extends Ember.CoreView
  @uses Ember._Metamorph
  @private
*/
export var _SimpleMetamorphView = CoreView.extend(_Metamorph);
export default View.extend(_Metamorph);
