import Ember from "ember-metal/core"; // Ember.assert
import create from 'ember-metal/platform/create';
import merge from "ember-metal/merge";
import EmberError from "ember-metal/error";
import { addBeforeObserver } from 'ember-metal/observer';

import hasElement from "ember-views/views/states/has_element";
/**
@module ember
@submodule ember-views
*/

var inDOM = create(hasElement);

var View;

merge(inDOM, {
  enter: function(view) {
    if (!View) { View = requireModule('ember-views/views/view')["default"]; } // ES6TODO: this sucks. Have to avoid cycles...

    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    if (!view.isVirtual) {
      Ember.assert("Attempted to register a view with an id already in use: "+view.elementId, !view._viewRegistry[view.elementId]);
      view._register();
    }

    Ember.runInDebug(function() {
      addBeforeObserver(view, 'elementId', function() {
        throw new EmberError("Changing a view's elementId after creation is not allowed");
      });
    });
  },

  exit: function(view) {
    if (!View) { View = requireModule('ember-views/views/view')["default"]; } // ES6TODO: this sucks. Have to avoid cycles...

    if (!this.isVirtual) {
      view._unregister();
    }
  },

  appendAttr: function(view, attrNode) {
    var _childViews = view._childViews;

    if (!_childViews.length) { _childViews = view._childViews = _childViews.slice(); }
    _childViews.push(attrNode);

    attrNode._parentView = view;
    view.renderer.appendAttrTo(attrNode, view.element, attrNode.attrName);

    view.propertyDidChange('childViews');

    return attrNode;
  }

});

export default inDOM;
