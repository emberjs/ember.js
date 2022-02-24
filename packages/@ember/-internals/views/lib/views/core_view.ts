import { Renderer, View } from '@ember/-internals/glimmer/lib/renderer';
import { inject } from '@ember/-internals/metal';
import { ActionHandler, Evented, FrameworkObject } from '@ember/-internals/runtime';
import states from './states';

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

interface CoreView extends FrameworkObject, Evented, ActionHandler, View {}
class CoreView extends FrameworkObject.extend(Evented, ActionHandler) {
  isView = true;

  _states = states;
  _state: unknown;
  _currentState: unknown;

  _superTrigger?: Evented['trigger'];
  _superHas?: Evented['has'];

  init(properties: object | undefined) {
    super.init(properties);

    // Handle methods from Evented
    this._superTrigger = this.trigger;
    this.trigger = this._trigger;
    this._superHas = this.has;
    this.has = this._has;

    this._state = 'preRender';
    this._currentState = this._states.preRender;
  }

  @inject('renderer', '-dom')
  declare renderer: Renderer;

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
    @private
  */
  // TODO: Make sure this shouldn't be overridable via extend/create
  parentView = null;

  instrumentDetails(hash: Record<string, unknown>) {
    hash.object = this.toString();
    hash.containerKey = this._debugContainerKey;
    hash.view = this;
    return hash;
  }

  /**
    Override the default event firing from `Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  // Changed to `trigger` on init
  _trigger(name: string, ...args: any[]) {
    this._superTrigger!(name, ...args);
    let method = this[name];
    if (typeof method === 'function') {
      return method.apply(this, args);
    }
  }

  // Changed to `has` on init
  _has(name: string) {
    return typeof this[name] === 'function' || this._superHas!(name);
  }

  static isViewFactory = true;
}

export default CoreView;
