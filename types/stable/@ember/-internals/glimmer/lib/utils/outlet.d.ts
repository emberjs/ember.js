declare module '@ember/-internals/glimmer/lib/utils/outlet' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { Template } from '@glimmer/interfaces';
  export interface RenderState {
    /**
     * This is usually inherited from the parent (all the way up to the app
     * instance). However, engines uses this to swap out the owner when crossing
     * a mount point.
     */
    owner: InternalOwner;
    /**
     * @deprecated This used to specify "which parent route to render into",
     * which is not a thing anymore.
     */
    into: undefined;
    /**
     * @deprecated This used to specify "which named outlet in the parent
     * template to render into", which is not a thing anymore.
     */
    outlet: 'main';
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
     * template (the layout of the outlet component)
     */
    template: Template | undefined;
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
    /**
     * @deprecated
     *
     * This tracks whether this outlet state actually made it onto the page
     * somewhere. This was more of a problem when you can declare named outlets
     * left and right, and anything can render into anywhere else. We want to
     * warn users when you tried to render into somewhere that does not exist,
     * but we don't know what named outlets exists until after we have rendered
     * everything, so this was used to track these orphan renders.
     *
     * This can still happen, if, according to the router, a route is active and
     * so its template should be rendered, but the parent template is missing the
     * `{{outlet}}` keyword, or that it was hidden by an `{{#if}}` or something.
     * I guess that is considered valid, because nothing checks for this anymore.
     * seems valid for the parent to decide not to render a child template?
     */
    wasUsed?: undefined;
  }
}
