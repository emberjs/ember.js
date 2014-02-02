// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @deprecated

  An experimental `CollectionView` mixin that makes it extremely fast under
  certain circumstances, including for mobile devices.
*/
SC.CollectionFastPath = {

  //
  // ITEM VIEW CLASS/INSTANCE MANAGEMENT
  //
  initMixin: function() {
    this._indexMap = {};
    this._viewMap = {};
  },

  /**
    Returns the pool for a given example view.

    The pool is calculated based on the guid for the example view class.

    @param {SC.View} exampleView
  */
  poolForExampleView: function(exampleView) {
    var poolKey = "_pool_" + SC.guidFor(exampleView);
    if (!this[poolKey]) this[poolKey] = [];
    return this[poolKey];
  },

  /**
    Creates an item view from a given example view, configuring it with basic settings
    and the supplied attributes.

    @param {SC.View} exampleView
    @param {Hash} attrs
  */
  createItemViewFromExampleView: function(exampleView, attrs) {
    // create the example view
    var ret = this.createItemView(exampleView, null, attrs);

    // for our pooling, if it is poolable, mark the view as poolable and
    // give it a reference to its pool.
    if (ret.isPoolable) {
      ret.owningPool = this.poolForExampleView(exampleView);
    }

    // we will sometimes need to know what example view created the item view
    ret.createdFromExampleView = exampleView;

    // and now, return (duh)
    return ret;
  },

  /**
    @param {SC.View} itemView
    @param {Hash} attrs
  */
  configureItemView: function(itemView, attrs) {
    // set settings. Self explanatory.
    itemView.beginPropertyChanges();
    itemView.setIfChanged('content', attrs.content);
    itemView.setIfChanged('contentIndex', attrs.contentIndex);
    itemView.setIfChanged('parentView', attrs.parentView);
    itemView.setIfChanged('layerId', attrs.layerId);
    itemView.setIfChanged('isEnabled', attrs.isEnabled);
    itemView.setIfChanged('isSelected', attrs.isSelected);
    itemView.setIfChanged('outlineLevel', attrs.outlineLevel);
    itemView.setIfChanged('layout', attrs.layout);
    itemView.setIfChanged('disclosureState', attrs.disclosureState);
    itemView.setIfChanged('isVisibleInWindow', attrs.isVisibleInWindow);
    itemView.setIfChanged('isGroupView', attrs.isGroupView);
    itemView.setIfChanged('page', this.page);
    itemView.endPropertyChanges();
  },

  /**
    Configures a pooled view, calling `.awakeFromPool` if it is defined.

    @param {SC.View} itemView
    @param {Hash} attrs
  */
  wakePooledView: function(itemView, attrs) {
    // configure
    this.configureItemView(itemView, attrs);

    // awake from the pool, etc.
    if (itemView.awakeFromPool) itemView.awakeFromPool(itemView.owningPool, this);
  },

  /**
    Gets an item view from an example view, from a pool if possible, and otherwise
    by generating it.

    @param {SC.View} exampleView
    @param {Hash} attrs
  */
  allocateItemView: function(exampleView, attrs) {
    // we will try to get it from a pool. This will fill ret. If ret is not
    // filled, then we'll know to generate one.
    var ret;

    // if it is poolable, we just grab from the pool.
    if (exampleView.prototype.isPoolable) {
      var pool = this.poolForExampleView(exampleView);
      if (pool.length > 0) {
        ret = pool.pop();
        this.wakePooledView(ret, attrs);
      }
    }

    if (!ret) {
      ret = this.createItemViewFromExampleView(exampleView, attrs);
    }

    return ret;
  },

  /**
    Releases an item view. If the item view is pooled, it puts it into the pool;
    otherwise, this calls `.destroy()`.

    This is called for one of two purposes: to release a view that is no longer displaying,
    or to release an older cached version of a view that needed to be replaced because the
    example view changed.

    @param {SC.View} itemView
  */
  releaseItemView: function(itemView) {
    // if it is not poolable, there is not much we can do.
    if (!itemView.isPoolable) {
      itemView.destroy();
      return;
    }

    // otherwise, we need to return to view
    var pool = itemView.owningPool;
    pool.push(itemView);
    if (itemView.hibernateInPool) itemView.hibernateInPool(pool, this);
  },

  /** @private
    Returns YES if the item at the index is a group.
  */
  contentIndexIsGroup: function(view, content, index) {
    var contentDelegate = this.get("contentDelegate");

    // setup our properties
    var groupIndexes = this.get('_contentGroupIndexes'), isGroupView = NO;

    // and do our checking
    isGroupView = groupIndexes && groupIndexes.contains(index);
    if (isGroupView) isGroupView = contentDelegate.contentIndexIsGroup(this, this.get("content"), index);

    // and return
    return isGroupView;
  },

  /** @private
    Determines the example view for a content index. There are two optional parameters that will
    speed things up: `contentObject` and `isGroupView`. If you don't supply them, they must be computed.
  */
  exampleViewForItem: function(item, index) {
    var del = this.get('contentDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        key, ExampleView,
        isGroupView = this.contentIndexIsGroup(this, this.get('content'), index);

    if (isGroupView) {
      // so, if it is indeed a group view, we go that route to get the example view
      key = this.get('contentGroupExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('groupExampleView') || this.get('exampleView');
    } else {
      // otherwise, we go through the normal example view
      key = this.get('contentExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('exampleView');
    }

    return ExampleView;
  },

  /** @private
    This may seem somewhat awkward, but it is for memory performance: this fills in a hash
    YOU provide with the properties for the given content index.

    Properties include both the attributes given to the view and some `CollectionView` tracking
    properties, most importantly the exampleView.
  */
  setAttributesForItem: function(item, index, attrs) {
    var del = this.get('contentDelegate'),
        isGroupView = this.contentIndexIsGroup(this, this.get('content'), index),
        ExampleView = this.exampleViewForItem(item, index),
        content = this.get("content");

    //
    // FIGURE OUT "NORMAL" ATTRIBUTES
    //
    attrs.createdFromExampleView = ExampleView;
    attrs.parentView = this.get('containerView') || this;
    attrs.contentIndex = index;
    attrs.owner = attrs.displayDelegate = this;
    attrs.content = item;
    attrs.page = this.page;
    attrs.layerId = this.layerIdFor(index);
    attrs.isEnabled = del.contentIndexIsEnabled(this, content, index);
    attrs.isSelected = del.contentIndexIsSelected(this, content, index);
    attrs.outlineLevel = del.contentIndexOutlineLevel(this, content, index);
    attrs.disclosureState = del.contentIndexDisclosureState(this, content, index);
    attrs.isVisibleInWindow = this.get('isVisibleInWindow');
    attrs.isGroupView = isGroupView;
    attrs.layout = this.layoutForContentIndex(index);
    if (!attrs.layout) attrs.layout = ExampleView.prototype.layout;
  },

  //
  // ITEM LOADING/DOM MANAGEMENT
  //

  /** @private
    Returns mapped item views for the supplied item.
  */
  mappedViewsForItem: function(item, map) {
    if (!map) map = this._viewMap;
    return map[SC.guidFor(item)];
  },

  /** @private
    Returns the mapped view for an item at the specified index.
  */
  mappedViewForItem: function(item, idx, map) {
    if (!map) map = this._viewMap;
    var m = map[SC.guidFor(item)];
    if (!m) return undefined;
    return m[idx];
  },

  /** @private
    Maps a view to an item/index combination.
  */
  mapView: function(item, index, view, map) {
    // get the default view map if a map was not supplied
    if (!map) map = this._viewMap;

    // get the item map
    var g = SC.guidFor(item),
        imap = map[g];
    if (!imap) imap = map[g] = {_length: 0};

    // fill in the index
    imap[index] = view;
    imap._length++;
  },

  /** @private
    Unmaps a view from an item/index combination.
  */
  unmapView: function(item, index, map) {
    if (!map) map = this._viewMap;
    var g = SC.guidFor(item),
        imap = map[g];

    // return if there is nothing to do
    if (!imap) return;

    // remove
    if (imap[index]) {
      var v = imap[index];
      delete imap[index];

      imap._length--;
      if (imap._length <= 0) delete map[g];
    }
  },

  /**
    Returns the item view for the given content index.
    NOTE: THIS WILL ADD THE VIEW TO DOM TEMPORARILY (it will be cleaned if
          it is not used). As such, use sparingly.

    @param {Number} index
  */
  itemViewForContentIndex: function(index) {
    var content = this.get("content");
    if (!content) return;

    var item = content.objectAt(index);

    var exampleView = this.exampleViewForItem(item, index),
        view = this._indexMap[index];

    if (view && view.createdFromExampleView !== exampleView) {
      this.removeItemView(view);
      this.unmapView(item, index);
      view = null;
    }

    if (!view) {
      view = this.addItemView(exampleView, item, index);
    }

    return view;
  },

  /** @private
    Returns the nearest item view index to the supplied index mapped to the item.
  */
  nearestMappedViewIndexForItem: function(item, index, map) {
    var m = this.mappedViewsForItem(item, map);
    if (!m) return null;

    // keep track of nearest and the nearest distance
    var nearest = null, ndist = -1, dist = 0;

    // loop through
    for (var idx in m) {
      idx = parseInt(idx, 10);
      if (isNaN(idx)) continue;
      // get distance
      dist = Math.abs(index - idx);

      // compare to nearest distance
      if (ndist < 0 || dist < ndist) {
        ndist = dist;
        nearest = idx;
      }
    }

    return nearest;
  },

  /** @private
    Remaps the now showing views to their new indexes (if they have moved).
  */
  remapItemViews: function(nowShowing) {
    // reset the view map, but keep the old for removing
    var oldMap = this._viewMap,
        newMap = (this._viewMap = {}),
        indexMap = (this._indexMap = {}),
        mayExist = [],
        content = this.get("content"), item;

    if (!content) return;
    var itemsToAdd = this._itemsToAdd;

    // first, find items which we can (that already exist, etc.)
    nowShowing.forEach(function(idx) {
      item = content.objectAt(idx);

      // determine if we have view(s) in the old map for the item
      var possibleExistingViews = this.mappedViewsForItem(item, oldMap);
      if (possibleExistingViews) {

        // if it is the same index, we just take it. End of story.
        if (possibleExistingViews[idx]) {
          var v = possibleExistingViews[idx];
          this.unmapView(item, idx, oldMap);
          this.mapView(item, idx, v, newMap);
          indexMap[idx] = v;
        } else {
          // otherwise, we must investigate later
          mayExist.push(idx);
        }
      } else {
        // if it is in now showing but we didn't find a view, it needs to be created.
        itemsToAdd.push(idx);
      }
    }, this);

    // now there are also some items which _could_ exist (but might not!)
    for (var idx = 0, len = mayExist.length; idx < len; idx++) {
      var newIdx = mayExist[idx];
      item = content.objectAt(newIdx);
      var nearestOldIndex = this.nearestMappedViewIndexForItem(item, newIdx, oldMap),
          nearestView;

      if (!SC.none(nearestOldIndex)) {
        nearestView = this.mappedViewForItem(item, nearestOldIndex, oldMap);
        var newExampleView = this.exampleViewForItem(item, newIdx);
        if (newExampleView === nearestView.createdFromExampleView) {
          // if there is a near one, use it, and remove it from the map
          this.unmapView(item, nearestOldIndex, oldMap);
          this.mapView(item, newIdx, nearestView, newMap);
          indexMap[newIdx] = nearestView;
        } else {
          itemsToAdd.push(newIdx);
        }
      } else {
        // otherwise, we need to create it.
        itemsToAdd.push(newIdx);
      }
    }

    return oldMap;
  },

  /**
    Reloads.

    @param {SC.IndexSet} nowShowing
    @param {Boolean} scrollOnly
  */
  reloadIfNeeded: function(nowShowing, scrollOnly) {
    var content = this.get("content"), invalid;

    // we use the nowShowing to determine what should and should not be showing.
    if (!nowShowing || !nowShowing.isIndexSet) nowShowing = this.get('nowShowing');

    // we only update if this is a non-scrolling update.
    // don't worry: we'll actually update after the fact, and the invalid indexes should
    // be queued up nicely.
    if (!scrollOnly) {
      invalid = this._invalidIndexes;
      if (!invalid || !this.get('isVisibleInWindow')) return this;
      this._invalidIndexes = NO;

      // tell others we will be reloading
      if (invalid.isIndexSet && invalid.contains(nowShowing)) invalid = YES ;
      if (this.willReload) this.willReload(invalid === YES ? null : invalid);
    }

    // get arrays of items to add/remove
    var itemsToAdd = this._itemsToAdd || (this._itemsToAdd = []);

    // remap
    var oldMap = this.remapItemViews(nowShowing);

    // The oldMap has the items to remove, so supply it to processRemovals
    this.processRemovals(oldMap);

    // handle the invalid set (if it is present)
    if (invalid) {
      this.processUpdates(invalid === YES ? nowShowing : invalid);
    }

    // process items to add
    this.processAdds();

    // only clear the DOM pools if this is not during scrolling. Adding/removing is a
    // bad idea while scrolling :)
    if (!scrollOnly) this.clearDOMPools();

    // clear the lists
    itemsToAdd.length = 0;

    // and if this is a full reload, we need to adjust layout
    if (!scrollOnly) {
      var layout = this.computeLayout();
      if (layout) this.adjust(layout);
      if (this.didReload) this.didReload(invalid === YES ? null : invalid);
    }

    return this;
  },

  /**
    Loops through remove queue and removes.

    @param {Hash} oldMap
  */
  processRemovals: function(oldMap) {
    var content = this.get("content");
    for (var guid in oldMap) {
      var imap = oldMap[guid];
      for (var itemIdx in imap) {
        itemIdx = parseInt(itemIdx, 10);
        if (isNaN(itemIdx)) continue;

        var view = imap[itemIdx];

        if (this._indexMap[itemIdx] === view) delete this._indexMap[itemIdx];

        view._isInCollection = NO;
        this.removeItemView(view);
      }
    }
  },

  /** @private
    Loops through update queue and... updates.
  */
  processUpdates: function(invalid) {
    var u = this._itemsToUpdate, content = this.get("content"), item, view;
    invalid.forEach(function(idx) {
      item = content.objectAt(idx);
      if (view = this.mappedViewForItem(item, idx)) {
        if (!view._isInCollection) return;
        var ex = this.exampleViewForItem(item, idx);
        this.updateItemView(view, ex, item, idx);
      }
    }, this);
  },

  /** @private
    Loops through add queue and, well, adds.
  */
  processAdds: function() {
    var content = this.get("content");

    var add = this._itemsToAdd, idx, len = add.length, itemIdx, item;
    for (idx = 0; idx < len; idx++) {
      itemIdx = add[idx]; item = content.objectAt(itemIdx);

      // get example view and create item view
      var exampleView = this.exampleViewForItem(item, itemIdx);
      var view = this.addItemView(exampleView, item, itemIdx);
    }
  },

  /** @private
    Clear all DOM pools.
  */
  clearDOMPools: function() {
    var pools = this._domPools || (this._domPools = {});
    for (var p in pools) {
      this.clearDOMPool(pools[p]);
    }
  },

  /**
    @type Number
    @default 10
  */
  domPoolSize: 10,

  /** @private
    Clears a specific DOM pool.
  */
  clearDOMPool: function(pool) {
    var idx, len = pool.length, item;

    // we skip one because there is a buffer area of one while scrolling
    for (idx = this.domPoolSize; idx < len; idx++) {
      item = pool[idx];

      // remove from DOM
      this.removeChild(item);

      // release the item
      this.releaseItemView(item);
    }

    // pool is cleared.
    pool.length = Math.min(pool.length, this.domPoolSize);
  },

  /** @private
    Returns the DOM pool for the given exampleView.
  */
  domPoolForExampleView: function(exampleView) {
    var pools = this._domPools || (this._domPools = {}), guid = SC.guidFor(exampleView);
    var pool = pools[guid];
    if (!pool) pool = pools[guid] = [];
    return pool;
  },

  /** @private
    Tries to find an item for the given example view in a dom pool.
    If one could not be found, returns `null`.
  */
  itemFromDOMPool: function(exampleView) {
    var pool = this.domPoolForExampleView(exampleView);
    if (pool.length < 1) return null;
    var view = pool.shift();
    if (view.wakeFromDOMPool) view.wakeFromDOMPool();
    return view;
  },

  /** @private
    Sends a view to a DOM pool.
  */
  sendToDOMPool: function(view) {
    var pool = this.domPoolForExampleView(view.createdFromExampleView);
    pool.push(view);
    var f = view.get("frame");
    view.adjust({ top: -f.height });
    view.set("layerId", SC.guidFor(view));
    if (view.sleepInDOMPool) view.sleepInDOMPool();
  },

  /** @private
    Adds an item view (grabbing the actual item from one of the pools if possible).
  */
  addItemView: function(exampleView, object, index) {
    var view, attrs = this._TMP_ATTRS || (this._TMP_ATTRS = {});

    // in any case, we need attributes
    this.setAttributesForItem(object, index, attrs);

    // try to get from DOM pool first
    if (view = this.itemFromDOMPool(exampleView)) {
      // set attributes
      this.configureItemView(view, attrs);

      // set that it is in the collection
      view._isInCollection = YES;

      // add to view map (if not used, it will be removed)
      this.mapView(object, index, view);
      this._indexMap[index] = view;

      // and that should have repositioned too
      return view;
    }

    // otherwise, just allocate a view
    view = this.allocateItemView(exampleView, attrs);

    // and then, add it
    this.appendChild(view);

    // set that it is in the collection.
    view._isInCollection = YES;

    // add to view map (if not used, it will be removed)
    this.mapView(object, index, view);
    this._indexMap[index] = view;

    return view;
  },

  /** @private
    Removes an item view.
  */
  removeItemView: function(current) {
    if (current.get("layerIsCacheable")) {
      this.sendToDOMPool(current);
    } else {
      this.removeChild(current);
    }
    current._isInCollection = NO;
  },

  /**
    Updates the specified item view. If the view is not "layer cacheable" or the
    example view has changed, it will be redrawn.

    Otherwise, nothing will happen.
  */
  updateItemView: function(current, exampleView, object, index) {
    if (!current.get("layerIsCacheable") || current.createdFromExampleView !== exampleView) {
      // unmap old and remove
      this.unmapView(current, index);
      delete this._indexMap[index];
      this.removeItemView(current, object, index);

      // add new and map
      var newView = this.addItemView(exampleView, object, index);
    } else {
      var attrs = this._TMP_ATTRS || (this._TMP_ATTRS = {});

      this.setAttributesForItem(object, index, attrs);
      this.configureItemView(current, attrs);
    }
  },


  /** @private
    Tells `ScrollView` that this should receive live updates during touch scrolling.
    We are so fast, aren't we?
  */
  _lastTopUpdate: 0,

  /** @private */
  _lastLeftUpdate: 0,

  /** @private */
  _tolerance: 100,

  /** @private */
  touchScrollDidChange: function(left, top) {
    // prevent getting too many in close succession.
    if (Date.now() - this._lastTouchScrollTime < 25) return;

    var clippingFrame = this.get('clippingFrame');

    var cf = this._inScrollClippingFrame || (this._inScrollClippingFrame = {x: 0, y: 0, width: 0, height: 0});
    cf.x = clippingFrame.x; cf.y = clippingFrame.y; cf.width = clippingFrame.width; cf.height = clippingFrame.height;

    // update
    cf.x = left;
    cf.y = top;

    var r = this.contentIndexesInRect(cf);
    if (!r) return; // no rect, do nothing.

    var len = this.get('length'),
        max = r.get('max'), min = r.get('min');

    if (max > len || min < 0) {
      r = r.copy();
      r.remove(len, max-len).remove(min, 0-min).freeze();
    }

    if (this._lastNowShowing) {
      if (r.contains(this._lastNowShowing) && this._lastNowShowing.contains(r)) return;
    }
    this._lastNowShowing = r;
    this.reloadIfNeeded(r, YES);

    this._lastTouchScrollTime = Date.now();
  }

};
