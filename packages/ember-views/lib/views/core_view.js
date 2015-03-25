import Renderer from "ember-views/system/renderer";
import environment from "ember-metal/environment";
import DOMHelper from "dom-helper";

import {
  cloneStates,
  states
} from "ember-views/views/states";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";

import { get } from "ember-metal/property_get";
import { computed } from "ember-metal/computed";

import { typeOf } from "ember-metal/utils";

function K() { return this; }

// Normally, the renderer is injected by the container when the view is looked
// up. However, if someone creates a view without looking it up via the
// container (e.g. `Ember.View.create().append()`) then we create a fallback
// DOM renderer that is shared. In general, this path should be avoided since
// views created this way cannot run in a node environment.
var renderer;

/**
  `Ember.CoreView` is an abstract class that exists to give view-like behavior
  to both Ember's main view class `Ember.View` and other classes that don't need
  the fully functionaltiy of `Ember.View`.

  Unless you have specific needs for `CoreView`, you will use `Ember.View`
  in your applications.

  @class CoreView
  @namespace Ember
  @extends Ember.Object
  @deprecated Use `Ember.View` instead.
  @uses Ember.Evented
  @uses Ember.ActionHandler
*/
var CoreView = EmberObject.extend(Evented, ActionHandler, {
  isView: true,
  isVirtual: false,

  _states: cloneStates(states),

  init() {
    this._super.apply(this, arguments);
    this._state = 'preRender';
    this.currentState = this._states.preRender;
    this._isVisible = get(this, 'isVisible');

    // Fallback for legacy cases where the view was created directly
    // via `create()` instead of going through the container.
    if (!this.renderer) {
      renderer = renderer || environment.hasDOM ? new Renderer(new DOMHelper()) : null;
      this.renderer = renderer;
    }
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
    if (!this.isVirtual) {
      return this;
    } else {
      return get(this, 'parentView.concreteView');
    }
  }),

  instrumentName: 'core_view',

  instrumentDetails(hash) {
    hash.object = this.toString();
    hash.containerKey = this._debugContainerKey;
    hash.view = this;
  },

  /**
    Override the default event firing from `Ember.Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger() {
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

  has(name) {
    return typeOf(this[name]) === 'function' || this._super(name);
  },

  destroy() {
    var parent = this._parentView;

    if (!this._super(...arguments)) { return; }


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

  clearRenderedChildren: K,
  _transitionTo: K,
  destroyElement: K
});

CoreView.reopenClass({
  isViewClass: true
});

export var DeprecatedCoreView = CoreView.extend({
  init() {
    Ember.deprecate('Ember.CoreView is deprecated. Please use Ember.View.', false);
    this._super.apply(this, arguments);
  }
});

export default CoreView;
