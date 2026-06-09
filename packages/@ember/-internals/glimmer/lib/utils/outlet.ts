import type { InternalOwner } from '@ember/-internals/owner';
import type { RouteStateBucket } from '@ember/-internals/routing/route-managers/api';
import type { Template } from '@glimmer/interfaces';

export interface RenderState {
  /**
   * This is usually inherited from the parent (all the way up to the app
   * instance). However, engines uses this to swap out the owner when crossing
   * a mount point.
   */
  owner: InternalOwner;

  /**
   * The name of the route/template
   */
  name: string;

  /**
   * The controller (the self of the outlet component)
   */
  controller: unknown;

  /**
   * The model (the resolved value of the model hook)
   */
  model: unknown;

  /**
   * The stable wrapper component returned by `RouteManager.getRouteWrapper`
   */
  wrapper: object | undefined;

  /**
   * The per-render invokable returned by `RouteManager.getInvokable`
   */
  invokable: object | undefined;

  /**
   * The opaque bucket the manager returned from `createRoute`
   */
  bucket: RouteStateBucket | undefined;

  /**
   * The `RouteInfo` for this render
   */
  routeInfo?: object | undefined;

  /**
   * Legacy template used by `setOutletState` callers (older test-helpers,
   * liquid-fire-style addons).
   */
  template?: Template | object | undefined;
}

export interface OutletState {
  /**
   * Represents what was rendered into this outlet.
   */
  render: RenderState | undefined;

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
