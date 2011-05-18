// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/runtime');
require('sproutcore-runtime/mixins/observable');
require('sproutcore-runtime/system/set');


/**
  @private
  @namespace

  This queue is used to hold observers when the object you tried to observe
  does not exist yet. This queue is flushed just before any property
  notification is sent.

  The private ObserverQueue is used to maintain a set of pending observers.
  This allows you to setup an observer on an object before the object exists.

  Whenever the observer fires, the queue will be flushed to connect any
  pending observers.

  @since SproutCore 1.0
*/
SC.Observers = {

  /**
    @type Array
    @default []
  */
  queue: [],

  /**
   @private

   Attempt to add the named observer. If the observer cannot be found, put
   it into a queue for later.
  */
  addObserver: function(propertyPath, target, method, pathRoot) {
    var tuple;

    // try to get the tuple for this.
    if (typeof propertyPath === "string") {
      tuple = SC.tupleForPropertyPath(propertyPath, pathRoot);
    } else {
      tuple = propertyPath;
    }

    // if a tuple was found and is observable, add the observer immediately...
    if (tuple && tuple[0].addObserver) {
      tuple[0].addObserver(tuple[1], target, method);

    // otherwise, save this in the queue.
    } else {
      this.queue.push([propertyPath, target, method, pathRoot]);
    }
  },

  /**
    @private

    Remove the observer. If it is already in the queue, remove it. Also
    if already found on the object, remove that.
  */
  removeObserver: function(propertyPath, target, method, pathRoot) {
    var idx, queue, tuple, item;

    tuple = SC.tupleForPropertyPath(propertyPath, pathRoot);
    if (tuple) {
      tuple[0].removeObserver(tuple[1], target, method);
    }

    idx = this.queue.length;
    queue = this.queue;

    while(--idx >= 0) {
      item = queue[idx];
      if ((item[0] === propertyPath) && (item[1] === target) && (item[2] == method) && (item[3] === pathRoot)) {
        queue[idx] = null;
      }
    }
  },

  /**
    @private

    Range Observers register here to indicate that they may potentially
    need to start observing.
  */
  addPendingRangeObserver: function(observer) {
    var ro = this.rangeObservers;
    if (!ro) { ro = this.rangeObservers = SC.CoreSet.create(); }
    ro.add(observer);
    return this;
  },

  _TMP_OUT: [],

  /**
    Flush the queue. Attempt to add any saved observers.
  */
  flush: function(object) {
    // flush any observers that we tried to setup but didn't have a path yet
    var oldQueue = this.queue, i,
        queueLen = oldQueue.length;

    if (oldQueue && queueLen > 0) {
      var newQueue = (this.queue = []);

      for (i = 0; i < queueLen; i++) {
        var item = oldQueue[i];
        if (!item) { continue; }

        var tuple = SC.tupleForPropertyPath(item[0], item[3]);
        // check if object is observable (yet) before adding an observer
        if(tuple && tuple[0].addObserver) {
          tuple[0].addObserver(tuple[1], item[1], item[2]);
        } else {
          newQueue.push(item);
        }
      }
    }

    // if this object needsRangeObserver then see if any pending range
    // observers need it.
    if ( object._kvo_needsRangeObserver ) {
      var set = this.rangeObservers,
          len = set ? set.get('length') : 0,
          out = this._TMP_OUT, ro;

      for ( i=0; i<len; i++ ) {
        // get the range observer
        ro = set[i];
        if (ro.setupPending(object)) {
          // save to remove later
          out.push(ro);
        }
      }

      // remove any that have setup
      if (out.length > 0) { set.removeEach(out); }
      // reset
      out.length = 0;
      object._kvo_needsRangeObserver = false;
    }
  },

  /** @private */
  isObservingSuspended: 0,

  /** @private */
  _pending: SC.CoreSet.create(),

  /** @private */
  objectHasPendingChanges: function(obj) {
    this._pending.add(obj); // save for later
  },

  /** @private
    Temporarily suspends all property change notifications.
  */
  suspendPropertyObserving: function() {
    this.isObservingSuspended++;
  },

  /** @private
    Resume change notifications. This will call notifications to be
    delivered for all pending objects.
  */
  resumePropertyObserving: function() {
    var pending;
    if(--this.isObservingSuspended <= 0) {
      pending = this._pending;
      this._pending = SC.CoreSet.create();

      var idx, len = pending.length;
      for(idx = 0; idx < len; idx++) {
        pending[idx]._notifyPropertyObservers();
      }

      pending.clear();
      pending = null;
    }
  }

};
