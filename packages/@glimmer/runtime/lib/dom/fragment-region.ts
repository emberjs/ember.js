import type {
  Bounds,
  Nullable,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import { registerDestructor } from '@glimmer/destroyable';

import { parentOf } from '../bounds';
import { isFragment } from './normalize';

/**
 * A DocumentFragment cannot stay in the DOM. Inserting one moves its children
 * out and leaves the fragment empty, so the fragment is not an address that
 * later renders can target.
 *
 * A region is that address. It is a pair of comment markers around the place
 * where the fragment's children went, so `{{#in-element fragment}}` can render
 * into the same place after `{{fragment}}` already emptied the fragment.
 *
 * The fragment stays the owner of the content. When the region goes away, the
 * content moves back into the fragment instead of being thrown away, so a
 * `{{fragment}}` that renders again shows the same nodes with their state
 * intact.
 */
export class FragmentRegion implements Bounds {
  constructor(
    private fragment: SimpleDocumentFragment,
    private parent: SimpleElement | SimpleDocumentFragment,
    private open: SimpleNode,
    private close: SimpleNode
  ) {
    // Eager, because the destructor has to run before the enclosing block
    // removes the region's nodes from the DOM.
    registerDestructor(this, () => this.returnContent(), true);
  }

  parentNode(): SimpleElement | SimpleDocumentFragment {
    return parentOf(this.open) ?? this.parent;
  }

  firstNode(): SimpleNode {
    return this.open;
  }

  lastNode(): SimpleNode {
    return this.close;
  }

  /**
   * New content goes before the close marker. This keeps the content inside the
   * region, and keeps sibling regions in template order.
   */
  insertionPoint(): SimpleNode {
    return this.close;
  }

  isLive(): boolean {
    return parentOf(this.open) !== null;
  }

  /**
   * Removes the content of the region and keeps the markers, which is the
   * fragment equivalent of removing an element's children.
   */
  clearContent(): void {
    let parent = this.parentNode();

    this.eachContentNode((node) => parent.removeChild(node));
  }

  /**
   * Moves the content of the region back into the fragment it came from.
   */
  private returnContent(): void {
    this.eachContentNode((node) => this.fragment.insertBefore(node, null));
  }

  private eachContentNode(callback: (node: SimpleNode) => void): void {
    let node = this.open.nextSibling;

    while (node !== null && node !== this.close) {
      let next = node.nextSibling;
      callback(node);
      node = next;
    }
  }
}

const REGIONS = new WeakMap<SimpleDocumentFragment, FragmentRegion>();

export function setFragmentRegion(fragment: SimpleDocumentFragment, region: FragmentRegion): void {
  REGIONS.set(fragment, region);
}

/**
 * Returns the region that a fragment currently renders through, or null if the
 * fragment was never rendered or its region was since removed from the DOM.
 */
export function fragmentRegionFor(
  node: SimpleElement | SimpleDocumentFragment
): Nullable<FragmentRegion> {
  if (!isFragment(node)) return null;

  let region = REGIONS.get(node);

  if (region === undefined) return null;

  if (!region.isLive()) {
    REGIONS.delete(node);
    return null;
  }

  return region;
}
