import { Mixin, computed } from '@ember/-internals/metal';
import { RouteArgs } from '@ember/-internals/routing/lib/utils';
import { ActionHandler } from '@ember/-internals/runtime';
import { symbol } from '@ember/-internals/utils';
import Route from '@ember/routing/route';
import { Transition } from 'router_js';

export type ControllerQueryParamType = 'boolean' | 'number' | 'array' | 'string';
export type ControllerQueryParam = string | Record<string, { type: ControllerQueryParamType }>;

const MODEL = symbol('MODEL');

/**
@module ember
*/

/**
  @class ControllerMixin
  @namespace Ember
  @uses Ember.ActionHandler
  @private
*/
interface ControllerMixin<T> extends ActionHandler {
  /** @internal */
  _qpDelegate: unknown | null;

  isController: true;
  target: unknown | null;
  model: T;

  // From routing/lib/ext/controller

  queryParams: Array<ControllerQueryParam>;

  transitionToRoute(...args: RouteArgs<Route>): Transition;

  replaceRoute(...args: RouteArgs<Route>): Transition;
}
const ControllerMixin = Mixin.create(ActionHandler, {
  /* ducktype as a controller */
  isController: true,

  /**
    The object to which actions from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the action to the view's controller's `target`.

    By default, the value of the target property is set to the router, and
    is injected when a controller is instantiated. This injection is applied
    as part of the application's initialization process. In most cases the
    `target` property will automatically be set to the logical consumer of
    actions for the controller.

    @property target
    @default null
    @public
  */
  target: null,

  store: null,

  /**
    The controller's current model. When retrieving or modifying a controller's
    model, this property should be used instead of the `content` property.

    @property model
    @public
  */
  model: computed({
    get() {
      return this[MODEL];
    },

    set(_key, value) {
      return (this[MODEL] = value);
    },
  }),
});

export default ControllerMixin;
