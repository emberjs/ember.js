/**
@module ember
@submodule ember-views
*/

export function isSimpleClick(event) {
  var modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey;
  var secondaryClick = event.which > 1; // IE9 may return undefined

  return !modifier && !secondaryClick;
}

/**
  @private
  @method getViewRange
  @param {Ember.View} view
*/
function getViewRange(view) {
  var range = document.createRange();
  range.setStartBefore(view._renderNode.firstNode);
  range.setEndAfter(view._renderNode.lastNode);
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
  var range = getViewRange(view);
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
  var range = getViewRange(view);
  return range.getBoundingClientRect();
}
