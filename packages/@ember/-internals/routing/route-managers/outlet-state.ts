import { invokableFor, type BaseRoute, type InternalRouteInfo } from 'router_js';
import { tracked } from '@ember/-internals/metal/lib/tracked';

function isPromise(value: object): value is Promise<object> {
  return 'then' in value && typeof value.then === 'function';
}

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

    let invokable = invokableFor(manager, bucket);
    if (isPromise(invokable)) {
      invokable.then(
        (invokable) => {
          this.invokable = invokable;
        },
        () => {
          // getInvokable rejected; this level renders nothing.
        }
      );
    } else {
      this.invokable = invokable;
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
