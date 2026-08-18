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

/**
 * Represents one rendered instance of a route.
 * Maps to a `routeInfo`.
 */
export class OutletState implements OutletParent {
  @tracked context: unknown;

  readonly outlets: {
    main: OutletState | undefined;
  } = {
    main: undefined,
  };

  get name() {
    return this.routeInfo.name;
  }

  constructor(
    readonly manager: { getRouteWrapper(): object },
    readonly bucket: object,
    readonly invokable: object | undefined,
    readonly routeInfo: InternalRouteInfo<BaseRoute>
  ) {
    this.context = routeInfo.context;

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
