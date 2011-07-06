// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-views/views/view');
var get = SC.get, set = SC.set, meta = SC.meta;

SC.ContainerView = SC.View.extend({
  renderToBuffer: function() {
    var ret = this._super.apply(this, arguments);

    get(this, 'childViews').addArrayObserver(this, {
      willChange: 'childViewsWillChange',
      didChange: 'childViewsDidChange'
    });

    return ret;
  },

  render: function(buffer) {
    this.forEachChildView(function(view) {
      view.renderToBuffer(buffer);
    });
  },

  destroy: function() {
    get(this, 'childViews').forEach(this.removeFromParent, this);
    this._super();
  },

  /**
    When a child view is removed, 
  **/
  childViewsWillChange: function(views, start, removed) {
    var element = get(this, 'element'), view, viewMeta;
    var buffer = meta(this)['SC.View'].buffer;

    if (element || buffer) {
      for (var i=start; i<start+removed; i++) {
        if (get(views[i], 'element')) { views[i].destroyElement(); }
      }
    }
  },

  childViewsDidChange: function(views, start, removed, added) {
    var element = get(this, 'element'), view;
    var buffer = meta(this)['SC.View'].buffer;
    var len = get(views, 'length'), startWith, prev;

    if (added === 0) return;

    if (buffer) {
      if (start === 0) {
        view = views[start];
        startWith = start + 1;
        view.renderToBuffer(buffer, 'prepend');
      } else {
        view = views[start - 1];
        startWith = start;
      }

      for (var i=startWith; i<start+added; i++) {
        prev = view;
        view = views[i];
        prevBuffer = meta(prev)['SC.View'].buffer;
        view.renderToBuffer(prevBuffer, 'insertAfter');
      }
    } else {
      prev = start === 0 ? null : views[start-1];

      for (var i=start; i<start+added; i++) {
        view = views[i];
        this._scheduleInsertion(view, prev);
        prev = view;
      }
    }
  },

  _scheduleInsertion: function(view, prev) {
    var parent = this;

    view._insertElementLater(function() {
      if (prev) {
        prev.$().after(view.$());
      } else {
        parent.$().prepend(view.$());
      }
    });
  },
});

/**
  @class
  @since SproutCore 2.0
  @extends SC.View
*/
SC.CollectionView = SC.ContainerView.extend(
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

  init: function() {
    var ret = this._super();
    this._contentDidChange();
    return ret;
  },

  _contentWillChange: function() {
    var content = this.get('content');

    if (content) { content.removeArrayObserver(this); }
    this.arrayWillChange(content, 0, get(content, 'length'));
  }.observesBefore('content'),

  /**
    @private

    Check to make sure that the content has changed, and if so,
    update the children directly. This is always scheduled
    asynchronously, to allow the element to be created before
    bindings have synchronized and vice versa.
  */
  _contentDidChange: function() {
    var content = get(this, 'content');

    if (content) { content.addArrayObserver(this); }
    this.arrayDidChange(content, 0, null, get(content, 'length'));
  }.observes('content'),

  destroy: function() {
    var content = get(this, 'content');
    if (content) { content.removeArrayObserver(this); }
    set(this, 'content', null);
    return this._super();
  },

  arrayWillChange: function(content, start, removedCount) {
    // If the contents were empty before and this template collection has an
    // empty view remove it now.
    var emptyView = get(this, 'emptyView');
    if (emptyView && !SC.Object.detect(emptyView)) {
      emptyView.removeFromParent();
    }

    // Loop through child views that correspond with the removed items.
    // Note that we loop from the end of the array to the beginning because
    // we are mutating it as we go.
    var childViews = get(this, 'childViews'), childView, idx, len;

    len = get(childViews, 'length');
    for (idx = start + removedCount - 1; idx >= start; idx--) {
      childViews[idx].destroy();
    }
  },

  /**
    Called when a mutation to the underlying content array occurs.

    This method will replay that mutation against the views that compose the
    SC.CollectionView, ensuring that the view reflects the model.

    This array observer is added in contentDidChange.

    @param {Array} addedObjects
      the objects that were added to the content

    @param {Array} removedObjects
      the objects that were removed from the content

    @param {Number} changeIndex
      the index at which the changes occurred
  */
  arrayDidChange: function(content, start, removed, added) {
    var itemViewClass = get(this, 'itemViewClass'),
        childViews = get(this, 'childViews'),
        addedViews = [], view, item, idx, len;

    len = content ? get(content, 'length') : 0;
    if (len) {
      for (idx = start; idx < start+added; idx++) {
        item = content.objectAt(idx);

        view = this.createChildView(itemViewClass, {
          content: item,
          contentIndex: idx
        });

        addedViews.push(view);
      }

      childViews.replace(start, 0, addedViews);
    } else {
      var emptyView = get(this, 'emptyView');
      if (get(childViews, 'length') === 0 && emptyView) {
        if (SC.Object.detect(emptyView)) {
          emptyView = this.createChildView(emptyView);
        }

        set(this, 'emptyView', emptyView);
        childViews.replace(0, get(childViews, 'length'), [emptyView])
      }
    }
  }
});

