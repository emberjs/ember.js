declare module '@ember/-internals/views/lib/views/core_view' {
  import type { Renderer, View } from '@ember/-internals/glimmer/lib/renderer';
  import { ActionHandler } from '@ember/-internals/runtime';
  import Evented from '@ember/object/evented';
  import type { ViewState } from '@ember/-internals/views/lib/views/states';
  import states from '@ember/-internals/views/lib/views/states';
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
  interface CoreView extends Evented, ActionHandler, View {}
  const CoreView_base: Readonly<typeof import('@ember/object').default> &
    (new (owner?: import('@ember/owner').default | undefined) => import('@ember/object').default) &
    import('@ember/object/mixin').default;
  class CoreView extends CoreView_base {
    isView: boolean;
    _states: typeof states;
    _state: keyof typeof states;
    _currentState: ViewState;
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
    parentView: View | null;
    init(properties: object | undefined): void;
    renderer: Renderer;
    instrumentDetails(hash: Record<string, unknown>): Record<string, unknown>;
    /**
          Override the default event firing from `Evented` to
          also call methods with the given name.
      
          @method trigger
          @param name {String}
          @private
        */
    _trigger(name: string, ...args: any[]): any;
    _has(name: string): boolean;
    static isViewFactory: boolean;
  }
  export default CoreView;
}
