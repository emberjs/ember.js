import { getOwner } from '@ember/-internals/owner';
/* globals Element */
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@glimmer/util';

/**
@module ember
*/

export function isSimpleClick(event) {
  let modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey;
  let secondaryClick = event.which > 1; // IE9 may return undefined

  return !modifier && !secondaryClick;
}

export function constructStyleDeprecationMessage(affectedStyle) {
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

const VIEW_REGISTRY = new Map();

export function registerView(view) {
  VIEW_REGISTRY.set(getViewId(view), view);
}

export function unregisterView(view) {
  VIEW_REGISTRY.delete(getViewId(view));
}

/**
  @private
  @method getRootViews
  @param {Object} owner
*/
export function getRootViews(owner) {
  let rootViews = [];

  VIEW_REGISTRY.forEach(view => {
    if (getOwner(view) === owner && view.parentView === null) {
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
export function getViewId(view) {
  return guidFor(view);
}

const ELEMENT_VIEW = new WeakMap();
const VIEW_ELEMENT = new WeakMap();

export function getElementView(element) {
  return ELEMENT_VIEW.get(element) || null;
}

/**
  @private
  @method getViewElement
  @param {Ember.View} view
 */
export function getViewElement(view) {
  return VIEW_ELEMENT.get(view) || null;
}

export function setElementView(element, view) {
  ELEMENT_VIEW.set(element, view);
}

export function setViewElement(view, element) {
  VIEW_ELEMENT.set(view, element);
}

// These are not needed for GC, but for correctness. We want to be able to
// null-out these links while the objects are still live. Specifically, in
// this case, we want to prevent access to the element (and vice verse) during
// destruction.

export function clearElementView(element) {
  ELEMENT_VIEW.delete(element);
}

export function clearViewElement(view) {
  VIEW_ELEMENT.delete(view);
}

const CHILD_VIEW_IDS = new WeakMap();

/**
  @private
  @method getChildViews
  @param {Ember.View} view
*/
export function getChildViews(view) {
  return collectChildViews(view);
}

export function initChildViews(view) {
  let childViews = new Set();
  CHILD_VIEW_IDS.set(view, childViews);
  return childViews;
}

export function addChildView(parent, child) {
  let childViews = CHILD_VIEW_IDS.get(parent);
  if (childViews === undefined) {
    childViews = initChildViews(parent);
  }

  childViews.add(getViewId(child));
}

export function collectChildViews(parentView) {
  let childViews = [];
  let childViewIds = CHILD_VIEW_IDS.get(parentView);

  if (childViewIds !== undefined) {
    childViewIds.forEach(id => {
      let childView = VIEW_REGISTRY.get(id);

      if (childView) {
        assert(
          `${childView} does not have the same owner as parent ${parentView}`,
          getOwner(childView) === getOwner(parentView)
        );

        assert(
          `${childView} should have been unregistered`,
          !childView.isDestroying && !childView.isDestroyed
        );

        childViews.push(childView);
      }
    });
  }

  return childViews;
}

/**
  @private
  @method getViewBounds
  @param {Ember.View} view
*/
export function getViewBounds(view) {
  return view.renderer.getBounds(view);
}

/**
  @private
  @method getViewRange
  @param {Ember.View} view
*/
export function getViewRange(view) {
  let bounds = getViewBounds(view);

  let range = document.createRange();
  range.setStartBefore(bounds.firstNode);
  range.setEndAfter(bounds.lastNode);

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
export function getViewClientRects(view) {
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
export function getViewBoundingClientRect(view) {
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
export const elMatches =
  typeof Element !== 'undefined' &&
  (Element.prototype.matches ||
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector);

export function matches(el, selector) {
  return elMatches.call(el, selector);
}

export function contains(a, b) {
  if (a.contains !== undefined) {
    return a.contains(b);
  }
  while ((b = b.parentNode)) {
    if (b === a) {
      return true;
    }
  }
  return false;
}
