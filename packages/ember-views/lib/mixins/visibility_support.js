/**
 @module ember
 @submodule ember-views
*/
import {
  Mixin,
  observer
} from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';

function K() { return this; }

/**
 @class VisibilitySupport
 @namespace Ember
 @public
*/
var VisibilitySupport = Mixin.create({
  /**
    If `false`, the view will appear hidden in DOM.

    @property isVisible
    @type Boolean
    @default null
    @public
  */
  isVisible: true,

  becameVisible: K,
  becameHidden: K,
  willBecomeVisible: K,
  willBecomeHidden: K,

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

  /**
    Toggle visibility of the view, firing event hooks before and after the element visibility is changed
    @private
  */
  _toggleVisibility() {
    var $el = this.$();
    var isVisible = get(this, 'isVisible');

    if (this._isVisible === isVisible) { return ; }

    // It's important to keep these in sync, even if we don't yet have
    // an element in the DOM to manipulate:
    this._isVisible = isVisible;

    if (!$el) { return; }

    if (isVisible) {
      this._notifyVisibilityChange('willBecomeVisible');
    } else {
      this._notifyVisibilityChange('willBecomeHidden');
    }

    $el.toggle(isVisible);

    if (this._isAncestorHidden()) { return; }

    if (isVisible) {
      this._notifyVisibilityChange('becameVisible');
    } else {
      this._notifyVisibilityChange('becameHidden');
    }
  },

  /**
    Trigger an event on the view and its visible children when visibility is changing
    @param event The name of the event, such as `becameHidden` or `willBecomeVisible`
    @private
  */
  _notifyVisibilityChange(event) {
    this.trigger(event);

    this.forEachChildView(function(view) {
      var isVisible = get(view, 'isVisible');

      if (isVisible || isVisible === null) {
        view._notifyVisibilityChange(event);
      }
    });
  },

  /**
    Check to see if any of the view's parents are hidden (`isVisible` === false)
    @returns {boolean} True if an ancestor is hidden
    @private
  */
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
