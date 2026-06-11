import type { Renderer, View } from '@ember/-internals/glimmer/lib/renderer';
import inject from '@ember/-internals/metal/lib/injected_property';
import { defineProperty } from '@ember/-internals/metal/lib/properties';
import type { ExtendedMethodDecorator } from '@ember/-internals/metal/lib/decorator';
import ActionHandler from '@ember/-internals/runtime/lib/mixins/action_handler';
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

interface CoreView extends Evented, ActionHandler, View {}
class CoreView extends /* #__PURE__ */ FrameworkObject.extend(Evented, ActionHandler) {
  isView = true;

  declare _states: typeof states;

  declare _state: keyof typeof states;
  declare _currentState: ViewState;

  _superTrigger?: Evented['trigger'];
  _superHas?: Evented['has'];

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

    // Handle methods from Evented
    // The native class inheritance will not work for mixins. To work around this,
    // we copy the existing trigger and has methods provided by the mixin and swap in the
    // new ones from our class.
    this._superTrigger = this.trigger;
    this.trigger = this._trigger;
    this._superHas = this.has;
    this.has = this._has;

    this.parentView ??= null;

    this._state = 'preRender';
    this._currentState = this._states.preRender;
  }

  declare renderer: Renderer;

  instrumentDetails(hash: Record<string, unknown>) {
    hash['object'] = this.toString();
    hash['containerKey'] = this._debugContainerKey;
    hash['view'] = this;
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
    let method = (this as any)[name];
    if (typeof method === 'function') {
      return method.apply(this, args);
    }
  }

  // Changed to `has` on init
  _has(name: string) {
    return typeof (this as any)[name] === 'function' || this._superHas!(name);
  }

  static isViewFactory = true;
}

// Declare on the prototype to have a single shared value.
const CoreViewWithStates = /* #__PURE__ */ (() => {
  // This was `@inject('renderer', '-dom')` on the field, but a decorator
  // forces an impure `static {}` block into the class body, which blocks
  // tree-shaking of the whole class. Applying the injection decorator through
  // `defineProperty` is what classic mixin application does with the same
  // value.
  defineProperty(
    CoreView.prototype,
    'renderer',
    inject('renderer', '-dom') as unknown as ExtendedMethodDecorator
  );

  CoreView.prototype._states = states;
  return CoreView;
})();

type CoreViewWithStates = CoreView;

export default CoreViewWithStates;
