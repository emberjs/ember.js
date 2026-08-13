import type { InternalOwner } from '@ember/-internals/owner';

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
   * The route's invokable, passed to the wrapper as `@Component`.
   */
  invokable: object | undefined;
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

export interface OutletState extends OutletParent {
  /**
   * Represents what was rendered into this outlet.
   */
  render: RenderState;

  /**
   * The router's bucket for this level, passed to the wrapper as `@bucket`.
   */
  bucket: object;

  /**
   * The manager that produced `render`.
   */
  manager: {
    /** Module-stable per RFC-1169; the framework curries this level's state onto it. */
    getRouteWrapper(): object;
  };
}
