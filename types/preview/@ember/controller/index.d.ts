declare module '@ember/controller' {
  import ActionHandler from '@ember/object/-private/action-handler';
  import Mixin from '@ember/object/mixin';
  import EmberObject from '@ember/object';
  import type { BasicComputedProperty } from '@ember/object/computed';

  type QueryParamTypes = 'boolean' | 'number' | 'array' | 'string';
  type QueryParamScopeTypes = 'controller' | 'model';

  interface QueryParamConfig {
    type?: QueryParamTypes | undefined;
    scope?: QueryParamScopeTypes | undefined;
    as?: string | undefined;
  }

  /**
   * Additional methods for the Controller.
   */
  interface ControllerMixin extends ActionHandler {
    /**
     * @deprecated until 5.0. Use `RouterService.replaceWith` instead.
     */
    replaceRoute(name: string, ...args: any[]): void;
    /**
     * @deprecated until 5.0. Use `RouterService.transitionTo` instead.
     */
    transitionToRoute(name: string, ...args: any[]): void;
    /**
     * @deprecated until 5.0. Use `RouterService.transitionTo` instead.
     */
    transitionToRoute(...args: any[]): void;
    model: unknown;
    queryParams: Readonly<Array<string | Record<string, QueryParamConfig | string | undefined>>>;
    target: object;
  }

  export default class Controller extends EmberObject {}
  export default interface Controller extends ControllerMixin {}

  export function inject(): Controller;
  export function inject<K extends keyof Registry>(name: K): Registry[K] & BasicComputedProperty;
  export function inject(target: object, propertyKey: string | symbol): void;

  // A type registry for Ember `Controller`s. Meant to be declaration-merged
  // so string lookups resolve to the correct type.
  export interface Registry {}
}
