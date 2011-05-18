// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-views/views/view');

/**
  @class
  @since SproutCore 2.0
  @extends SC.View
*/
SC.CollectionView = SC.View.extend(
/** @scope SC.CollectionView.prototype */ {

  /**
    A list of items to be displayed by the SC.CollectionView.

    @type SC.Array
    @default null
  */
  content: null,

  /**
    An optional view to display if content is set to an empty array.

    @type SC.View
    @default null
  */
  emptyView: null,

  /**
    @type SC.View
    @default SC.View
  */
  itemViewClass: SC.View,

  /**
    @private

    When the view is initialized, set up array observers on the content array.

    @returns {SC.TemplateCollectionView}
  */
  init: function() {
    var collectionView = sc_super();
    this._sctcv_contentDidChange();
    return collectionView;
  },

  /**
    @private

    In case a default content was set, trigger the child view creation
    as soon as the empty layer was created
  */
  didCreateElement: function() {
    var content = this.get('content');
    if (content) {
      this.arrayContentDidChange(0, 0, content.get('length'));
    }
  },

  /**
    @private

    When the content property of the collection changes, remove any existing
    child views and observers, then set up an observer on the new content, if
    needed.
  */
  _sctcv_contentDidChange: function() {
    this.$().empty();

    var oldContent = this._content,
        content = this.get('content'),
        oldLen = 0, newLen = 0;

    if (oldContent) {
      oldContent.removeArrayObservers({
        target: this,
        willChange: 'arrayContentWillChange',
        didChange: 'arrayContentDidChange'
      });

      oldLen = oldContent.get('length');
    }

    if (content) {
      content.addArrayObservers({
        target: this,
        willChange: 'arrayContentWillChange',
        didChange: 'arrayContentDidChange'
      });

      newLen = content.get('length');
    }

    this.arrayContentWillChange(0, oldLen, newLen);
    this._content = this.get('content');
    this.arrayContentDidChange(0, oldLen, newLen);
  }.observes('content'),

  destroy: function() {
    this.set('content', null);
    return sc_super();
  },

  arrayContentWillChange: function(start, removedCount, addedCount) {
    if (!this.get('element')) { return; }

    // If the contents were empty before and this template collection has an empty view
    // remove it now.
    var emptyView = this.get('emptyView');
    if (emptyView && !emptyView.isClass) {
      emptyView.removeFromParent();
    }

    // Loop through child views that correspond with the removed items.
    // Note that we loop from the end of the array to the beginning because
    // we are mutating it as we go.
    var childViews = this.get('childViews'), childView, idx, len;

    len = childViews.get('length');
    for (idx = start + removedCount - 1; idx >= start; idx--) {
      childViews[idx].destroy();
    }
  },

  /**
    Called when a mutation to the underlying content array occurs.

    This method will replay that mutation against the views that compose the
    SC.CollectionView, ensuring that the view reflects the model.

    This array observer is added in contentDidChange.

    @param {Array} addedObjects the objects that were added to the content
    @param {Array} removedObjects the objects that were removed from the content
    @param {Number} changeIndex the index at which the changes occurred
  */
  arrayContentDidChange: function(start, removedCount, addedCount) {
    if (!this.get('element')) { return; }

    var content = this.get('content'),
        itemViewClass = this.get('itemViewClass'),
        childViews = this.get('childViews'),
        addedViews = [],
        renderFunc, view, childView, itemOptions, elem,
        insertAtElement, item, itemElem, idx, len;

    elem = this.$();

    if (content) {
      var addedObjects = content.slice(start, start+addedCount);

      childView = childViews.objectAt(start - 1);
      insertAtElement = childView ? childView.$() : null;

      len = addedObjects.get('length');

      for (idx = 0; idx < len; idx++) {
        item = addedObjects.objectAt(idx);
        view = this.createChildView(itemViewClass, {
          content: item
        });

        itemElem = view.createElement().$();
        if (!insertAtElement) {
          elem.append(itemElem);
        } else {
          itemElem.insertAfter(insertAtElement);
        }
        insertAtElement = itemElem;

        addedViews.push(view);
      }

      childViews.replace(start, 0, addedViews);
    }

    var emptyView = this.get('emptyView');
    if (childViews.get('length') === 0 && emptyView) {
      if (emptyView.isClass) {
        emptyView = this.createChildView(emptyView);
      }

      this.set('emptyView', emptyView);
      emptyView.createElement().$().appendTo(elem);
      this.childViews = [emptyView];
    }
  }
});
