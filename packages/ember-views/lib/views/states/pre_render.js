/* global Node */

import _default from "ember-views/views/states/default";
import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";

/**
@module ember
@submodule ember-views
*/
var preRender = create(_default);

var containsElement;
if (typeof Node === 'object') {
  containsElement = Node.prototype.contains;

  if (!containsElement && Node.prototype.compareDocumentPosition) {
    // polyfill for older Firefox.
    // http://compatibility.shwups-cms.ch/en/polyfills/?&id=52
    containsElement = function(node){
      return !!(this.compareDocumentPosition(node) & 16);
    };
  }
} else {
  containsElement = function(element) {
    return this.contains(element);
  };
}

merge(preRender, {
  empty: Ember.K,

  setElement: function(view, value) {
    if (value !== null) {
      view._transitionTo('hasElement');
    }
    return value;
  }
});

export default preRender;
