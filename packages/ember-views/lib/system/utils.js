/* globals Element */

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
  range.setStartBefore(bounds.firstNode());
  range.setEndAfter(bounds.lastNode());

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
