import { Owner } from '@ember/-internals/owner';
import { Opaque } from '@glimmer/interfaces';
import { combine, DirtyableTag, Reference, Tag, VersionedPathReference } from '@glimmer/reference';
import { OwnedTemplate } from '../template';

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
  controller: any | undefined;

  /**
   * template (the layout of the outlet component)
   */
  template: OwnedTemplate | undefined;
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
export class RootOutletReference implements VersionedPathReference<OutletState> {
  tag = DirtyableTag.create();

  constructor(public outletState: OutletState) {}

  get(key: string): VersionedPathReference<Opaque> {
    return new PathReference(this, key);
  }

  value(): OutletState {
    return this.outletState;
  }

  update(state: OutletState) {
    this.outletState.outlets.main = state;
    this.tag.inner.dirty();
  }
}

/**
 * Represents the connected outlet.
 */
export class OutletReference implements VersionedPathReference<OutletState | undefined> {
  tag: Tag;

  constructor(
    public parentStateRef: VersionedPathReference<OutletState | undefined>,
    public outletNameRef: Reference<string>
  ) {
    this.tag = combine([parentStateRef.tag, outletNameRef.tag]);
  }

  value(): OutletState | undefined {
    let outletState = this.parentStateRef.value();
    let outlets = outletState === undefined ? undefined : outletState.outlets;
    return outlets === undefined ? undefined : outlets[this.outletNameRef.value()];
  }

  get(key: string): VersionedPathReference<Opaque> {
    return new PathReference(this, key);
  }
}

/**
 * Outlet state is dirtied from root.
 * This just using the parent tag for dirtiness.
 */
class PathReference implements VersionedPathReference<Opaque> {
  public parent: VersionedPathReference<Opaque>;
  public key: string;
  public tag: Tag;

  constructor(parent: VersionedPathReference<Opaque>, key: string) {
    this.parent = parent;
    this.key = key;
    this.tag = parent.tag;
  }

  get(key: string): VersionedPathReference<Opaque> {
    return new PathReference(this, key);
  }

  value(): Opaque {
    let parent = this.parent.value();
    return parent && parent[this.key];
  }
}
