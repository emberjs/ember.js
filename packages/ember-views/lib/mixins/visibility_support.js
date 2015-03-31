/**
@module ember
@submodule ember-views
*/
import {
  Mixin,
  observer
} from "ember-metal/mixin";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";

function K() { return this; }

/**
  @class VisibilitySupport
  @namespace Ember
*/
var VisibilitySupport = Mixin.create({
  /**
    If `false`, the view will appear hidden in DOM.

    @property isVisible
    @type Boolean
    @default null
  */
  isVisible: true,

  becameVisible: K,
  becameHidden: K,

  /**
    When the view's `isVisible` property changes, toggle the visibility
    element of the actual DOM element.

    @method _isVisibleDidChange
    @private
  */
  _isVisibleDidChange: observer('isVisible', function() {
    if (this._isVisible === get(this, 'isVisible')) { return ; }
    run.scheduleOnce('render', this, this._toggleVisibility);
  }),

  _toggleVisibility() {
    var $el = this.$();
    var isVisible = get(this, 'isVisible');

    if (this._isVisible === isVisible) { return ; }

    // It's important to keep these in sync, even if we don't yet have
    // an element in the DOM to manipulate:
    this._isVisible = isVisible;

    if (!$el) { return; }

    $el.toggle(isVisible);

    if (this._isAncestorHidden()) { return; }

    if (isVisible) {
      this._notifyBecameVisible();
    } else {
      this._notifyBecameHidden();
    }
  },

  _notifyBecameVisible() {
    this.trigger('becameVisible');

    this.forEachChildView(function(view) {
      var isVisible = get(view, 'isVisible');

      if (isVisible || isVisible === null) {
        view._notifyBecameVisible();
      }
    });
  },

  _notifyBecameHidden() {
    this.trigger('becameHidden');
    this.forEachChildView(function(view) {
      var isVisible = get(view, 'isVisible');

      if (isVisible || isVisible === null) {
        view._notifyBecameHidden();
      }
    });
  },

  _isAncestorHidden() {
    var parent = get(this, 'parentView');

    while (parent) {
      if (get(parent, 'isVisible') === false) { return true; }

      parent = get(parent, 'parentView');
    }

    return false;
  }
});

export default VisibilitySupport;
