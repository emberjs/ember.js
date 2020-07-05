import { Owner } from '@ember/-internals/owner';
import { PathReference, Reference } from '@glimmer/reference';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';
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

/**
 * Represents the root outlet.
 */
export class RootOutletReference implements PathReference<OutletState> {
  private tag = createTag();

  constructor(public outletState: OutletState) {}

  get(key: string): PathReference {
    return new OutletPathReference(this, key);
  }

  isConst() {
    return false;
  }

  value(): OutletState {
    consumeTag(this.tag);
    return this.outletState;
  }

  update(state: OutletState) {
    this.outletState.outlets.main = state;
    dirtyTag(this.tag);
  }
}

/**
 * Represents the connected outlet.
 */
export class OutletReference implements PathReference<OutletState | undefined> {
  constructor(
    public parentStateRef: PathReference<OutletState | undefined>,
    public outletNameRef: Reference<string>
  ) {}

  isConst() {
    return false;
  }

  value(): OutletState | undefined {
    let outletState = this.parentStateRef.value();
    let outlets = outletState === undefined ? undefined : outletState.outlets;
    return outlets === undefined ? undefined : outlets[this.outletNameRef.value()];
  }

  get(key: string): PathReference {
    return new OutletPathReference(this, key);
  }
}

/**
 * Outlet state is dirtied from root.
 * This just using the parent tag for dirtiness.
 */
class OutletPathReference implements PathReference<unknown> {
  public parent: PathReference<unknown>;
  public key: string;

  constructor(parent: PathReference<unknown>, key: string) {
    this.parent = parent;
    this.key = key;
  }

  isConst() {
    return false;
  }

  get(key: string): PathReference<unknown> {
    return new OutletPathReference(this, key);
  }

  value(): unknown {
    let parent = this.parent.value();
    return parent && (parent as object)[this.key];
  }
}
