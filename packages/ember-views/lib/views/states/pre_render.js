/* global Node */

import _default from "ember-views/views/states/default";
import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";
import jQuery from "ember-views/system/jquery";

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

export default preRender;
