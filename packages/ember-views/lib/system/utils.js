/* globals Element */
import { guidFor, symbol, getOwner } from 'ember-utils';

/**
@module ember
@submodule ember-views
*/

export function isSimpleClick(event) {
  let modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey;
  let secondaryClick = event.which > 1; // IE9 may return undefined

  return !modifier && !secondaryClick;
}

export const STYLE_WARNING = '' +
  'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
  'please ensure that values being bound are properly escaped. For more information, ' +
  'including how to disable this warning, see ' +
  'http://emberjs.com/deprecations/v1.x/#toc_binding-style-attributes.';

/**
  @private
  @method getRootViews
  @param {Object} owner
*/
export function getRootViews(owner) {
  let registry = owner.lookup('-view-registry:main');

  let rootViews = [];

  Object.keys(registry).forEach(id => {
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
export function getViewId(view) {
  if (view.tagName === '') {
    return guidFor(view);
  } else {
    return view.elementId || guidFor(view);
  }
}

const VIEW_ELEMENT = symbol('VIEW_ELEMENT');

/**
  @private
  @method getViewElement
  @param {Ember.View} view
 */
export function getViewElement(view) {
  return view[VIEW_ELEMENT];
}

export function initViewElement(view) {
  view[VIEW_ELEMENT] = null;
}

export function setViewElement(view, element) {
  return view[VIEW_ELEMENT] = element;
}

const CHILD_VIEW_IDS = symbol('CHILD_VIEW_IDS');

/**
  @private
  @method getChildViews
  @param {Ember.View} view
*/
export function getChildViews(view) {
  let owner = getOwner(view);
  let registry = owner.lookup('-view-registry:main');
  return collectChildViews(view, registry);
}

export function initChildViews(view) {
  view[CHILD_VIEW_IDS] = [];
}

export function addChildView(parent, child) {
  parent[CHILD_VIEW_IDS].push(getViewId(child));
}

export function collectChildViews(view, registry) {
  let ids = [];
  let views = [];

  view[CHILD_VIEW_IDS].forEach(id => {
    let view = registry[id];

    if (view && !view.isDestroying && !view.isDestroyed && ids.indexOf(id) === -1) {
      ids.push(id);
      views.push(view);
    }
  });

  view[CHILD_VIEW_IDS] = ids;

  return views;
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

  It is only intended to be used by development tools like the Ember Inpsector
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
export const elMatches = typeof Element !== 'undefined' &&
  (Element.prototype.matches ||
   Element.prototype.matchesSelector ||
   Element.prototype.mozMatchesSelector ||
   Element.prototype.msMatchesSelector ||
   Element.prototype.oMatchesSelector ||
   Element.prototype.webkitMatchesSelector);

export function matches(el, selector) {
  return elMatches.call(el, selector);
}
