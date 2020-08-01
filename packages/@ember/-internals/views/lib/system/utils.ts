import { Renderer } from '@ember/-internals/glimmer';
import { getOwner, Owner } from '@ember/-internals/owner';
/* globals Element */
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { Dict, Option } from '@glimmer/interfaces';

/**
@module ember
*/

export function isSimpleClick(event: MouseEvent) {
  let modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey;
  let secondaryClick = event.which > 1; // IE9 may return undefined

  return !modifier && !secondaryClick;
}

export function constructStyleDeprecationMessage(affectedStyle: string) {
  return (
    '' +
    'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
    'please ensure that values being bound are properly escaped. For more information, ' +
    'including how to disable this warning, see ' +
    'https://emberjs.com/deprecations/v1.x/#toc_binding-style-attributes. ' +
    'Style affected: "' +
    affectedStyle +
    '"'
  );
}

interface View {
  parentView: Option<View>;
  renderer: Renderer;
  tagName?: string;
  elementId?: string;
  isDestroying: boolean;
  isDestroyed: boolean;
}

export function registerView(view: View) {
  let owner = getOwner(view);
  let registry = owner.lookup<Dict<View>>('-view-registry:main')!;

  let id = getViewId(view);
  assert('Attempted to register a view with an id already in use: ' + id, !registry[id]);
  registry[id] = view;
}

export function unregisterView(view: View) {
  let owner = getOwner(view);
  let registry = owner.lookup<Dict<View>>('-view-registry:main')!;

  delete registry[getViewId(view)];
}

/**
  @private
  @method getRootViews
  @param {Object} owner
*/
export function getRootViews(owner: Owner): View[] {
  let registry = owner.lookup<Dict<View>>('-view-registry:main')!;

  let rootViews: View[] = [];

  Object.keys(registry).forEach((id) => {
    let view = registry[id];

    if (view.parentView === null) {
      rootViews.push(view);
    }
  });

  return rootViews;
}

/**
  @private
  @method getViewId
  @param {Ember.View} view
 */
export function getViewId(view: View): string {
  if (view.tagName !== '' && view.elementId) {
    return view.elementId;
  } else {
    return guidFor(view);
  }
}

const ELEMENT_VIEW: WeakMap<Element, View> = new WeakMap();
const VIEW_ELEMENT: WeakMap<View, Element> = new WeakMap();

export function getElementView(element: Element): Option<View> {
  return ELEMENT_VIEW.get(element) || null;
}

/**
  @private
  @method getViewElement
  @param {Ember.View} view
 */
export function getViewElement(view: View): Option<Element> {
  return VIEW_ELEMENT.get(view) || null;
}

export function setElementView(element: Element, view: View): void {
  ELEMENT_VIEW.set(element, view);
}

export function setViewElement(view: View, element: Element): void {
  VIEW_ELEMENT.set(view, element);
}

// These are not needed for GC, but for correctness. We want to be able to
// null-out these links while the objects are still live. Specifically, in
// this case, we want to prevent access to the element (and vice verse) during
// destruction.

export function clearElementView(element: Element): void {
  ELEMENT_VIEW.delete(element);
}

export function clearViewElement(view: View): void {
  VIEW_ELEMENT.delete(view);
}

const CHILD_VIEW_IDS: WeakMap<View, Set<string>> = new WeakMap();

/**
  @private
  @method getChildViews
  @param {Ember.View} view
*/
export function getChildViews(view: View) {
  let owner = getOwner(view);
  let registry = owner.lookup<Dict<View>>('-view-registry:main')!;
  return collectChildViews(view, registry);
}

export function initChildViews(view: View): Set<string> {
  let childViews: Set<string> = new Set();
  CHILD_VIEW_IDS.set(view, childViews);
  return childViews;
}

export function addChildView(parent: View, child: View): void {
  let childViews = CHILD_VIEW_IDS.get(parent);
  if (childViews === undefined) {
    childViews = initChildViews(parent);
  }

  childViews.add(getViewId(child));
}

export function collectChildViews(view: View, registry: Dict<View>): View[] {
  let views: View[] = [];
  let childViews = CHILD_VIEW_IDS.get(view);

  if (childViews !== undefined) {
    childViews.forEach((id) => {
      let view = registry[id];
      if (view && !view.isDestroying && !view.isDestroyed) {
        views.push(view);
      }
    });
  }

  return views;
}

/**
  @private
  @method getViewBounds
  @param {Ember.View} view
*/
export function getViewBounds(view: View) {
  return view.renderer.getBounds(view);
}

/**
  @private
  @method getViewRange
  @param {Ember.View} view
*/
export function getViewRange(view: View): Range {
  let bounds = getViewBounds(view);

  let range = document.createRange();
  range.setStartBefore((bounds.firstNode as unknown) as Node);
  range.setEndAfter((bounds.lastNode as unknown) as Node);

  return range;
}

/**
  `getViewClientRects` provides information about the position of the border
  box edges of a view relative to the viewport.

  It is only intended to be used by development tools like the Ember Inspector
  and may not work on older browsers.

  @private
  @method getViewClientRects
  @param {Ember.View} view
*/
export function getViewClientRects(view: View): ClientRectList | DOMRectList {
  let range = getViewRange(view);
  return range.getClientRects();
}

/**
  `getViewBoundingClientRect` provides information about the position of the
  bounding border box edges of a view relative to the viewport.

  It is only intended to be used by development tools like the Ember Inspector
  and may not work on older browsers.

  @private
  @method getViewBoundingClientRect
  @param {Ember.View} view
*/
export function getViewBoundingClientRect(view: View): ClientRect | DOMRect {
  let range = getViewRange(view);
  return range.getBoundingClientRect();
}

/**
  Determines if the element matches the specified selector.

  @private
  @method matches
  @param {DOMElement} el
  @param {String} selector
*/
export const elMatches: typeof Element.prototype.matches | undefined =
  typeof Element !== 'undefined'
    ? Element.prototype.matches ||
      Element.prototype['matchesSelector'] ||
      Element.prototype['mozMatchesSelector'] ||
      Element.prototype['msMatchesSelector'] ||
      Element.prototype['oMatchesSelector'] ||
      Element.prototype['webkitMatchesSelector']
    : undefined;

export function matches(el: Element, selector: string) {
  assert('cannot call `matches` in fastboot mode', elMatches !== undefined);
  return elMatches!.call(el, selector);
}

export function contains(a: Node, b: Node) {
  if (a.contains !== undefined) {
    return a.contains(b);
  }

  let current: Option<Node> = b.parentNode;

  while (current && (current = current.parentNode)) {
    if (current === a) {
      return true;
    }
  }
  return false;
}
