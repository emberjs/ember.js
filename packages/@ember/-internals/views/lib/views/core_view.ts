import { View } from '@ember/-internals/glimmer/lib/renderer';
import { inject } from '@ember/-internals/metal';
import { ActionHandler, Evented, FrameworkObject } from '@ember/-internals/runtime';
import { CoreObjectClass } from '@ember/-internals/runtime/lib/system/core_object';
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
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CoreViewClass extends CoreObjectClass<CoreView> {}
interface CoreView extends FrameworkObject, Evented, ActionHandler, View {}
const CoreView = (FrameworkObject.extend(Evented, ActionHandler, {
  isView: true,

  _states: states,

  init() {
    this._super(...arguments);
    this._state = 'preRender';
    this._currentState = this._states.preRender;
  },

  renderer: inject('renderer', '-dom'),

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
    @private
  */
  parentView: null,

  instrumentDetails(hash: Record<string, unknown>) {
    hash['object'] = this.toString();
    hash['containerKey'] = this._debugContainerKey;
    hash['view'] = this;
    return hash;
  },

  /**
    Override the default event firing from `Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger(name: string, ...args: any[]) {
    this._super(...arguments);
    let method = this[name];
    if (typeof method === 'function') {
      return method.apply(this, args);
    }
  },

  has(name: string) {
    return typeof this[name] === 'function' || this._super(name);
  },
}) as unknown) as CoreViewClass;

CoreView.reopenClass({
  isViewFactory: true,
});

export default CoreView;
