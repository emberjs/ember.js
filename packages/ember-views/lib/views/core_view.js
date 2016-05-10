import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';

import EmberObject from 'ember-runtime/system/object';
import Evented from 'ember-runtime/mixins/evented';
import ActionHandler, { deprecateUnderscoreActions } from 'ember-runtime/mixins/action_handler';
import { typeOf } from 'ember-runtime/utils';

import { InteractiveRenderer } from 'ember-htmlbars/renderer';
import { cloneStates, states } from 'ember-views/views/states';
import { internal } from 'htmlbars-runtime';
import require from 'require';

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
  @private
*/
const CoreView = EmberObject.extend(Evented, ActionHandler, {
  isView: true,

  _states: cloneStates(states),

  init() {
    this._super(...arguments);
    this._state = 'preRender';
    this._currentState = this._states.preRender;
    this._isVisible = get(this, 'isVisible');

    // Fallback for legacy cases where the view was created directly
    // via `create()` instead of going through the container.
    if (!this.renderer) {
      var DOMHelper = domHelper();
      renderer = renderer || InteractiveRenderer.create({ dom: new DOMHelper() });
      this.renderer = renderer;
    }

    this._destroyingSubtreeForView = null;
    this._dispatching = null;
  },

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
    @private
  */
  parentView: null,

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
    this._super(...arguments);
    var name = arguments[0];
    var method = this[name];
    if (method) {
      var args = new Array(arguments.length - 1);
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
      return method.apply(this, args);
    }
  },

  has(name) {
    return typeOf(this[name]) === 'function' || this._super(name);
  },

  destroy() {
    if (!this._super(...arguments)) { return; }

    this._currentState.cleanup(this);

    // If the destroyingSubtreeForView property is not set but we have an
    // associated render node, it means this view is being destroyed from user
    // code and not via a change in the templating layer (like an {{if}}
    // becoming falsy, for example).  In this case, it is our responsibility to
    // make sure that any render nodes created as part of the rendering process
    // are cleaned up.
    if (!this.ownerView._destroyingSubtreeForView && this._renderNode) {
      assert('BUG: Render node exists without concomitant env.', this.ownerView.env);
      internal.clearMorph(this._renderNode, this.ownerView.env, true);
    }

    return this;
  }
});

deprecateUnderscoreActions(CoreView);

CoreView.reopenClass({
  isViewFactory: true
});

var _domHelper;
function domHelper() {
  return _domHelper = _domHelper || require('ember-htmlbars/system/dom-helper').default;
}

export default CoreView;
