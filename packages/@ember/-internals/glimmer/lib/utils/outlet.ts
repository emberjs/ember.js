import { Owner } from '@ember/-internals/owner';
import { Factory as TemplateFactory, OwnedTemplate } from '../template';

export interface RenderState {
  /**
   * Not sure why this is here, we use the owner of the template for lookups.
   *
   * Maybe this is for the render helper?
   */
  owner: Owner;

  /**
   * The name of the parent outlet state.
   */
  into: string | undefined;

  /*
   * The outlet name in the parent outlet state's outlets.
   */
  outlet: string;

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
  template: OwnedTemplate | TemplateFactory | undefined;
}

export interface Outlets {
  [name: string]: OutletState | undefined;
}

export interface OutletState {
  /**
   * Nested outlet connections.
   */
  outlets: Outlets;

  /**
   * Represents what was rendered into this outlet.
   */
  render: RenderState | undefined;

  /**
   * Has to do with render helper and orphan outlets.
   * Whether outlet state was rendered.
   */
  wasUsed?: boolean;
}
