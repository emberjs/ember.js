// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  A RangeObserver is used by Arrays to automatically observe all of the
  objects in a particular range on the array.  Whenever any property on one
  of those objects changes, it will notify its delegate.  Likewise, whenever
  the contents of the array itself changes, it will notify its delegate and
  possibly update its own registration.

  This implementation uses only SC.Array methods.  It can be used on any
  object that complies with SC.Array.  You may, however, choose to subclass
  this object in a way that is more optimized for your particular design.

  @since SproutCore 1.0
*/
SC.RangeObserver = /** @scope SC.RangeObserver.prototype */{

  /**
    Walk like a duck.

    @type Boolean
  */
  isRangeObserver: YES,

  /** @private */
  toString: function() {
    var base = this.indexes ? this.indexes.toString() : "SC.IndexSet<..>";
    return base.replace('IndexSet', 'RangeObserver(%@)'.fmt(SC.guidFor(this)));
  },

  /**
    Creates a new range observer owned by the source.  The indexSet you pass
    must identify the indexes you are interested in observing.  The passed
    target/method will be invoked whenever the observed range changes.

    Note that changes to a range are buffered until the end of a run loop
    unless a property on the record itself changes.

    @param {SC.Array} source the source array
    @param {SC.IndexSet} indexSet set of indexes to observer
    @param {Object} target the target
    @param {Function|String} method the method to invoke
    @param {Object} context optional context to include in callback
    @param {Boolean} isDeep if YES, observe property changes as well
    @returns {SC.RangeObserver} instance
  */
  create: function(source, indexSet, target, method, context, isDeep) {
    var ret = SC.beget(this);
    ret.source = source;
    ret.indexes = indexSet ? indexSet.frozenCopy() : null;
    ret.target = target;
    ret.method = (typeof method === 'string') ? target[method] : method;
    ret.context = context ;
    ret.isDeep  = isDeep || false ;
    ret.beginObserving();
    return ret ;
  },

  /**
    Create subclasses for the RangeObserver.  Pass one or more attribute
    hashes.  Use this to create customized RangeObservers if needed for your
    classes.

    @param {Hash} attrs one or more attribute hashes
    @returns {SC.RangeObserver} extended range observer class
  */
  extend: function(attrs) {
    var ret = SC.beget(this), args = arguments;
    for(var i=0, l=args.length; i<l; i++) { SC.mixin(ret, args[i]); }
    return ret ;
  },

  /**
    Destroys an active ranger observer, cleaning up first.

    @param {SC.Array} source the source array
    @returns {SC.RangeObserver} receiver
  */
  destroy: function(source) {
    this.endObserving();
    return this;
  },

  /**
    Updates the set of indexes the range observer applies to.  This will
    stop observing the old objects for changes and start observing the
    new objects instead.

    @param {SC.Array} source the source array
    @param {SC.IndexSet} indexSet The index set representing the change
    @returns {SC.RangeObserver} receiver
  */
  update: function(source, indexSet) {
    if (this.indexes && this.indexes.isEqual(indexSet)) { return this ; }

    this.indexes = indexSet ? indexSet.frozenCopy() : null ;
    this.endObserving().beginObserving();
    return this;
  },

  /**
    Configures observing for each item in the current range.  Should update
    the observing array with the list of observed objects so they can be
    torn down later

    @returns {SC.RangeObserver} receiver
  */
  beginObserving: function() {
    if ( !this.isDeep ) { return this; } // nothing to do

    var observing = this.observing = this.observing || SC.CoreSet.create();

    // cache iterator function to keep things fast
    var func = this._beginObservingForEach, source = this.source;

    if( !func ) {
      func = this._beginObservingForEach = function(idx) {
        var obj = source.objectAt(idx);
        if (obj && obj.addObserver) {
          observing.push(obj);
          obj._kvo_needsRangeObserver = true ;
        }
      };
    }

    this.indexes.forEach(func);

    // add to pending range observers queue so that if any of these objects
    // change we will have a chance to setup observing on them.
    this.isObserving = false ;
    SC.Observers.addPendingRangeObserver(this);

    return this;
  },

  /** @private
    Called when an object that appears to need range observers has changed.
    Check to see if the range observer contains this object in its list.  If
    it does, go ahead and setup observers on all objects and remove ourself
    from the queue.
  */
  setupPending: function(object) {
    var observing = this.observing ;

    if ( this.isObserving || !observing || (observing.get('length')===0) ) {
      return true ;
    }

    if (observing.contains(object)) {
      this.isObserving = true ;

      // cache iterator function to keep things fast
      var func = this._setupPendingForEach;
      if (!func) {
        var source = this.source,
            method = this.objectPropertyDidChange,
            self   = this;

        func = this._setupPendingForEach = function(idx) {
          var obj = source.objectAt(idx),
              guid = SC.guidFor(obj),
              key ;

          if (obj && obj.addObserver) {
            observing.push(obj);
            obj.addObserver('*', self, method);

            // also save idx of object on range observer itself.  If there is
            // more than one idx, convert to IndexSet.
            key = self[guid];
            if ( key == null ) {
              self[guid] = idx ;
            } else if (key.isIndexSet) {
              key.add(idx);
            } else {
              self[guid] = SC.IndexSet.create(key).add(idx);
            }

          }
        };
      }
      this.indexes.forEach(func);
      return true ;
    } else {
      return false ;
    }
  },

  /**
    Remove observers for any objects currently begin observed.  This is
    called whenever the observed range changes due to an array change or
    due to destroying the observer.

    @returns {SC.RangeObserver} receiver
  */
  endObserving: function() {
    if ( !this.isDeep ) return this; // nothing to do

    var observing = this.observing;

    if (this.isObserving) {
      var meth      = this.objectPropertyDidChange,
          source    = this.source,
          idx, lim, obj;

      if (observing) {
        lim = observing.length;
        for(idx=0;idx<lim;idx++) {
          obj = observing[idx];
          obj.removeObserver('*', this, meth);
          this[SC.guidFor(obj)] = null;
        }
        observing.length = 0 ; // reset
      }

      this.isObserving = false ;
    }

    if (observing) { observing.clear(); } // empty set.
    return this ;
  },

  /**
    Whenever the actual objects in the range changes, notify the delegate
    then begin observing again.  Usually this method will be passed an
    IndexSet with the changed indexes.  The range observer will only notify
    its delegate if the changed indexes include some of all of the indexes
    this range observer is monitoring.

    @param {SC.IndexSet} changes optional set of changed indexes
    @returns {SC.RangeObserver} receiver
  */
  rangeDidChange: function(changes) {
    var indexes = this.indexes;
    if ( !changes || !indexes || indexes.intersects(changes) ) {
      this.endObserving(); // remove old observers
      this.method.call(this.target, this.source, null, '[]', changes, this.context);
      this.beginObserving(); // setup new ones
    }
    return this ;
  },

  /**
    Whenever an object changes, notify the delegate

    @param {Object} the object that changed
    @param {String} key the property that changed
    @param {Null} value No longer used
    @param {Number} rev The revision of the change
    @returns {SC.RangeObserver} receiver
  */
  objectPropertyDidChange: function(object, key, value, rev) {
    var context = this.context,
        method  = this.method,
        guid    = SC.guidFor(object),
        index   = this[guid];

    // lazily convert index to IndexSet.
    if ( index && !index.isIndexSet ) {
      index = this[guid] = SC.IndexSet.create(index).freeze();
    }

    method.call(this.target, this.source, object, key, index, context || rev, rev);
  }

};
