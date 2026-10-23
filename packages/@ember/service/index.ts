import { FrameworkObject } from '@ember/object/-internals';
import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';
import { assert } from '@ember/debug';
import type {
  DecoratorPropertyDescriptor,
  ElementDescriptor,
} from '@ember/-internals/metal/lib/decorator';
import metalInject from '@ember/-internals/metal/lib/injected_property';
import type { InjectionDecorator } from '@ember/-internals/metal/lib/decorator-util';
import type Owner from '@ember/-internals/owner';
import { getOwner, setOwner } from '@ember/-internals/owner';
import { setPlainFrameworkClass } from '@ember/-internals/container/lib/container';

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
  @deprecated Please import `service` instead.
*/
export function inject(name: string): InjectionDecorator;
export function inject(...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
export function inject(...args: ElementDescriptor): DecoratorPropertyDescriptor;
export function inject(): InjectionDecorator;
export function inject(value: undefined, context: ClassFieldDecoratorContext): void;
export function inject<This, Value>(
  value: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): void;
export function inject(
  ...args: [] | [name: string] | ElementDescriptor | [value: unknown, context: DecoratorContext]
): InjectionDecorator | DecoratorPropertyDescriptor | void {
  deprecateUntil(
    'Importing `inject` from `@ember/service` is deprecated. Please import `service` instead.',
    DEPRECATIONS.DEPRECATE_IMPORT_INJECT
  );

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

  export default class ApplicationRoute extends Route {
    @service('auth') authManager;

    model() {
      return this.authManager.findCurrentUser();
    }
  }
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
export function service(name: string): InjectionDecorator;
export function service(...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
export function service(...args: ElementDescriptor): DecoratorPropertyDescriptor;
export function service(): InjectionDecorator;
export function service(value: undefined, context: ClassFieldDecoratorContext): void;
export function service<This, Value>(
  value: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): void;
export function service(
  ...args: [] | [name: string] | ElementDescriptor | [value: unknown, context: DecoratorContext]
): InjectionDecorator | DecoratorPropertyDescriptor | void {
  return metalInject('service', ...args);
}

/**
  @class Service
  @extends EmberObject
  @since 1.10.0
  @public
*/
class Service extends FrameworkObject {
  static isServiceFactory = true;
}

/**
  The `Service` base class when the `EMBER_DROP_CLASSIC_FEATURES` build flag
  is set. It extends no other class.

  The owner passes itself to the constructor, as it does for Glimmer
  components. When the owner is destroyed, the container calls
  `willDestroy`, then destroys the service with `@ember/destroyable`.
*/
class PlainService {
  static isServiceFactory = true;

  /** The container creates instances only through `create`. */
  static create<T extends PlainService>(this: new (owner: Owner) => T, props: object): T {
    let owner = getOwner(props);
    assert('A service must be created by its owner', owner);

    return new this(owner);
  }

  constructor(owner: Owner) {
    setOwner(this, owner);
  }

  /** Empty, so that `super.willDestroy()` works in subclasses. */
  willDestroy(): void {}
}

if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  setPlainFrameworkClass(PlainService);
}

const ExportedService = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? PlainService : Service
) as typeof Service;
type ExportedService = Service;

export default ExportedService;

/**
  A type registry for Ember `Service`s. Meant to be declaration-merged so string
  lookups resolve to the correct type.

  Blueprints should include such a declaration merge for TypeScript:

  ```ts
  import Service from '@ember/service';

  export default class ExampleService extends Service {
    // ...
  }

  declare module '@ember/service' {
    export interface Registry {
      example: ExampleService;
    }
  }
  ```

  Then `@service` can check that the service is registered correctly, and APIs
  like `owner.lookup('service:example')` can return `ExampleService`.
 */
// NOTE: this cannot be `Record<string, Service | undefined>`, convenient as
// that would be for end users, because there is no actual contract to that
// effect with Ember -- and in the future this choice would allow us to have
// registered services which have no base class.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Registry extends Record<string, object | undefined> {}
