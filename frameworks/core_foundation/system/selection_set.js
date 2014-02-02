// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  A SelectionSet contains a set of objects that represent the current
  selection.  You can select objects by either adding them to the set directly
  or indirectly by selecting a range of indexes on a source object.

  @extends SC.Object
  @extends SC.Enumerable
  @extends SC.Freezable
  @extends SC.Copyable
  @since SproutCore 1.0
*/
SC.SelectionSet = SC.Object.extend(SC.Enumerable, SC.Freezable, SC.Copyable,
  /** @scope SC.SelectionSet.prototype */ {

  /**
    Walk like a duck.

    @type Boolean
  */
  isSelectionSet: YES,

  /**
    Total number of indexes in the selection set

    @type Number
  */
  length: function() {
    var ret     = 0,
        sets    = this._sets,
        objects = this._objects;
    if (objects) ret += objects.get('length');
    if (sets) sets.forEach(function(s) { ret += s.get('length'); });
    return ret ;
  }.property().cacheable(),

  // ..........................................................
  // INDEX-BASED SELECTION
  //

  /**
    A set of all the source objects used in the selection set.  This
    property changes automatically as you add or remove index sets.

    @type SC.Array
  */
  sources: function() {
    var ret  = [],
        sets = this._sets,
        len  = sets ? sets.length : 0,
        idx, set, source;

    for(idx=0;idx<len;idx++) {
      set = sets[idx];
      if (set && set.get('length')>0 && set.source) ret.push(set.source);
    }
    return ret ;
  }.property().cacheable(),

  /**
    Returns the index set for the passed source object or null if no items are
    seleted in the source.

    @param {SC.Array} source the source object
    @returns {SC.IndexSet} index set or null
  */
  indexSetForSource: function(source) {
    if (!source || !source.isSCArray) return null; // nothing to do

    var cache   = this._indexSetCache,
        objects = this._objects,
        ret, idx;

    // try to find in cache
    if (!cache) cache = this._indexSetCache = {};
    ret = cache[SC.guidFor(source)];
    if (ret && ret._sourceRevision && (ret._sourceRevision !== source.propertyRevision)) {
      ret = null;
    }

    // not in cache.  generate from index sets and any saved objects
    if (!ret) {
      ret = this._indexSetForSource(source, NO);
      if (ret && ret.get('length')===0) ret = null;

      if (objects) {
        if (ret) ret = ret.copy();
        objects.forEach(function(o) {
          if ((idx = source.indexOf(o)) >= 0) {
            if (!ret) ret = SC.IndexSet.create();
            ret.add(idx);
          }
        }, this);
      }

      if (ret) {
        ret = cache[SC.guidFor(source)] = ret.frozenCopy();
        ret._sourceRevision = source.propertyRevision;
      }
    }

    return ret;
  },

  /**
    @private

    Internal method gets the index set for the source, ignoring objects
    that have been added directly.
  */
  _indexSetForSource: function(source, canCreate) {
    if (canCreate === undefined) canCreate = YES;

    var guid  = SC.guidFor(source),
        index = this[guid],
        sets  = this._sets,
        len   = sets ? sets.length : 0,
        ret   = null;

    if (index >= len) index = null;
    if (SC.none(index)) {
      if (canCreate && !this.isFrozen) {
        this.propertyWillChange('sources');
        if (!sets) sets = this._sets = [];
        ret = sets[len] = SC.IndexSet.create();
        ret.source = source ;
        this[guid] = len;
        this.propertyDidChange('sources');
      }

    } else ret = sets ? sets[index] : null;
    return ret ;
  },

  /**
    Add the passed index, range of indexSet belonging to the passed source
    object to the selection set.

    The first parameter you pass must be the source array you are selecting
    from.  The following parameters may be one of a start/length pair, a
    single index, a range object or an IndexSet.  If some or all of the range
    you are selecting is already in the set, it will not be selected again.

    You can also pass an SC.SelectionSet to this method and all the selected
    sets will be added from their instead.

    @param {SC.Array} source source object or object to add.
    @param {Number} start index, start of range, range or IndexSet
    @param {Number} length length if passing start/length pair.
    @returns {SC.SelectionSet} receiver
  */
  add: function(source, start, length) {

    if (this.isFrozen) throw SC.FROZEN_ERROR ;

    var sets, len, idx, set, oldlen, newlen, setlen, objects;

    // normalize
    if (start === undefined && length === undefined) {
      if (!source) throw new Error("Must pass params to SC.SelectionSet.add()");
      if (source.isIndexSet) return this.add(source.source, source);
      if (source.isSelectionSet) {
        sets = source._sets;
        objects = source._objects;
        len  = sets ? sets.length : 0;

        this.beginPropertyChanges();
        for(idx=0;idx<len;idx++) {
          set = sets[idx];
          if (set && set.get('length')>0) this.add(set.source, set);
        }
        if (objects) this.addObjects(objects);
        this.endPropertyChanges();
        return this ;

      }
    }

    set    = this._indexSetForSource(source, YES);
    oldlen = this.get('length');
    setlen = set.get('length');
    newlen = oldlen - setlen;

    set.add(start, length);

    this._indexSetCache = null;

    newlen += set.get('length');
    if (newlen !== oldlen) {
      this.propertyDidChange('length');
      this.enumerableContentDidChange();
      if (setlen === 0) this.notifyPropertyChange('sources');
    }

    return this ;
  },

  /**
    Removes the passed index, range of indexSet belonging to the passed source
    object from the selection set.

    The first parameter you pass must be the source array you are selecting
    from.  The following parameters may be one of a start/length pair, a
    single index, a range object or an IndexSet.  If some or all of the range
    you are selecting is already in the set, it will not be selected again.

    @param {SC.Array} source source object. must not be null
    @param {Number} start index, start of range, range or IndexSet
    @param {Number} length length if passing start/length pair.
    @returns {SC.SelectionSet} receiver
  */
  remove: function(source, start, length) {

    if (this.isFrozen) throw SC.FROZEN_ERROR ;

    var sets, len, idx, set, oldlen, newlen, setlen, objects;

    // normalize
    if (start === undefined && length === undefined) {
      if (!source) throw new Error("Must pass params to SC.SelectionSet.remove()");
      if (source.isIndexSet) return this.remove(source.source, source);
      if (source.isSelectionSet) {
        sets = source._sets;
        objects = source._objects;
        len  = sets ? sets.length : 0;

        this.beginPropertyChanges();
        for(idx=0;idx<len;idx++) {
          set = sets[idx];
          if (set && set.get('length')>0) this.remove(set.source, set);
        }
        if (objects) this.removeObjects(objects);
        this.endPropertyChanges();
        return this ;
      }
    }

    // save starter info
    set    = this._indexSetForSource(source, YES);
    oldlen = this.get('length');
    newlen = oldlen - set.get('length');

    // if we have objects selected, determine if they are in the index
    // set and remove them as well.
    if (set && (objects = this._objects)) {

      // convert start/length to index set so the iterator below will work...
      if (length !== undefined) {
        start = SC.IndexSet.create(start, length);
        length = undefined;
      }

      objects.forEach(function(object) {
        idx = source.indexOf(object);
        if (start.contains(idx)) {
          objects.remove(object);
          newlen--;
        }
      }, this);
    }

    // remove indexes from source index set
    set.remove(start, length);
    setlen = set.get('length');
    newlen += setlen;

    // update caches; change enumerable...
    this._indexSetCache = null;
    if (newlen !== oldlen) {
      this.propertyDidChange('length');
      this.enumerableContentDidChange();
      if (setlen === 0) this.notifyPropertyChange('sources');
    }

    return this ;
  },


  /**
    Returns YES if the selection contains the named index, range of indexes.

    @param {Object} source source object for range
    @param {Number} start index, start of range, range object, or indexSet
    @param {Number} length optional range length
    @returns {Boolean}
  */
  contains: function(source, start, length) {
    if (start === undefined && length === undefined) {
      return this.containsObject(source);
    }

    var set = this.indexSetForSource(source);
    if (!set) return NO ;
    return set.contains(start, length);
  },

  /**
    Returns YES if the index set contains any of the passed indexes.  You
    can pass a single index, a range or an index set.

    @param {Object} source source object for range
    @param {Number} start index, range, or IndexSet
    @param {Number} length optional range length
    @returns {Boolean}
  */
  intersects: function(source, start, length) {
    var set = this.indexSetForSource(source, NO);
    if (!set) return NO ;
    return set.intersects(start, length);
  },


  // ..........................................................
  // OBJECT-BASED API
  //

  _TMP_ARY: [],

  /**
    Adds the object to the selection set.  Unlike adding an index set, the
    selection will actually track the object independent of its location in
    the array.

    @param {Object} object
    @returns {SC.SelectionSet} receiver
  */
  addObject: function(object) {
    var ary = this._TMP_ARY, ret;
    ary[0] = object;

    ret = this.addObjects(ary);
    ary.length = 0;

    return ret;
  },

  /**
    Adds objects in the passed enumerable to the selection set.  Unlike adding
    an index set, the seleciton will actually track the object independent of
    its location the array.

    @param {SC.Enumerable} objects
    @returns {SC.SelectionSet} receiver
  */
  addObjects: function(objects) {
    var cur = this._objects,
        oldlen, newlen;
    if (!cur) cur = this._objects = SC.CoreSet.create();
    oldlen = cur.get('length');

    cur.addEach(objects);
    newlen = cur.get('length');

    this._indexSetCache = null;
    if (newlen !== oldlen) {
      this.propertyDidChange('length');
      this.enumerableContentDidChange();
    }
    return this;
  },

  /**
    Removes the object from the selection set.  Note that if the selection
    set also selects a range of indexes that includes this object, it may
    still be in the selection set.

    @param {Object} object
    @returns {SC.SelectionSet} receiver
  */
  removeObject: function(object) {
    var ary = this._TMP_ARY, ret;
    ary[0] = object;

    ret = this.removeObjects(ary);
    ary.length = 0;

    return ret;
  },

  /**
    Removes the objects from the selection set.  Note that if the selection
    set also selects a range of indexes that includes this object, it may
    still be in the selection set.

    @param {Object} object
    @returns {SC.SelectionSet} receiver
  */
  removeObjects: function(objects) {
    var cur = this._objects,
        oldlen, newlen, sets;

    if (!cur) return this;

    oldlen = cur.get('length');

    cur.removeEach(objects);
    newlen = cur.get('length');

    // also remove from index sets, if present
    if (sets = this._sets) {
      sets.forEach(function(set) {
        oldlen += set.get('length');
        set.removeObjects(objects);
        newlen += set.get('length');
      }, this);
    }

    this._indexSetCache = null;
    if (newlen !== oldlen) {
      this.propertyDidChange('length');
      this.enumerableContentDidChange();
    }
    return this;
  },

  /**
    Returns YES if the selection contains the passed object.  This will search
    selected ranges in all source objects.

    @param {Object} object the object to search for
    @returns {Boolean}
  */
  containsObject: function(object) {
    // fast path
    var objects = this._objects ;
    if (objects && objects.contains(object)) return YES ;

    var sets = this._sets,
        len  = sets ? sets.length : 0,
        idx, set;
    for(idx=0;idx<len;idx++) {
      set = sets[idx];
      if (set && set.indexOf(object)>=0) return YES;
    }

    return NO ;
  },


  // ..........................................................
  // GENERIC HELPER METHODS
  //

  /**
    Constrains the selection set to only objects found in the passed source
    object.  This will remove any indexes selected in other sources, any
    indexes beyond the length of the content, and any objects not found in the
    set.

    @param {Object} source the source to limit
    @returns {SC.SelectionSet} receiver
  */
  constrain: function (source) {
    var set, len, max, objects;

    this.beginPropertyChanges();

    // remove sources other than this one
    this.get('sources').forEach(function(cur) {
      if (cur === source) return; //skip
      var set = this._indexSetForSource(source, NO);
      if (set) this.remove(source, set);
    },this);

    // remove indexes beyond end of source length
    set = this._indexSetForSource(source, NO);
    if (set && ((max=set.get('max'))>(len=source.get('length')))) {
      this.remove(source, len, max-len);
    }

    // remove objects not in source
    if (objects = this._objects) {
      var i, cur;
      for (i = objects.length - 1; i >= 0; i--) {
        cur = objects[i];
        if (source.indexOf(cur) < 0) this.removeObject(cur);
      }
    }

    this.endPropertyChanges();
    return this ;
  },

  /**
    Returns YES if the passed index set or selection set contains the exact
    same source objects and indexes as  the receiver.  If you pass any object
    other than an IndexSet or SelectionSet, returns NO.

    @param {Object} obj another object.
    @returns {Boolean}
  */
  isEqual: function(obj) {
    var left, right, idx, len, sources, source;

    // fast paths
    if (!obj || !obj.isSelectionSet) return NO ;
    if (obj === this) return YES;
    if ((this._sets === obj._sets) && (this._objects === obj._objects)) return YES;
    if (this.get('length') !== obj.get('length')) return NO;

    // check objects
    left = this._objects;
    right = obj._objects;
    if (left || right) {
      if ((left ? left.get('length'):0) !== (right ? right.get('length'):0)) {
        return NO;
      }
      if (left && !left.isEqual(right)) return NO ;
    }

    // now go through the sets
    sources = this.get('sources');
    len     = sources.get('length');
    for(idx=0;idx<len;idx++) {
      source = sources.objectAt(idx);
      left = this._indexSetForSource(source, NO);
      right = this._indexSetForSource(source, NO);
      if (!!right !== !!left) return NO ;
      if (left && !left.isEqual(right)) return NO ;
    }

    return YES ;
  },

  /**
    Clears the set.  Removes all IndexSets from the object

    @returns {SC.SelectionSet}
  */
  clear: function() {
    if (this.isFrozen) throw SC.FROZEN_ERROR;
    if (this._sets) this._sets.length = 0 ; // truncate
    if (this._objects) this._objects = null;

    this._indexSetCache = null;
    this.propertyDidChange('length');
    this.enumerableContentDidChange();
    this.notifyPropertyChange('sources');

    return this ;
  },

  /**
   Clones the set into a new set.

   @returns {SC.SelectionSet}
  */
  copy: function() {
    var ret  = this.constructor.create(),
        sets = this._sets,
        len  = sets ? sets.length : 0 ,
        idx, set;

    if (sets && len>0) {
      sets = ret._sets = sets.slice();
      for(idx=0;idx<len;idx++) {
        if (!(set = sets[idx])) continue ;
        set = sets[idx] = set.copy();
        ret[SC.guidFor(set.source)] = idx;
      }
    }

    if (this._objects) ret._objects = this._objects.copy();
    return ret ;
  },

  /**
    @private

    Freezing a SelectionSet also freezes its internal sets.
  */
  freeze: function() {
    if (this.get('isFrozen')) { return this ; }
    var sets = this._sets,
        loc  = sets ? sets.length : 0,
        set ;

    while(--loc >= 0) {
      set = sets[loc];
      if (set) { set.freeze(); }
    }

    if (this._objects) { this._objects.freeze(); }
    this.set('isFrozen', YES);
    return this;
    // return sc_super();
  },

  // ..........................................................
  // ITERATORS
  //

  /** @private */
  toString: function() {
    var sets = this._sets || [];
    sets = sets.map(function(set) {
      return set.toString().replace("SC.IndexSet", SC.guidFor(set.source));
    }, this);
    if (this._objects) sets.push(this._objects.toString());
    return "SC.SelectionSet:%@<%@>".fmt(SC.guidFor(this), sets.join(','));
  },

  /** @private */
  firstObject: function() {
    var sets    = this._sets,
        objects = this._objects;

    // if we have sets, get the first one
    if (sets && sets.get('length')>0) {
      var set  = sets ? sets[0] : null,
          src  = set ? set.source : null,
          idx  = set ? set.firstObject() : -1;
      if (src && idx>=0) return src.objectAt(idx);
    }

    // otherwise if we have objects, get the first one
    return objects ? objects.firstObject() : undefined;

  }.property(),

  /** @private
    Implement primitive enumerable support.  Returns each object in the
    selection.
  */
  nextObject: function(count, lastObject, context) {
    var objects, ret;

    // TODO: Make this more efficient.  Right now it collects all objects
    // first.

    if (count === 0) {
      objects = context.objects = [];
      this.forEach(function(o) { objects.push(o); }, this);
      context.max = objects.length;
    }

    objects = context.objects ;
    ret = objects[count];

    if (count+1 >= context.max) {
      context.objects = context.max = null;
    }

    return ret ;
  },

  /**
    Iterates over the selection, invoking your callback with each __object__.
    This will actually find the object referenced by each index in the
    selection, not just the index.

    The callback must have the following signature:

        function callback(object, index, source, indexSet) { ... }

    If you pass a target, it will be used when the callback is called.

    @param {Function} callback function to invoke.
    @param {Object} target optional content. otherwise uses window
    @returns {SC.SelectionSet} receiver
  */
  forEach: function(callback, target) {
    var sets = this._sets,
        objects = this._objects,
        len = sets ? sets.length : 0,
        set, idx;

    for(idx=0;idx<len;idx++) {
      set = sets[idx];
      if (set) set.forEachObject(callback, target);
    }

    if (objects) objects.forEach(callback, target);
    return this ;
  }

});

/** @private */
SC.SelectionSet.prototype.clone = SC.SelectionSet.prototype.copy;

/**
  Default frozen empty selection set

  @property {SC.SelectionSet}
*/
SC.SelectionSet.EMPTY = SC.SelectionSet.create().freeze();

