import { RouteArgs } from '@ember/-internals/routing/lib/utils';
import Mixin from '@ember/object/mixin';
import Route from '@ember/routing/route';
import { Transition } from 'router_js';

export type ControllerQueryParamType = 'boolean' | 'number' | 'array' | 'string';
export type ControllerQueryParam = string | Record<string, { type: ControllerQueryParamType }>;

/* @internal */
interface ControllerMixin<T> {
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
declare const ControllerMixin: Mixin;

export { ControllerMixin as default };
