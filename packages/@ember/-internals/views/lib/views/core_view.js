import { ActionHandler, Evented, FrameworkObject } from '@ember/-internals/runtime';
import { initViewElement } from '../system/utils';
import { cloneStates, states } from './states';

/**
  `Ember.CoreView` is an abstract class that exists to give view-like behavior
  to both Ember's main view class `Component` and other classes that don't need
  the full functionality of `Component`.

  Unless you have specific needs for `CoreView`, you will use `Component`
  in your applications.

  @class CoreView
  @namespace Ember
  @extends EmberObject
  @deprecated Use `Component` instead.
  @uses Evented
  @uses Ember.ActionHandler
  @private
*/
const CoreView = FrameworkObject.extend(Evented, ActionHandler, {
  isView: true,

  _states: cloneStates(states),

  init() {
    this._super(...arguments);
    this._state = 'preRender';
    this._currentState = this._states.preRender;

    initViewElement(this);

    if (!this.renderer) {
      throw new Error(
        `Cannot instantiate a component without a renderer. Please ensure that you are creating ${this} with a proper container/registry.`
      );
    }
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

  instrumentDetails(hash) {
    hash.object = this.toString();
    hash.containerKey = this._debugContainerKey;
    hash.view = this;
    return hash;
  },

  /**
    Override the default event firing from `Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger(name, ...args) {
    this._super(...arguments);
    let method = this[name];
    if (typeof method === 'function') {
      return method.apply(this, args);
    }
  },

  has(name) {
    return typeof this[name] === 'function' || this._super(name);
  },
});

CoreView.reopenClass({
  isViewFactory: true,
});

export default CoreView;
