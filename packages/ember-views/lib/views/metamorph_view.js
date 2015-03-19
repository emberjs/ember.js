/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.deprecate

import View from "ember-views/views/view";
import { Mixin } from "ember-metal/mixin";

/**
@module ember
@submodule ember-views
*/

export var _Metamorph = Mixin.create({
  isVirtual: true,
  tagName: '',

  instrumentName: 'metamorph',

  init() {
    this._super.apply(this, arguments);
    Ember.deprecate('Supplying a tagName to Metamorph views is unreliable and is deprecated.' +
                    ' You may be setting the tagName on a Handlebars helper that creates a Metamorph.', !this.tagName);
  }
});

export default View.extend(_Metamorph);
