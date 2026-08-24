import type { BaseRoute, InternalRouteInfo } from 'router_js';
import { tracked } from '@ember/-internals/metal/lib/tracked';

/**
 * What the outlet walk descends from.
 */
export interface OutletParent {
  /**
   * Represents what, if any, should be rendered into the next {{outlet}} found
   * at this level.
   *
   * This used to be a dictionary of children outlets, including the {{outlet}}
   * "main" outlet any {{outlet "named"}} named outlets. Since named outlets
   * are not a thing anymore, this can now just be a single`child`.
   */
  outlets: {
    main: OutletState | undefined;
  };
}

const INVOKABLES = new WeakMap<object, object>();

/**
 * Represents one rendered instance of a route.
 * Maps to a `routeInfo`.
 */
export class OutletState implements OutletParent {
  @tracked context: unknown;

  @tracked invokable: object | undefined;

  readonly outlets: {
    main: OutletState | undefined;
  } = {
    main: undefined,
  };

  get name() {
    return this.routeInfo.name;
  }

  constructor(
    readonly manager: {
      getRouteWrapper(): object;
      getInvokable(bucket: object): Promise<object>;
    },
    readonly bucket: object,
    readonly routeInfo: InternalRouteInfo<BaseRoute>
  ) {
    this.context = routeInfo.context;

    this.invokable = INVOKABLES.get(bucket);
    if (this.invokable === undefined) {
      // Substate routes never 'enter' and don't initialize `getInvokablePromise`
      const invokablePromise = routeInfo.getInvokablePromise ?? manager.getInvokable(bucket);

      invokablePromise.then(
        (invokable) => {
          INVOKABLES.set(bucket, invokable);
          this.invokable = invokable;
        },
        () => {
          // getInvokable rejected; this level renders nothing.
        }
      );
    }

    routeInfo.enterPromise?.then(
      () => {
        this.context = routeInfo.context;
      },
      () => {
        // enter rejected; transition-level error handling reports it.
      }
    );
  }
}
