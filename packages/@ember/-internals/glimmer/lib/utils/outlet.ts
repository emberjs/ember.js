import type { InternalOwner } from '@ember/-internals/owner';
import type { Reference } from '@glimmer/interfaces';
import type { OutletDefinitionState } from '../component-managers/outlet';

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
   * Supplied by the route manager via `getRenderState` to keep `outlet` agnostic
   * Produces a stable context reference
   *
   * @TODO: alternatively put it on OutletState directly and pass through `_setOutlets`;
   */
  produceContext?(
    outletRef: Reference,
    lastState: OutletDefinitionState,
    state: OutletDefinitionState
  ): Reference;

  /**
   * The stable wrapper component returned by `RouteManager.getRouteWrapper`
   */
  wrapper: object | undefined;

  /**
   * The per-render invokable returned by `RouteManager.getInvokable`
   */
  invokable: object | undefined;

  /**
   * The manager's bucket for the route; the outlet curries it onto the
   * wrapper as `@bucket`.
   */
  bucket?: object;

  /**
   * Legacy template used by `setOutletState` callers (older test-helpers,
   * liquid-fire-style addons). Usually a `Template`, but a pre-built
   * component definition is also accepted (see `OutletView`).
   */
  template?: object;
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
