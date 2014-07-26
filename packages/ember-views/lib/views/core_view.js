import Rerender from "ember-views/system/renderer";

import {
  cloneStates,
  states
} from "ember-views/views/states";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";

import { deprecateProperty } from "ember-metal/properties";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";

import { typeOf } from "ember-metal/utils";

import { instrument } from "ember-metal/instrumentation";

/**
  `Ember.CoreView` is an abstract class that exists to give view-like behavior
  to both Ember's main view class `Ember.View` and other classes like
  `Ember._SimpleMetamorphView` that don't need the fully functionaltiy of
  `Ember.View`.

  Unless you have specific needs for `CoreView`, you will use `Ember.View`
  in your applications.

  @class CoreView
  @namespace Ember
  @extends Ember.Object
  @uses Ember.Evented
  @uses Ember.ActionHandler
*/
var CoreView = EmberObject.extend(Evented, ActionHandler, {
  isView: true,
  isVirtual: false,
  isContainer: false,

  _states: cloneStates(states),

  init: function() {
    this._super();
    this._transitionTo('preRender');
    this._isVisible = get(this, 'isVisible');

    deprecateProperty(this, 'states', '_states');
    deprecateProperty(this, 'state', '_state');
  },

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
  */
  parentView: computed('_parentView', function() {
    var parent = this._parentView;

    if (parent && parent.isVirtual) {
      return get(parent, 'parentView');
    } else {
      return parent;
    }
  }),

  _state: null,

  _parentView: null,

  // return the current view, not including virtual views
  concreteView: computed('parentView', function() {
    if (!this.isVirtual) { return this; }
    else { return get(this, 'parentView.concreteView'); }
  }),

  instrumentName: 'core_view',

  instrumentDetails: function(hash) {
    hash.object = this.toString();
    hash.containerKey = this._debugContainerKey;
    hash.view = this;
  },

  /**
    Invoked by the view system when this view needs to produce an HTML
    representation. This method will create a new render buffer, if needed,
    then apply any default attributes, such as class names and visibility.
    Finally, the `render()` method is invoked, which is responsible for
    doing the bulk of the rendering.

    You should not need to override this method; instead, implement the
    `template` property, or if you need more control, override the `render`
    method.

    @method renderToBuffer
    @param {Ember.RenderBuffer} buffer the render buffer. If no buffer is
      passed, a default buffer, using the current view's `tagName`, will
      be used.
    @private
  */
  renderToBuffer: function() {
    // TODO bring back instrumentation
    return this._renderToBuffer();
  },

  _renderToBuffer: function() {
    this.constructor.renderer.renderTree(this);
    return this.buffer;
  },

  /**
    Override the default event firing from `Ember.Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger: function() {
    this._super.apply(this, arguments);
    var name = arguments[0];
    var method = this[name];
    if (method) {
      var length = arguments.length;
      var args = new Array(length - 1);
      for (var i = 1; i < length; i++) {
        args[i - 1] = arguments[i];
      }
      return method.apply(this, args);
    }
  },

  has: function(name) {
    return typeOf(this[name]) === 'function' || this._super(name);
  },

  destroy: function() {
    var parent = this._parentView;

    if (!this._super()) { return; }


    // destroy the element -- this will avoid each child view destroying
    // the element over and over again...
    if (!this.removedFromDOM && this._renderer) {
      this._renderer.remove(this, true);
    }

    // remove from parent if found. Don't call removeFromParent,
    // as removeFromParent will try to remove the element from
    // the DOM again.
    if (parent) { parent.removeChild(this); }

    this._transitionTo('destroying', false);

    return this;
  },

  clearRenderedChildren: Ember.K,
  triggerRecursively: Ember.K,
  invokeRecursively: Ember.K,
  _transitionTo: Ember.K,
  destroyElement: Ember.K
});

CoreView.reopenClass({
  renderer: new Rerender()
});

export default CoreView;
