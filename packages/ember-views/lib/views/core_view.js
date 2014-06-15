import {
  cloneStates,
  states
} from "ember-views/views/states";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";

import { defineProperty, deprecateProperty } from "ember-metal/properties";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";

import { typeOf } from "ember-metal/utils";

import { instrument } from "ember-metal/instrumentation";


import renderBuffer from "ember-views/system/render_buffer";

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

  _states: cloneStates(states),

  init: function() {
    this._super();
    this.transitionTo('preRender');
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
  renderToBuffer: function(buffer) {
    var name = 'render.' + this.instrumentName,
        details = {};

    this.instrumentDetails(details);

    return instrument(name, details, function instrumentRenderToBuffer() {
      return this._renderToBuffer(buffer);
    }, this);
  },

  _renderToBuffer: function(_buffer) {
    // If this is the top-most view, start a new buffer. Otherwise,
    // create a new buffer relative to the original using the
    // provided buffer operation (for example, `insertAfter` will
    // insert a new buffer after the "parent buffer").
    var tagName = this.tagName;

    if (tagName === null || tagName === undefined) {
      tagName = 'div';
    }

    var buffer = this.buffer = _buffer && _buffer.begin(tagName) || renderBuffer(tagName);
    this.transitionTo('inBuffer', false);

    this.beforeRender(buffer);
    this.render(buffer);
    this.afterRender(buffer);

    return buffer;
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

  deprecatedSendHandles: function(actionName) {
    return !!this[actionName];
  },

  deprecatedSend: function(actionName) {
    var args = [].slice.call(arguments, 1);
    Ember.assert('' + this + " has the action " + actionName + " but it is not a function", typeof this[actionName] === 'function');
    Ember.deprecate('Action handlers implemented directly on views are deprecated in favor of action handlers on an `actions` object ( action: `' + actionName + '` on ' + this + ')', false);
    this[actionName].apply(this, args);
    return;
  },

  has: function(name) {
    return typeOf(this[name]) === 'function' || this._super(name);
  },

  destroy: function() {
    var parent = this._parentView;

    if (!this._super()) { return; }

    // destroy the element -- this will avoid each child view destroying
    // the element over and over again...
    if (!this.removedFromDOM) { this.destroyElement(); }

    // remove from parent if found. Don't call removeFromParent,
    // as removeFromParent will try to remove the element from
    // the DOM again.
    if (parent) { parent.removeChild(this); }

    this.transitionTo('destroying', false);

    return this;
  },

  clearRenderedChildren: Ember.K,
  triggerRecursively: Ember.K,
  invokeRecursively: Ember.K,
  transitionTo: Ember.K,
  destroyElement: Ember.K
});

export default CoreView;
