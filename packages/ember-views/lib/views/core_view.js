import Renderer from "ember-metal-views/renderer";

import {
  cloneStates,
  states
} from "ember-views/views/states";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";

import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";

import { typeOf } from "ember-runtime/utils";
import { internal } from "htmlbars-runtime";

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

  _states: cloneStates(states),

  init() {
    this._super.apply(this, arguments);
    this._state = 'preRender';
    this.currentState = this._states.preRender;
    this._isVisible = get(this, 'isVisible');

    // Fallback for legacy cases where the view was created directly
    // via `create()` instead of going through the container.
    if (!this.renderer) {
      var DOMHelper = domHelper();
      renderer = renderer || new Renderer(new DOMHelper());
      this.renderer = renderer;
    }

    this.isDestroyingSubtree = false;
    this._dispatching = null;
  },

  /**
    Renders the view again. This will work regardless of whether the
    view is already in the DOM or not. If the view is in the DOM, the
    rendering process will be deferred to give bindings a chance
    to synchronize.

    If children were added during the rendering process using `appendChild`,
    `rerender` will remove them, because they will be added again
    if needed by the next `render`.

    In general, if the display of your view changes, you should modify
    the DOM element directly instead of manually calling `rerender`, which can
    be slow.

    @method rerender
  */
  rerender() {
    return this.currentState.rerender(this);
  },

  revalidate() {
    this.renderer.revalidateTopLevelView(this);
    this.scheduledRevalidation = false;
  },

  // .......................................................
  // GLIMMER RE-RENDERING
  //
  scheduleRevalidate(node, label, manualRerender) {
    if (node && !this._dispatching && node.guid in this.env.renderedNodes) {
      if (manualRerender) {
        Ember.deprecate(`You manually rerendered ${label} (a parent component) from a child component during the rendering process. This rarely worked in Ember 1.x and will be removed in Ember 2.0`);
      } else {
        Ember.deprecate(`You modified ${label} twice in a single render. This was unreliable in Ember 1.x and will be removed in Ember 2.0`);
      }
      run.scheduleOnce('render', this, this.revalidate);
      return;
    }

    Ember.deprecate(`A property of ${this} was modified inside the ${this._dispatching} hook. You should never change properties on components, services or models during ${this._dispatching} because it causes significant performance degradation.`, !this._dispatching);

    if (!this.scheduledRevalidation || this._dispatching) {
      this.scheduledRevalidation = true;
      run.scheduleOnce('render', this, this.revalidate);
    }
  },

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
  */
  parentView: null,

  _state: null,

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
    var parent = this.parentView;

    if (!this._super(...arguments)) { return; }

    this.currentState.cleanup(this);

    if (!this.ownerView.isDestroyingSubtree) {
      this.ownerView.isDestroyingSubtree = true;
      if (parent) { parent.removeChild(this); }
      if (this._renderNode) {
        Ember.assert("BUG: Render node exists without concomitant env.", this.ownerView.env);
        internal.clearMorph(this._renderNode, this.ownerView.env, true);
      }
      this.ownerView.isDestroyingSubtree = false;
    }

    // Destroy HTMLbars template
    if (this.lastResult) {
      this.lastResult.destroy();
    }

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

var _domHelper;
function domHelper() {
  return _domHelper = _domHelper || Ember.__loader.require("ember-htmlbars/system/dom-helper")['default'];
}

export default CoreView;
