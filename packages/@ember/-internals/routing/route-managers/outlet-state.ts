import type { InternalOwner } from '@ember/-internals/owner';
import type { Reference } from '@glimmer/reference/lib/reference';

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
   * The model (the resolved value of the model hook)
   */
  model: unknown;

  /**
   * The per-render invokable returned by `RouteManager.getInvokable`
   */
  invokable: object | undefined;

  /**
   * The manager's bucket for the route; the outlet curries it onto the
   * invokable as `@bucket`.
   */
  bucket?: object;
}

export interface OutletState {
  /**
   * Represents what was rendered into this outlet.
   */
  render: RenderState | undefined;

  /**
   * The manager that produced `render`, written by `Router#_setOutlets`.
   */
  manager:
    | {
        getRenderContext?(bucket: object): unknown;
        getRenderInvokable?(bucket: object): object | undefined;
        /** Required. `null` means nothing renders here yet. */
        getRouteWrapper(
          bucket: object,
          childOutlet: Reference,
          defaultOutlet: (layout?: unknown) => object | null
        ): object | null;
      }
    | undefined;

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
