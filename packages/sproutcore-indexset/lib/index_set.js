// ==========================================================================
// Project:   SproutCore IndexSet
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

var get = SC.get, set = SC.set, abs = Math.abs;

function isIndexSet(obj) {
  return obj instanceof SC.IndexSet;
}

/** @private
  iterates through a named range, setting hints every HINT_SIZE indexes
  pointing to the nearest range start.  The passed range must start on a
  range boundary.  It can end anywhere.
*/
function _hint(indexSet, start, length, content) {
  if (content === undefined) content = indexSet._content;

  var skip    = SC.IndexSet.HINT_SIZE,
      next    = abs(content[start]), // start of next range
      loc     = start - (start % skip) + skip, // next hint loc
      lim     = start + length ; // stop

  while (loc < lim) {
    // make sure we are in current rnage
    while ((next !== 0) && (next <= loc)) {
      start = next ;
      next  = abs(content[start]) ;
    }

    // past end
    if (next === 0) {
      delete content[loc];

    // do not change if on actual boundary
    } else if (loc !== start) {
      content[loc] = start ;  // set hint
    }

    loc += skip;
  }
}

/** @private
  Walks a content array and copies its contents to a new array.  For large
  content arrays this is faster than using slice()
*/
function _sliceContent(c) {
  if (c.length < 1000) return c.slice(); // use native when faster
  var cur = 0, ret = [], next = c[0];
  while(next !== 0) {
    ret[cur] = next ;
    cur = (next<0) ? (0-next) : next ;
    next = c[cur];
  }
  ret[cur] = 0;
  _hint(this, 0, cur, ret); // hints are not copied manually - add them
  return ret ;
}

