import type { Renderer, View } from '@ember/-internals/glimmer/lib/renderer';
import { meta as metaFor } from '@ember/-internals/meta/lib/meta';
import inject from '@ember/-internals/metal/lib/injected_property';
import {
  eventedOn,
  eventedOne,
  eventedTrigger,
  eventedOff,
  eventedHas,
} from '@ember/-internals/metal/lib/evented-methods';
import ActionHandler from '@ember/-internals/runtime/lib/mixins/action_handler-internal';
import Evented from '@ember/object/evented';
import { FrameworkObject } from '@ember/object/-internals';
import type { ViewState } from './states';
import states from './states';

/**
  `CoreView` is an abstract class that exists to give view-like behavior
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

interface CoreView extends ActionHandler, View {}
class CoreView extends FrameworkObject.extend(ActionHandler) {
  static {
    // The deprecated Evented mixin is no longer applied, but instances still
    // provide its methods, so `Evented.detect` must keep returning true.
    metaFor(this.prototype).addMixin(Evented);
  }

  isView = true;

  declare _states: typeof states;

  declare _state: keyof typeof states;
  declare _currentState: ViewState;

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
    @private
  */
  declare parentView: View | null;

  init(properties: object | undefined) {
    super.init(properties);

    this.parentView ??= null;

    this._state = 'preRender';
    this._currentState = this._states.preRender;
  }

  @inject('renderer', '-dom')
  declare renderer: Renderer;

  instrumentDetails(hash: Record<string, unknown>) {
    hash['object'] = this.toString();
    hash['containerKey'] = this._debugContainerKey;
    hash['view'] = this;
    return hash;
  }

  on<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  on(name: string, method: ((...args: any[]) => void) | string): this;
  on(name: string, target: any, method?: any) {
    eventedOn(this, name, target, method);
    return this;
  }

  one<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  one(name: string, method: string | ((...args: any[]) => void)): this;
  one(name: string, target: any, method?: any) {
    eventedOne(this, name, target, method);
    return this;
  }

  /**
    Override the default event firing from `Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger(name: string, ...args: any[]) {
    eventedTrigger(this, name, args);
    let method = (this as any)[name];
    if (typeof method === 'function') {
      return method.apply(this, args);
    }
  }

  off<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  off(name: string, method: string | ((...args: any[]) => void)): this;
  off(name: string, target: any, method?: any) {
    eventedOff(this, name, target, method);
    return this;
  }

  has(name: string) {
    return typeof (this as any)[name] === 'function' || eventedHas(this, name);
  }

  static isViewFactory = true;
}

// Declare on the prototype to have a single shared value.
CoreView.prototype._states = states;

export default CoreView;
