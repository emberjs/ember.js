import type { Renderer, View } from '@ember/-internals/glimmer/lib/renderer';
import { inject } from '@ember/-internals/metal';
import { FrameworkObject } from '@ember/object/-internals';
import type { ViewState } from './states';
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
  @private
*/

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CoreView extends View {}
class CoreView extends FrameworkObject {
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

  /**
    Override the default event firing from `Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger(name: string, ...args: any[]) {
    let method = (this as any)[name];
    if (typeof method === 'function') {
      return method.apply(this, args);
    }
  }

  static isViewFactory = true;
}

// Declare on the prototype to have a single shared value.
CoreView.prototype._states = states;

export default CoreView;
