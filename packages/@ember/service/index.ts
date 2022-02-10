import { FrameworkObject } from '@ember/-internals/runtime';
import {
  DecoratorPropertyDescriptor,
  ElementDescriptor,
  inject as metalInject,
} from '@ember/-internals/metal';

/**
 @module @ember/service
 @public
 */

/**
  @method inject
  @static
  @since 1.10.0
  @for @ember/service
  @param {String} name (optional) name of the service to inject, defaults to
         the property's name
  @return {ComputedDecorator} injection decorator instance
  @public
*/
export function inject(name: string): PropertyDecorator;
export function inject(...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
export function inject(...args: ElementDescriptor): DecoratorPropertyDescriptor;
export function inject(): PropertyDecorator;
export function inject(
  ...args: [] | [name: string] | ElementDescriptor
): PropertyDecorator | DecoratorPropertyDescriptor | void {
  return metalInject('service', ...args);
}

/**
  Creates a property that lazily looks up a service in the container. There are
  no restrictions as to what objects a service can be injected into.

  Example:

  ```app/routes/application.js
  import Route from '@ember/routing/route';
  import { service } from '@ember/service';

  export default class ApplicationRoute extends Route {
    @service('auth') authManager;

    model() {
      return this.authManager.findCurrentUser();
    }
  }
  ```

  Classic Class Example:

  ```app/routes/application.js
  import Route from '@ember/routing/route';
  import { service } from '@ember/service';

  export default Route.extend({
    authManager: service('auth'),

    model() {
      return this.get('authManager').findCurrentUser();
    }
  });
  ```

  This example will create an `authManager` property on the application route
  that looks up the `auth` service in the container, making it easily accessible
  in the `model` hook.

  @method service
  @static
  @since 4.1.0
  @for @ember/service
  @param {String} name (optional) name of the service to inject, defaults to
         the property's name
  @return {ComputedDecorator} injection decorator instance
  @public
*/
export function service(name: string): PropertyDecorator;
export function service(...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
export function service(...args: ElementDescriptor): DecoratorPropertyDescriptor;
export function service(): PropertyDecorator;
export function service(
  ...args: [] | [name: string] | ElementDescriptor
): PropertyDecorator | DecoratorPropertyDescriptor | void {
  return metalInject('service', ...args);
}

/**
  @class Service
  @extends EmberObject
  @since 1.10.0
  @public
*/
export default class Service extends FrameworkObject {
  static isServiceFactory = true;
}
