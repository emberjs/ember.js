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

// DOMManager should just abstract dom manipulation between jquery and metamorph
var DOMManager = {
  remove: function(view) {
    view.morph.remove();
    notifyMutationListeners();
  },

  prepend: function(view, html) {
    view.morph.prepend(html);
    notifyMutationListeners();
  },

  after: function(view, html) {
    view.morph.after(html);
    notifyMutationListeners();
  },

  html: function(view, html) {
    view.morph.html(html);
    notifyMutationListeners();
  },

  // This is messed up.
  replace: function(view) {
    var morph = view.morph;

    view.transitionTo('preRender');

    run.schedule('render', this, function renderMetamorphView() {
      if (view.isDestroying) { return; }

      view.clearRenderedChildren();
      var buffer = view.renderToBuffer();

      view.invokeRecursively(function(view) {
        view.propertyWillChange('element');
      });
      view.triggerRecursively('willInsertElement');

      morph.replaceWith(buffer.string());
      view.transitionTo('inDOM');

      view.invokeRecursively(function(view) {
        view.propertyDidChange('element');
      });
      view.triggerRecursively('didInsertElement');

      notifyMutationListeners();
    });
  },

  empty: function(view) {
    view.morph.html("");
    notifyMutationListeners();
  }
};

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
    this.morph = Metamorph();
    Ember.deprecate('Supplying a tagName to Metamorph views is unreliable and is deprecated. You may be setting the tagName on a Handlebars helper that creates a Metamorph.', !this.tagName);
  },

  beforeRender: function(buffer) {
    buffer.push(this.morph.startTag());
    buffer.pushOpeningTag();
  },

  afterRender: function(buffer) {
    buffer.pushClosingTag();
    buffer.push(this.morph.endTag());
  },

  createElement: function() {
    var buffer = this.renderToBuffer();
    this.outerHTML = buffer.string();
    this.clearBuffer();
  },

  domManager: DOMManager
});

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
