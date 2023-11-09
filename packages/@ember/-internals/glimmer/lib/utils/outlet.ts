import type { InternalOwner } from '@ember/-internals/owner';
import type { Template } from '@glimmer/interfaces';

// Note: a lot of these does not make sense anymore. This design was from back
// when we supported "named outlets", where a route can do:
//
// this.renderTemplate("some-template", {
//   into: 'some-parent-route',
//   outlet: 'some-name' /* {{outlet "some-name"}} */ | undefined /* {{outlet}} */,
//   controller: 'some-controller' | SomeController,
//   model: { ... },
// });
//
// And interface reflects that. Now that this is not supported anymore, each
// route implicitly renders into its immediate parent's `{{outlet}}` (no name).
// Keeping around most of these to their appropriately hardcoded values for the
// time being to minimize churn for external consumers, as we are about to rip
// all of it out anyway.

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
