// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/collection');
sc_require('mixins/collection_row_delegate');

/** @class

  A list view renders vertical lists of items.  It is a specialized form of
  collection view that is simpler than the table view, but more refined than
  a generic collection.

  You can use a list view just like a collection view, except that often you
  also should provide a default rowHeight.  Setting this value will allow
  the ListView to optimize its rendering.

  ## Variable Row Heights

  Normally you set the row height through the rowHeight property.  You can
  also support custom row heights by implementing the
  contentCustomRowHeightIndexes property to return an index set.

  ## Using ListView with Very Large Data Sets

  ListView implements incremental rendering, which means it will only render
  HTML for the items that are current visible on the screen.  You can use it
  to efficiently render lists with 100K+ items very efficiently.

  If you need to work with very large lists of items, however, be aware that
  calculate variable rows heights can become very expensive since the list
  view will essentially have to iterate over every item in the collection to
  collect its row height.

  To work with very large lists, you should consider making your row heights
  uniform.  This will allow the list view to efficiently render content
  without worrying about the overall performance.

  Alternatively, you may want to consider overriding the
  offsetForRowAtContentIndex() and heightForRowAtContentIndex() methods to
  perform some faster calculations that do not require inspecting every
  item in the collection.

  Note that row heights and offsets are cached so once they are calculated
  the list view will be able to display very quickly.

  ## Dropping on an Item

  When the list view is configured to accept drags and drops onto its items, it
  will set the isDropTarget property on the target item accordingly.  This
  allows you to modify the appearance of the drop target list item accordingly
  (@see SC.ListItemView#isDropTarget).

  @extends SC.CollectionView
  @extends SC.CollectionRowDelegate
  @since SproutCore 1.0
*/
// (Can we also have an 'estimate row heights' property that will simply
// cheat for very long data sets to make rendering more efficient?)
SC.ListView = SC.CollectionView.extend(SC.CollectionRowDelegate,
/** @scope SC.ListView.prototype */ {

  /**
    @type Array
    @default ['sc-list-view']
    @see SC.View#classNames
  */
  classNames: ['sc-list-view'],

  /**
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: YES,

  /** @private SC.CollectionView.prototype */
  exampleView: SC.ListItemView,

  /**
    If set to YES, the default theme will show alternating rows
    for the views this ListView created through exampleView property.

    @type Boolean
    @default NO
  */
  showAlternatingRows: NO,


  // ..........................................................
  // METHODS
  //

  /** @private */
  render: function(context, firstTime) {
    context.setClass('alternating', this.get('showAlternatingRows'));

    return sc_super();
  },


  // ..........................................................
  // COLLECTION ROW DELEGATE SUPPORT
  //

  /**
    @field
    @type Object
    @observes 'delegate'
    @observes 'content'
  */
  rowDelegate: function() {
    var del = this.delegate,
        content = this.get('content');

    return this.delegateFor('isCollectionRowDelegate', del, content);
  }.property('delegate', 'content').cacheable(),

  /** @private
    Whenever the rowDelegate changes, begin observing important properties
  */
  _sclv_rowDelegateDidChange: function() {
    var last = this._sclv_rowDelegate,
        del  = this.get('rowDelegate'),
        func = this._sclv_rowHeightDidChange,
        func2 = this._sclv_customRowHeightIndexesDidChange;

    if (last === del) return this; // nothing to do
    this._sclv_rowDelegate = del;

    // last may be null on a new object
    if (last) {
      last.removeObserver('rowHeight', this, func);
      last.removeObserver('customRowHeightIndexes', this, func2);
    }

    if (!del) {
      throw new Error("Internal Inconsistancy: ListView must always have CollectionRowDelegate");
    }

    del.addObserver('rowHeight', this, func);
    del.addObserver('customRowHeightIndexes', this, func2);
    this._sclv_rowHeightDidChange()._sclv_customRowHeightIndexesDidChange();
    return this ;
  }.observes('rowDelegate'),

  /** @private
    called whenever the rowHeight changes.  If the property actually changed
    then invalidate all row heights.
  */
  _sclv_rowHeightDidChange: function() {
    var del = this.get('rowDelegate'),
        height = del.get('rowHeight'),
        indexes;

    if (height === this._sclv_rowHeight) return this; // nothing to do
    this._sclv_rowHeight = height;

    indexes = SC.IndexSet.create(0, this.get('length'));
    this.rowHeightDidChangeForIndexes(indexes);
    return this ;
  },

  /** @private
    called whenever the customRowHeightIndexes changes.  If the property
    actually changed then invalidate affected row heights.
  */
  _sclv_customRowHeightIndexesDidChange: function() {
    var del     = this.get('rowDelegate'),
        indexes = del.get('customRowHeightIndexes'),
        last    = this._sclv_customRowHeightIndexes,
        func    = this._sclv_customRowHeightIndexesContentDidChange;

    // nothing to do
    if ((indexes===last) || (last && last.isEqual(indexes))) return this;

    // if we were observing the last index set, then remove observer
    if (last && this._sclv_isObservingCustomRowHeightIndexes) {
      last.removeObserver('[]', this, func);
    }

    // only observe new index set if it exists and it is not frozen.
    if (this._sclv_isObservingCustomRowHeightIndexes = indexes && !indexes.get('isFrozen')) {
      indexes.addObserver('[]', this, func);
    }

    this._sclv_customRowHeightIndexesContentDidChange();
    return this ;
  },

  /** @private
    Called whenever the customRowHeightIndexes set is modified.
  */
  _sclv_customRowHeightIndexesContentDidChange: function() {
    var del     = this.get('rowDelegate'),
        indexes = del.get('customRowHeightIndexes'),
        last    = this._sclv_customRowHeightIndexes,
        changed;

    // compute the set to invalidate.  the union of cur and last set
    if (indexes && last) {
      changed = indexes.copy().add(last);
    } else changed = indexes || last ;
    this._sclv_customRowHeightIndexes = indexes ? indexes.frozenCopy() : null;

    // invalidate
    this.rowHeightDidChangeForIndexes(changed);
    return this ;
  },


  // ..........................................................
  // ROW PROPERTIES
  //

  /**
    Returns the top offset for the specified content index.  This will take
    into account any custom row heights and group views.

    @param {Number} idx the content index
    @returns {Number} the row offset
  */
  rowOffsetForContentIndex: function(idx) {
    if (idx === 0) return 0 ; // fastpath

    var del       = this.get('rowDelegate'),
        rowHeight = del.get('rowHeight'),
        rowSpacing, ret, custom, cache, delta, max, content ;

    ret = idx * rowHeight;

    rowSpacing = this.get('rowSpacing');
		if(rowSpacing){
      ret += idx * rowSpacing;
    }

    if (del.customRowHeightIndexes && (custom=del.get('customRowHeightIndexes'))) {

      // prefill the cache with custom rows.
      cache = this._sclv_offsetCache;
      if (!cache) {
        cache = [];
        delta = max = 0 ;
        custom.forEach(function(idx) {
          delta += this.rowHeightForContentIndex(idx)-rowHeight;
          cache[idx+1] = delta;
          max = idx ;
        }, this);
        this._sclv_max = max+1;
        // moved down so that the cache is not marked as initialized until it actually is
        this._sclv_offsetCache = cache;
      }

      // now just get the delta for the last custom row before the current
      // idx.
      delta = cache[idx];
      if (delta === undefined) {
        delta = cache[idx] = cache[idx-1];
        if (delta === undefined) {
          max = this._sclv_max;
          if (idx < max) max = custom.indexBefore(idx)+1;
          delta = cache[idx] = cache[max] || 0;
        }
      }

      ret += delta ;
    }

    return ret ;
  },

  /**
    Returns the row height for the specified content index.  This will take
    into account custom row heights and group rows.

    @param {Number} idx content index
    @returns {Number} the row height
  */
  rowHeightForContentIndex: function(idx) {
    var del = this.get('rowDelegate'),
        ret, cache, content, indexes;

    if (del.customRowHeightIndexes && (indexes=del.get('customRowHeightIndexes'))) {
      cache = this._sclv_heightCache ;
      if (!cache) {
        cache = [];
        content = this.get('content');
        indexes.forEach(function(idx) {
          cache[idx] = del.contentIndexRowHeight(this, content, idx);
        }, this);
        // moved down so that the cache is not marked as initialized until it actually is
        this._sclv_heightCache = cache;
      }

      ret = cache[idx];
      if (ret === undefined) ret = del.get('rowHeight');
    } else ret = del.get('rowHeight');

    return ret ;
  },

  /**
    Call this method whenever a row height has changed in one or more indexes.
    This will invalidate the row height cache and reload the content indexes.
    Pass either an index set or a single index number.

    This method is called automatically whenever you change the rowHeight
    or customRowHeightIndexes properties on the collectionRowDelegate.

    @param {SC.IndexSet|Number} indexes
    @returns {SC.ListView} receiver
  */
  rowHeightDidChangeForIndexes: function(indexes) {
    var len = this.get('length');

    // clear any cached offsets
    this._sclv_heightCache = this._sclv_offsetCache = null;

    // find the smallest index changed; invalidate everything past it
    if (indexes && indexes.isIndexSet) indexes = indexes.get('min');
    this.reload(SC.IndexSet.create(indexes, len-indexes));

    // If the row height changes, our entire layout needs to change.
    this.invokeOnce('adjustLayout');
    return this ;
  },

  // ..........................................................
  // SUBCLASS IMPLEMENTATIONS
  //

  /**
    The layout for a ListView is computed from the total number of rows
    along with any custom row heights.
  */
  computeLayout: function() {
    // default layout
    var ret = this._sclv_layout;
    if (!ret) ret = this._sclv_layout = {};
    ret.minHeight = this.rowOffsetForContentIndex(this.get('length'));
    this.set('calculatedHeight', ret.minHeight);
    return ret ;
  },

  /**
    Computes the layout for a specific content index by combining the current
    row heights.

    @param {Number} contentIndex
    @returns {Hash} layout hash for the index provided
  */
  layoutForContentIndex: function(contentIndex) {
    var del = this.get('rowDelegate');

    return {
      top: this.rowOffsetForContentIndex(contentIndex),
      height: this.rowHeightForContentIndex(contentIndex) - del.get('rowPadding') * 2,
      left: 0,
      right: 0
    };
  },

  /**
    Override to return an IndexSet with the indexes that are at least
    partially visible in the passed rectangle.  This method is used by the
    default implementation of computeNowShowing() to determine the new
    nowShowing range after a scroll.

    Override this method to implement incremental rendering.

    The default simply returns the current content length.

    @param {Rect} rect the visible rect or a point
    @returns {SC.IndexSet} now showing indexes
  */
  contentIndexesInRect: function(rect) {
    var rowHeight = this.get('rowDelegate').get('rowHeight'),
        top       = SC.minY(rect),
        bottom    = SC.maxY(rect),
        height    = rect.height || 0,
        len       = this.get('length'),
        offset, start, end;

    // estimate the starting row and then get actual offsets until we are
    // right.
    start = (top - (top % rowHeight)) / rowHeight;
    offset = this.rowOffsetForContentIndex(start);

    // go backwards until top of row is before top edge
    while(start>0 && offset>top) {
      start--;
      offset -= this.rowHeightForContentIndex(start);
    }

    // go forwards until bottom of row is after top edge
    offset += this.rowHeightForContentIndex(start);
    while(start<len && offset<=top) {
      start++;
      offset += this.rowHeightForContentIndex(start);
    }
    if (start<0) start = 0;
    if (start>=len) start=len;


    // estimate the final row and then get the actual offsets until we are
    // right. - look at the offset of the _following_ row
    end = start + ((height - (height % rowHeight)) / rowHeight) ;
    if (end > len) end = len;
    offset = this.rowOffsetForContentIndex(end);

    // walk backwards until top of row is before or at bottom edge
    while(end>=start && offset>=bottom) {
      end--;
      offset -= this.rowHeightForContentIndex(end);
    }

    // go forwards until bottom of row is after bottom edge
    offset += this.rowHeightForContentIndex(end);
    while(end<len && offset<bottom) {
      end++;
      offset += this.rowHeightForContentIndex(end);
    }

    end++; // end should be after start

    if (end<start) end = start;
    if (end>len) end = len ;

    // convert to IndexSet and return
    return SC.IndexSet.create(start, end-start);
  },


  // ..........................................................
  // DRAG AND DROP SUPPORT
  //

  /**
    Default view class used to draw an insertion point, which uses CSS
    styling to show a horizontal line.

    This view's position (top & left) will be automatically adjusted to the
    point of insertion.

    @field
    @type SC.View
  */
  insertionPointView: SC.View.extend({
    classNames: 'sc-list-insertion-point',

    layout: { height: 2 },

    /** @private */
    render: function(context, firstTime) {
      if (firstTime) context.push('<div class="anchor"></div>');
    }
  }),

  /**
    Default implementation will show an insertion point
    @see SC.CollectionView#showInsertionPoint
  */
  showInsertionPoint: function (itemView, dropOperation) {
    // FAST PATH: If we're dropping on the item view itself... (Note: support for this
    // should be built into CollectionView's calling method and not the unrelated method
    // for showing an insertion point.)
    if (dropOperation & SC.DROP_ON) {
      if (itemView && itemView !== this._lastDropOnView) {
        this.hideInsertionPoint();

        // If the drag is supposed to drop onto an item, notify the item that it
        // is the current target of the drop.
        itemView.set('isDropTarget', YES);

        // Track the item so that we can clear isDropTarget when the drag changes;
        // versus having to clear it from all items.
        this._lastDropOnView = itemView;
      }
      return;
    }

    // Otherwise, we're actually inserting.

    // TODO: CollectionView's notes on showInsertionPoint specify that if no itemView
    // is passed, this should try to get the last itemView. (Note that ListView's
    // itemViewForContentIndex creates a new view on demand, so make sure that we
    // have content items before getting the last view.) This is a change in established
    // behavior however, so proceed carefully.

    // If there was an item that was the target of the drop previously, be
    // sure to clear it.
    if (this._lastDropOnView) {
      this._lastDropOnView.set('isDropTarget', NO);
      this._lastDropOnView = null;
    }

    var len = this.get('length'),
        index, level, indent;

    // Get values from itemView, if present.
    if (itemView) {
      index = itemView.get('contentIndex');
      level = itemView.get('outlineLevel');
      indent = itemView.get('outlineIndent');
    }
    // Set defaults.
    index = index || 0;
    if (SC.none(level)) level = -1;
    indent = indent || 0;

    // Show item indented if we are inserting at the end and the last item
    // is a group item.  This is a special case that should really be
    // converted into a more general protocol.
    if ((index >= len) && index > 0) {
      var previousItem = this.itemViewForContentIndex(len - 1);
      if (previousItem.get('isGroupView')) {
        level = 1;
        indent = previousItem.get('outlineIndent');
      }
    }

    // Get insertion point.
    var insertionPoint = this._insertionPointView;
    if (!insertionPoint) {
      insertionPoint = this._insertionPointView = this.get('insertionPointView').create();
    }

    // Calculate where it should go.
    var itemViewLayout = itemView ? itemView.get('layout') : { top: 0, left: 0 },
        top, left;
    top = itemViewLayout.top;
    if (dropOperation & SC.DROP_AFTER) top += itemViewLayout.height;
    left = ((level + 1) * indent) + 12;

    // Put it there.
    insertionPoint.adjust({ top: top, left: left });
    this.appendChild(insertionPoint);
  },

  /** @see SC.CollectionView#hideInsertionPoint */
  hideInsertionPoint: function() {
    // If there was an item that was the target of the drop previously, be
    // sure to clear it.
    if (this._lastDropOnView) {
      this._lastDropOnView.set('isDropTarget', NO);
      this._lastDropOnView = null;
    }

    var view = this._insertionPointView;
    if (view) view.removeFromParent().destroy();
    this._insertionPointView = null;
  },

  /**
    Compute the insertion index for the passed location.  The location is
    a point, relative to the top/left corner of the receiver view.  The return
    value is an index plus a dropOperation, which is computed as such:

      - if outlining is not used and you are within 5px of an edge, DROP_BEFORE
        the item after the edge.
      - if outlining is used and you are within 5px of an edge and the previous
        item has a different outline level then the next item, then DROP_AFTER
        the previous item if you are closer to that outline level.
      - if dropOperation = SC.DROP_ON and you are over the middle of a row, then
        use DROP_ON.

    @see SC.CollectionView.insertionIndexForLocation
  */
  insertionIndexForLocation: function(loc, dropOperation) {
    var locRect = {x:loc.x, y:loc.y, width:1, height:1},
        indexes = this.contentIndexesInRect(locRect),
        index   = indexes.get('min'),
        len     = this.get('length'),
        min, max, diff, clevel, cindent, plevel, pindent, itemView, pgroup;

    // if there are no indexes in the rect, then we need to either insert
    // before the top item or after the last item.  Figure that out by
    // computing both.
    if (SC.none(index) || index < 0) {
      if ((len === 0) || (loc.y <= this.rowOffsetForContentIndex(0))) index = 0;
      else if (loc.y >= this.rowOffsetForContentIndex(len)) index = len;
    }

    // figure the range of the row the location must be within.
    min = this.rowOffsetForContentIndex(index);
    max = min + this.rowHeightForContentIndex(index);

    // now we know which index we are in.  if dropOperation is DROP_ON, figure
    // if we can drop on or not.
    if (dropOperation == SC.DROP_ON) {
      // editable size - reduce height by a bit to handle dropping
      if (this.get('isEditable')) diff = Math.min(Math.floor((max - min) * 0.2), 5);
      else diff = 0;

      // if we're inside the range, then DROP_ON
      if (loc.y >= (min + diff) || loc.y <= (max + diff)) {
        return [index, SC.DROP_ON];
      }
    }

    // finally, let's decide if we want to actually insert before/after.  Only
    // matters if we are using outlining.
    if (index>0) {

      itemView = this.itemViewForContentIndex(index-1);
      pindent  = (itemView ? itemView.get('outlineIndent') : 0) || 0;
      plevel   = itemView ? itemView.get('outlineLevel') : 0;

      if (index<len) {
        itemView = this.itemViewForContentIndex(index);
        clevel   = itemView ? itemView.get('outlineLevel') : 0;
        cindent  = (itemView ? itemView.get('outlineIndent') : 0) || 0;
        cindent  *= clevel;
      } else {
        clevel = itemView.get('isGroupView') ? 1 : 0; // special case...
        cindent = pindent * clevel;
      }

      pindent  *= plevel;

      // if indent levels are different, then try to figure out which level
      // it should be on.
      if ((clevel !== plevel) && (cindent !== pindent)) {

        // use most inner indent as boundary
        if (pindent > cindent) {
          index--;
          dropOperation = SC.DROP_AFTER;
        }
      }
    }

    // we do not support dropping before a group item.  If dropping before
    // a group item, always try to instead drop after the previous item.  If
    // the previous item is also a group then, well, dropping is just not
    // allowed.  Note also that dropping at 0, first item must not be group
    // and dropping at length, last item must not be a group
    //
    if (dropOperation === SC.DROP_BEFORE) {
      itemView = (index<len) ? this.itemViewForContentIndex(index) : null;
      if (!itemView || itemView.get('isGroupView')) {
        if (index>0) {
          itemView = this.itemViewForContentIndex(index-1);

          // don't allow a drop if the previous item is a group view and we're
          // insert before the end.  For the end, allow the drop if the
          // previous item is a group view but OPEN.
          if (!itemView.get('isGroupView') || (itemView.get('disclosureState') === SC.BRANCH_OPEN)) {
            index = index-1;
            dropOperation = SC.DROP_AFTER;
          } else index = -1;

        } else index = -1;
      }

      if (index<0) dropOperation = SC.DRAG_NONE ;
    }

    // return whatever we came up with
    return [index, dropOperation];
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private */
  init: function() {
    sc_super();
    this._sclv_rowDelegateDidChange();
  }

});