/**
  @class

  A collection of ranges.  You can use an IndexSet to keep track of non-
  continuous ranges of items in a parent array.  IndexSet's are used for
  selection, for managing invalidation ranges and other data-propogation.

  Examples
  ---

        var set = SC.IndexSet.create(ranges) ;
        set.contains(index);
        set.add(index, length);
        set.remove(index, length);

        // uses a backing SC.Array object to return each index
        set.forEach(function(object) { .. })

        // returns the index
        set.forEachIndex(function(index) { ... });

        // returns ranges
        set.forEachRange(function(start, length) { .. });

  Implementation Notes
  ---

  An IndexSet stores indices on the object.  A positive value great than the
  index tells you the end of an occupied range.  A negative values tells you
  the end of an empty range.  A value less than the index is a search
  accelerator.  It tells you the start of the nearest range.

  @extends SC.Enumerable
  @extends SC.MutableEnumerable
  @extends SC.Copyable
  @extends SC.Freezable
  @since SproutCore 1.0
*/
SC.IndexSet = SC.Object.extend(SC.Enumerable, SC.MutableEnumerable, SC.Freezable, SC.Copyable,
/** @scope SC.IndexSet.prototype */ {

  /**
    Walk like a duck.  You should use instanceof instead.

    @deprecated
    @type Boolean
    @default YES
  */
  isIndexSet: YES,

  /**
    Total number of indexes contained in the set

    @type Number
  */
  length: 0,

  /**
    One greater than the largest index currently stored in the set.  This
    is sometimes useful when determining the total range of items covering
    the index set.

    @type Number
  */
  max: 0,

  /**
    The first index included in the set or -1.

    @type Number
  */
  min: function() {
    var content = this._content,
        cur = content[0];
    return (cur === 0) ? -1 : (cur>0) ? 0 : abs(cur);

  }.property('[]').cacheable(),

  /**
    When you create a new index set you can optional pass another index set
    or a starting range to be added to the set.
  */
  init: function(start, length) {
    this._super();
    
    // optimized method to clone an index set.
    if (start && isIndexSet(start)) {
      this._content = _sliceContent(start._content);
      set(this, 'max', get(start, 'max'));
      set(this, 'length', get(start, 'length'));
      set(this, 'source', get(start, 'source'));

    // otherwise just do a regular add
    } else {
      this._content = [0];
      if (start !== undefined) this.add(start, length);
    }

  },
  
  /**
    Returns the first index in the set .

    @type Number
  */
  firstObject: function() {
    return get(this, 'length')>0 ? get(this, 'min') : undefined;
  }.property(),

  /**
    Returns the starting index of the nearest range for the specified
    index.

    @param {Number} index
    @returns {Number} starting index
  */
  rangeStartForIndex: function(index) {
    var content = this._content,
        max     = get(this, 'max'),
        ret, next, accel;

    // fast cases
    if (index >= max) return max ;
    if (abs(content[index]) > index) return index ; // we hit a border

    // use accelerator to find nearest content range
    accel = index - (index % SC.IndexSet.HINT_SIZE);
    ret = content[accel];
    if (ret<0 || ret>index) ret = accel;
    next = abs(content[ret]);

    // now step forward through ranges until we find one that includes the
    // index.
    while (next < index) {
      ret = next ;
      next = abs(content[ret]);
    }
    return ret ;
  },

  /**
    Returns YES if the passed index set contains the exact same indexes as
    the receiver.  If you pass any object other than an index set, returns NO.

    @param {Object} obj another object.
    @returns {Boolean}
  */
  isEqual: function(obj) {

    // optimize for some special cases
    if (obj === this) return YES ;
    if (!obj || !isIndexSet(obj) || (get(obj, 'max') !== get(this, 'max')) || (get(obj, 'length') !== get(this, 'length'))) return NO;

    // ok, now we need to actually compare the ranges of the two.
    var lcontent = this._content,
        rcontent = obj._content,
        cur      = 0,
        next     = lcontent[cur];

    do {
      if (rcontent[cur] !== next) return NO ;
      cur = abs(next) ;
      next = lcontent[cur];
    } while (cur !== 0);
    return YES ;
  },

  /**
    Returns the first index in the set before the passed index or null if
    there are no previous indexes in the set.

    @param {Number} index index to check
    @returns {Number} index or -1
  */
  indexBefore: function(index) {

    if (index===0) return -1; // fast path
    index--; // start with previous index

    var content = this._content,
        max     = get(this, 'max'),
        start   = this.rangeStartForIndex(index);
    if (!content) return null;

    // loop backwards until we find a range that is in the set.
    while((start===max) || (content[start]<0)) {
      if (start === 0) return -1 ; // nothing before; just quit
      index = start -1 ;
      start = this.rangeStartForIndex(index);
    }

    return index;
  },

  /**
    Returns the first index in the set after the passed index or null if
    there are no additional indexes in the set.

    @param {Number} index index to check
    @returns {Number} index or -1
  */
  indexAfter: function(index) {
    var content = this._content,
        max     = get(this, 'max'),
        start, next ;
    if (!content || (index>=max)) return -1; // fast path
    index++; // start with next index


    // loop forwards until we find a range that is in the set.
    start = this.rangeStartForIndex(index);
    next  = content[start];
    while(next<0) {
      if (next === 0) return -1 ; //nothing after; just quit
      index = start = abs(next);
      next  = content[start];
    }

    return index;
  },

  /**
    Returns YES if the index set contains the named index

    @param {Number} start index or range
    @param {Number} length optional range length
    @returns {Boolean}
  */
  contains: function(start, length) {
    var content, cur, next, rstart, rnext;

    // normalize input
    if (length === undefined) {
      if (start === null || start === undefined) return NO ;

      if ('number' === typeof start) {
        length = 1 ;

      // if passed an index set, check each receiver range
      } else if (start && isIndexSet(start)) {
        if (start === this) return YES ; // optimization

        content = start._content ;
        cur = 0 ;
        next = content[cur];
        while (next !== 0) {
          if ((next>0) && !this.contains(cur, next-cur)) return NO ;
          cur = abs(next);
          next = content[cur];
        }
        return YES ;

      // passed just a hash range
      } else {
        length = start.length;
        start = start.start;
      }
    }

    rstart = this.rangeStartForIndex(start);
    rnext  = this._content[rstart];

    return (rnext>0) && (rstart <= start) && (rnext >= (start+length));
  },

  /**
    Returns YES if the index set contains any of the passed indexes.  You
    can pass a single index, a range or an index set.

    @param {Number} start index, range, or IndexSet
    @param {Number} length optional range length
    @returns {Boolean}
  */
  intersects: function(start, length) {
    var content, cur, next, lim;

    // normalize input
    if (length === undefined) {
      if ('number' === typeof start) {
        length = 1 ;

      // if passed an index set, check each receiver range
      } else if (start && isIndexSet(start)) {
        if (start === this) return YES ; // optimization

        content = start._content ;
        cur = 0 ;
        next = content[cur];
        while (next !== 0) {
          if ((next>0) && this.intersects(cur, next-cur)) return YES ;
          cur = abs(next);
          next = content[cur];
        }
        return NO ;

      } else {
        length = start.length;
        start = start.start;
      }
    }

    cur     = this.rangeStartForIndex(start);
    content = this._content;
    next    = content[cur];
    lim     = start + length;
    while (cur < lim) {
      if (next === 0) return NO; // no match and at end!
      if ((next > 0) && (next > start)) return YES ; // found a match
      cur = abs(next);
      next = content[cur];
    }
    return NO ; // no match
  },

  /**
    Returns a new IndexSet without the passed range or indexes.   This is a
    convenience over simply cloning and removing.  Does some optimizations.

    @param {Number} start index, range, or IndexSet
    @param {Number} length optional range length
    @returns {SC.IndexSet} new index set
  */
  without: function(start, length) {
    if (start === this) return new SC.IndexSet(); // just need empty set
    return this.copy().remove(start, length);
  },

  /**
    Replace the index set's current content with the passed index set.  This
    is faster than clearing the index set adding the values again.  It is 
    useful for when you want to reuse an existing index set.

    @param {Number} start index, Range, or another IndexSet
    @param {Number} length optional length of range.
    @returns {SC.IndexSet} receiver
  */
  replace: function(start, length) {

    if (length === undefined) {
      if ('number' === typeof start) {
        length = 1 ;
      } else if (start && isIndexSet(start)) {
        var oldLen = get(this, 'length'), newLen = get(start, 'length');
        this.enumerableContentWillChange(oldLen, newLen);
        SC.beginPropertyChanges(this);
        this._content = _sliceContent(start._content);
        set(this, 'max', get(start, 'max'));
        set(this, 'length', newLen);
        set(this, 'source', get(start, 'source'));
        SC.endPropertyChanges(this);
        this.enumerableContentDidChange(oldLen, newLen);
        return this ;

      } else {
        length = start.length;
        start  = start.start;
      }
    }

    var oldlen = this.length;
    this._content.length=1;
    this._content[0] = 0;
    this.length = this.max = 0 ; // reset without notifying since add()
    return this.add(start, length);
  },

  /**
    Adds the specified range of indexes to the set.  You can also pass another
    IndexSet to union the contents of the index set with the receiver.

    @param {Number} start index, Range, or another IndexSet
    @param {Number} length optional length of range.
    @returns {SC.IndexSet} receiver
  */
  add: function(start, length) {

    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);

    var content, cur, next, notified;

    // normalize IndexSet input
    if (start && isIndexSet(start)) {
      start.forEachRange(this.add, this);
      return this ;

    } else if (length === undefined) {

      if (start === null || start === undefined) {
        return this; // nothing to do
      } else if ('number' === typeof start) {
        length = 1 ;
      } else {
        length = start.length;
        start = start.start;
      }
    } else if (length === null) length = 1 ;

    // if no length - do nothing. - note captures when length != number
    if (!(length > 0)) return this;

    
    // special case - appending to end of set
    var max     = get(this, 'max'),
        oldmax  = max,
        delta, value ;

    content = this._content ;

    if (start === max) {

      this.enumerableContentWillChange();
      notified = true;

      // if adding to the end and the end is in set, merge.
      if (start > 0) {
        cur = this.rangeStartForIndex(start-1);
        next = content[cur];

        // just extend range at end
        if (next > 0) {
          delete content[max]; // no 0
          content[cur] = max = start + length ;
          start = cur ;

        // previous range was not in set, just tack onto the end
        } else {
          content[max] = max = start + length;
        }
      } else {
        content[start] = max = length;
      }

      content[max] = 0 ;
      set(this, 'max', max);
      set(this, 'length', get(this, 'length') + length) ;
      length = max - start ;

    // past end of last range, just add as a new range.
    } else if (start > max) {
      this.enumerableContentWillChange();
      notified = true;

      content[max] = 0-start; // empty!
      content[start] = start+length ;
      content[start+length] = 0; // set end
      set(this, 'max', start + length) ;
      set(this, 'length', this.length + length) ;

      // affected range goes from starting range to end of content.
      length = start + length - max ;
      start = max ;

    // otherwise, merge into existing range
    } else {

      // find nearest starting range.  split or join that range
      cur   = this.rangeStartForIndex(start);
      next  = content[cur];
      max   = start + length ;
      delta = 0 ;

      // we are right on a boundary and we had a range or were the end, then
      // go back one more.
      if ((start>0) && (cur === start) && (next <= 0)) {
        cur = this.rangeStartForIndex(start-1);
        next = content[cur] ;
      }

      // previous range is not in set.  splice it here
      if (next < 0) {
        content[cur] = 0-start ;

        // if previous range extends beyond this range, splice afterwards also
        if (abs(next) > max) {
          content[start] = 0-max;
          content[max] = next ;
        } else content[start] = next;

      // previous range is in set.  merge the ranges
      } else {
        start = cur ;
        if (next > max) {
          // delta -= next - max ;
          max = next ;
        }
      }

      // at this point there should be clean starting point for the range.
      // just walk the ranges, adding up the length delta and then removing
      // the range until we find a range that passes last
      cur = start;
      while (cur < max) {
        // get next boundary.  splice if needed - if value is 0, we are at end
        // just skip to last
        value = content[cur];
        if (value === 0) {
          content[max] = 0;
          next = max ;
          delta += max - cur ;

          if (!notified && delta>0) {
            this.enumerableContentWillChange();
            notified = true;
          }

        } else {
          next  = abs(value);
          if (next > max) {
            content[max] = value ;
            next = max ;
          }

          // ok, cur range is entirely inside top range.
          // add to delta if needed
          if (value < 0) {
            delta += next - cur ;
            if (!notified && delta>0) {
              this.enumerableContentWillChange();
              notified = true;
            }
          }
        }

        delete content[cur] ; // and remove range
        cur = next;
      }

      // cur should always === last now.  if the following range is in set,
      // merge in also - don't adjust delta because these aren't new indexes
      if ((cur = content[max]) > 0) {
        delete content[max];
        max = cur ;
      }

      // finally set my own range.
      content[start] = max ;
      if (max > oldmax) set(this, 'max', max) ;

      // adjust length
      set(this, 'length', get(this, 'length') + delta);

      // compute hint range
      length = max - start ;
    }

    _hint(this, start, length);
    if (notified) this.enumerableContentDidChange();
    return this;
  },

  /**
    Removes the specified range of indexes from the set

    @param {Number} start index, Range, or IndexSet
    @param {Number} length optional length of range.
    @returns {SC.IndexSet} receiver
  */
  remove: function(start, length) {

    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);

    // normalize input
    if (length === undefined) {
      if (start === null || start === undefined) {
        return this; // nothing to do

      } else if ('number' === typeof start) {
        length = 1 ;

      // if passed an index set, just add each range in the index set.
      } else if (isIndexSet(start)) {
        start.forEachRange(this.remove, this);
        return this;

      } else {
        length = start.length;
        start = start.start;
      }
    }

    if (!(length > 0)) return this; // handles when length != number

    this.enumerableContentWillChange();

    // special case - appending to end of set
    var max     = get(this, 'max'),
        oldmax  = max,
        content = this._content,
        cur, next, delta, value, last ;

    // if we're past the end, do nothing.
    if (start >= max) return this;

    // find nearest starting range.  split or join that range
    cur   = this.rangeStartForIndex(start);
    next  = content[cur];
    last  = start + length ;
    delta = 0 ;

    // we are right on a boundary and we had a range or were the end, then
    // go back one more.
    if ((start>0) && (cur === start) && (next > 0)) {
      cur = this.rangeStartForIndex(start-1);
      next = content[cur] ;
    }

    // previous range is in set.  splice it here
    if (next > 0) {
      content[cur] = start ;

      // if previous range extends beyond this range, splice afterwards also
      if (next > last) {
        content[start] = last;
        content[last] = next ;
      } else content[start] = next;

    // previous range is not in set.  merge the ranges
    } else {
      start = cur ;
      next  = abs(next);
      if (next > last) {
        last = next ;
      }
    }

    // at this point there should be clean starting point for the range.
    // just walk the ranges, adding up the length delta and then removing
    // the range until we find a range that passes last
    cur = start;
    while (cur < last) {
      // get next boundary.  splice if needed - if value is 0, we are at end
      // just skip to last
      value = content[cur];
      if (value === 0) {
        content[last] = 0;
        next = last ;

      } else {
        next  = abs(value);
        if (next > last) {
          content[last] = value ;
          next = last ;
        }

        // ok, cur range is entirely inside top range.
        // add to delta if needed
        if (value > 0) delta += next - cur ;
      }

      delete content[cur] ; // and remove range
      cur = next;
    }

    // cur should always === last now.  if the following range is not in set,
    // merge in also - don't adjust delta because these aren't new indexes
    if ((cur = content[last]) < 0) {
      delete content[last];
      last = abs(cur) ;
    }

    // set my own range - if the next item is 0, then clear it.
    if (content[last] === 0) {
      delete content[last];
      content[start] = 0 ;
      set(this, 'max', start); //max has changed

    } else {
      content[start] = 0-last ;
    }

    // adjust length
    set(this, 'length', get(this, 'length') - delta);

    // compute hint range
    length = last - start ;

    _hint(this, start, length);
    this.enumerableContentDidChange();
    return this;
  },

  /**
    Clears the set
  */
  clear: function() {
    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);

    var oldLen = get(this, 'length');
    if (oldLen>0) this.enumerableContentWillChange();
    SC.beginPropertyChanges(this);
    this._content.length=1;
    this._content[0] = 0;
    set(this, 'length', 0);
    set(this, 'max', 0);
    SC.endPropertyChanges(this);
    if (oldLen > 0) this.enumerableContentDidChange();
  },

  /**
    Add all the ranges in the passed array.

    @param {Enumerable} objects The list of ranges you want to add
  */
  addEach: function(objects) {
    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);
    SC.beginPropertyChanges(this);
    objects.forEach(function(idx) { this.add(idx); }, this);
    SC.endPropertyChanges(this);
    return this ;
  },

  /**
    Removes all the ranges in the passed array.

    @param {Object...} objects The list of objects you want to remove
  */
  removeEach: function(objects) {
    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);
    SC.beginPropertyChanges(this);
    objects.forEach(function(idx) { this.remove(idx); }, this);
    SC.endPropertyChanges(this);
    return this ;
  },

  /**
   Clones the set into a new set.
  */
  copy: function() {
    return new SC.IndexSet(this);
  },

  /** @private (nodoc) */
  clone: SC.alias('copy'),
  
  /** @private (nodoc) */
  slice: SC.alias('copy'),
  
  /**
    Returns a string describing the internal range structure.  Useful for
    debugging.

    @returns {String}
  */
  inspect: function() {
    var content = this._content,
        len     = content.length,
        idx     = 0,
        ret     = [],
        item;

    for(idx=0;idx<len;idx++) {
      item = content[idx];
      if (item !== undefined) ret.push("%@:%@".fmt(idx,item));
    }
    return "SC.IndexSet<%@>".fmt(ret.join(' , '));
  },

  /**
    Invoke the callback, passing each occuppied range instead of each
    index.  This can be a more efficient way to iterate in some cases.  The
    callback should have the signature:

          callback(start, length, indexSet, source) { ... }

    If you pass a target as a second option, the callback will be called in
    the target context.

    @param {Function} callback The method to run on each iteration
    @param {Object} target the object to call the callback on
    @returns {SC.IndexSet} receiver
  */
  forEachRange: function(callback, target) {
    var content = this._content,
        cur     = 0,
        next    = content[cur],
        source  = this.source;

    if (target === undefined) target = null ;
    while (next !== 0) {
      if (next > 0) callback.call(target, cur, next - cur, this, source);
      cur  = abs(next);
      next = content[cur];
    }

    return this ;
  },

  /**
    Invokes the callback for each index within the passed start/length range.
    Otherwise works just like regular forEach().

    @param {Number} start starting index
    @param {Number} length length of range
    @param {Function} callback
    @param {Object} target
    @returns {SC.IndexSet} receiver
  */
  forEachIn: function(start, length, callback, target) {
    var content = this._content,
        cur     = 0,
        idx     = 0,
        lim     = start + length,
        source  = this.source,
        next    = content[cur];

    if (target === undefined) target = null ;
    while (next !== 0) {
      if (cur < start) cur = start ; // skip forward
      while((cur < next) && (cur < lim)) {
        callback.call(target, cur++, idx++, this, source);
      }

      if (cur >= lim) {
        cur = next = 0 ;
      } else {
        cur  = abs(next);
        next = content[cur];
      }
    }
    return this ;
  },

  /**
    Total number of indexes within the specified range.

    @param {Number|SC.IndexSet} start index, range object or IndexSet
    @param {Number} length optional range length
    @returns {Number} count of indexes
  */
  lengthIn: function(start, length) {

    var ret = 0 ;

    // normalize input
    if (length === undefined) {
      if (start === null || start === undefined) {
        return 0; // nothing to do

      } else if ('number' === typeof start) {
        length = 1 ;

      // if passed an index set, just add each range in the index set.
      } else if (isIndexSet(start)) {
        start.forEachRange(function(start, length) {
          ret += this.lengthIn(start, length);
        }, this);
        return ret;

      } else {
        length = start.length;
        start = start.start;
      }
    }

    // fast path
    if (get(this, 'length') === 0) return 0;

    var content = this._content,
        cur     = 0,
        next    = content[cur],
        lim     = start + length ;

    while (cur<lim && next !== 0) {
      if (next>0) {
        ret += (next>lim) ? lim-cur : next-cur;
      }
      cur  = abs(next);
      next = content[cur];
    }

    return ret ;
  },

  // ..........................................................
  // OBJECT API
  //

  /**
    Optionally set the source property on an index set and then you can
    iterate over the actual object values referenced by the index set.  See
    indexOf(), lastIndexOf(), forEachObject(), addObject() and removeObject().
  */
  source: null,

  /**
    Returns the first index in the set that matches the passed object.  You
    must have a source property on the set for this to work.

    @param {Object} object the object to check
    @param {Number} startAt optional starting point
    @returns {Number} found index or -1 if not in set
  */
  indexOf: function(object, startAt) {
    var source  = get(this, 'source');
    if (!source) throw "%@.indexOf() requires source".fmt(this);

    var len     = get(source, 'length'),

        // start with the first index in the set
        content = this._content,
        cur     = content[0]<0 ? abs(content[0]) : 0,
        idx ;

    while(cur>=0 && cur<len) {
      idx = source.indexOf(object, cur);
      if (idx<0) return -1 ; // not found in source
      if (this.contains(idx)) return idx; // found in source and in set.
      cur = idx+1;
    }

    return -1; // not found
  },

  /**
    Returns the last index in the set that matches the passed object.  You
    must have a source property on the set for this to work.

    @param {Object} object the object to check
    @param {Number} startAt optional starting point
    @returns {Number} found index or -1 if not in set
  */
  lastIndexOf: function(object, startAt) {
    var source  = get(this, 'source');
    if (!source) throw "%@.lastIndexOf() requires source".fmt(this);

    // start with the last index in the set
    var len     = get(source, 'length'),
        cur     = get(this, 'max')-1,
        idx ;

    if (cur >= len) cur = len-1;
    while (cur>=0) {
      idx = source.lastIndexOf(object, cur);
      if (idx<0) return -1 ; // not found in source
      if (this.contains(idx)) return idx; // found in source and in set.
      cur = idx+1;
    }

    return -1; // not found
  },

  /**
    Iterates through the objects at each index location in the set.  You must
    have a source property on the set for this to work.  The callback you pass
    will be invoked for each object in the set with the following signature:

          function callback(object, index, source, indexSet) { ... }

    If you pass a target, it will be used when the callback is called.

    @param {Function} callback function to invoke.
    @param {Object} target optional content. otherwise uses window
    @returns {SC.IndexSet} receiver
  */
  forEachObject: function(callback, target) {
    var source  = get(this, 'source');
    if (!source) throw "%@.forEachObject() requires source".fmt(this);

    var content = this._content,
        cur     = 0,
        idx     = 0,
        next    = content[cur];

    if (target === undefined) target = null ;
    while (next !== 0) {

      while(cur < next) {
        callback.call(target, source.objectAt(cur), cur, source, this);
        cur++;
      }

      cur  = abs(next);
      next = content[cur];
    }
    return this ;
  },

  /**
    Adds all indexes where the object appears to the set.  If firstOnly is
    passed, then it will find only the first index and add it.  If  you know
    the object only appears in the source array one time, firstOnly may make
    this method faster.

    Requires source to work.

    @param {Object} object the object to add
    @param {Boolean} firstOnly Set to true if you can assume that the first
       match is the only one
    @returns {SC.IndexSet} receiver
  */
  addObject: function(object, firstOnly) {
    var source  = get(this, 'source');
    sc_assert("%@.addObject() requires source".fmt(this), !!source);

    var len = get(source, 'length'),
        cur = 0, idx;

    while(cur>=0 && cur<len) {
      idx = source.indexOf(object, cur);
      if (idx >= 0) {
        this.add(idx);
        if (firstOnly) return this ;
        cur = idx++;
      } else return this ;
    }
    return this ;
  },

  /**
    Adds any indexes matching the passed objects.  If firstOnly is passed,
    then only finds the first index for each object.

    @param {SC.Enumerable} objects the objects to add
    @param {Boolean} firstOnly Set to true if you can assume that the first
       match is the only one
    @returns {SC.IndexSet} receiver
  */
  addObjects: function(objects, firstOnly) {
    objects.forEach(function(object) {
      this.addObject(object, firstOnly);
    }, this);
    return this;
  },

  /**
    Removes all indexes where the object appears to the set.  If firstOnly is
    passed, then it will find only the first index and add it.  If  you know
    the object only appears in the source array one time, firstOnly may make
    this method faster.

    Requires source to work.

    @param {Object} object the object to add
    @param {Boolean} firstOnly Set to true if you can assume that the first
       match is the only one
    @returns {SC.IndexSet} receiver
  */
  removeObject: function(object, firstOnly) {
    var source  = get(this, 'source');
    sc_assert("%@.removeObject() requires source".fmt(this), !!source);

    var len = source.get('length'),
        cur = 0, idx;

    while(cur>=0 && cur<len) {
      idx = source.indexOf(object, cur);
      if (idx >= 0) {
        this.remove(idx);
        if (firstOnly) return this ;
        cur = idx+1;
      } else return this ;
    }
    return this ;
  },

  /**
    Removes any indexes matching the passed objects.  If firstOnly is passed,
    then only finds the first index for each object.

    @param {SC.Enumerable} objects the objects to add
    @param {Boolean} firstOnly Set to true if you can assume that the first
       match is the only one
    @returns {SC.IndexSet} receiver
  */
  removeObjects: function(objects, firstOnly) {
    objects.forEach(function(object) {
      this.removeObject(object, firstOnly);
    }, this);
    return this;
  },


  // .......................................
  // PRIVATE
  //

  /**
    Usually observing notifications from IndexSet are not useful, so
    supress them by default.

    @type Boolean
    @default NO
  */
  LOG_OBSERVING: NO,

  /** @private - optimized call to forEach() */
  forEach: function(callback, target) {
    var content = this._content,
        cur     = 0,
        idx     = 0,
        source  = get(this, 'source'),
        next    = content[cur];

    if (target === undefined) target = null ;
    while (next !== 0) {
      while(cur < next) {
        callback.call(target, cur++, idx++, this, source);
      }
      cur  = abs(next);
      next = content[cur];
    }
    return this ;
  },

  /** @private - support iterators */
  nextObject: function(ignore, idx, context) {
    var content = this._content,
        next    = context.next,
        max     = get(this, 'max'); // next boundary

    // seed.
    if (idx === null) {
      idx = next = 0 ;

    } else if (idx >= max) {
      delete context.next; // cleanup context
      return null ; // nothing left to do

    } else idx++; // look on next index

    // look for next non-empty range if needed.
    if (idx === next) {
      do {
        idx = abs(next);
        next = content[idx];
      } while(next < 0);
      context.next = next;
    }

    return idx;
  },

  toString: function() {
    var str = [];
    this.forEachRange(function(start, length) {
      str.push(length === 1 ? start : "%@..%@".fmt(start, start + length - 1));
    }, this);
    return "SC.IndexSet<%@>".fmt(str.join(',')) ;
  }  

}) ;

SC.IndexSet.reopenClass({
  
  /**
    Create can take a simple range as well..
  */
  create: function(start, length) {
    if ('number' === typeof start || isIndexSet(start)) {
      var C = this;
      return new C(start, length);
    } else {
      return this._super.apply(this, arguments);
    }
  },
  
  /**  @private
    Internal setting determines the preferred skip size for hinting sets.

    @type Number
  */
  HINT_SIZE: 256,
  
  /**
    A empty index set.  Useful for common comparisons.
    
    @type SC.IndexSet
  */
  EMPTY: new SC.IndexSet().freeze()
  
});

