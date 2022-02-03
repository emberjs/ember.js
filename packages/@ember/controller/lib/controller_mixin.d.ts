import { RouteArgs } from '@ember/-internals/routing/lib/utils';
import Mixin from '@ember/object/mixin';
import { Transition } from 'router_js';

/* @internal */
interface ControllerMixin<T> {
  /** @internal */
  _qpDelegate: unknown | null;

  isController: true;
  target: unknown | null;
  model: T;

  // From routing/lib/ext/controller

  concatenatedProperties: string[];

  queryParams: Array<string | Record<string, { type: 'boolean' | 'number' | 'array' | 'string' }>>;

  transitionToRoute(...args: RouteArgs): Transition;

  replaceRoute(...args: RouteArgs): Transition;
}
declare const ControllerMixin: Mixin;

export { ControllerMixin as default };
