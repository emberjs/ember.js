// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
SC.mixin( /** @scope SC */ {
  /** A Point at {0,0} */
  ZERO_POINT: { x: 0, y: 0 },

  /** Check if the given point is inside the rect. */
  pointInRect: function(point, f) {
    return  (point.x >= SC.minX(f)) &&
            (point.y >= SC.minY(f)) &&
            (point.x <= SC.maxX(f)) &&
            (point.y <= SC.maxY(f)) ;
  },

  /** Return true if the two frames match.  You can also pass only points or sizes.

    @param r1 {Rect} the first rect
    @param r2 {Rect} the second rect
    @param delta {Float} an optional delta that allows for rects that do not match exactly. Defaults to 0.1
    @returns {Boolean} true if rects match
   */
  rectsEqual: function(r1, r2, delta) {
    if (!r1 || !r2) return (r1 == r2) ;
    if (!delta && delta !== 0) delta = 0.1;
    if ((r1.y != r2.y) && (Math.abs(r1.y - r2.y) > delta)) return NO ;
    if ((r1.x != r2.x) && (Math.abs(r1.x - r2.x) > delta)) return NO ;
    if ((r1.width != r2.width) && (Math.abs(r1.width - r2.width) > delta)) return NO ;
    if ((r1.height != r2.height) && (Math.abs(r1.height - r2.height) > delta)) return NO ;
    return YES ;
  },

  /** Returns the insersection between two rectangles.

    @param r1 {Rect} The first rect
    @param r2 {Rect} the second rect
    @returns {Rect} the intersection rect.  width || height will be 0 if they do not interset.
  */
  intersectRects: function(r1, r2) {
    // find all four edges
    var ret = {
      x: Math.max(SC.minX(r1), SC.minX(r2)),
      y: Math.max(SC.minY(r1), SC.minY(r2)),
      width: Math.min(SC.maxX(r1), SC.maxX(r2)),
      height: Math.min(SC.maxY(r1), SC.maxY(r2))
    } ;

    // convert edges to w/h
    ret.width = Math.max(0, ret.width - ret.x) ;
    ret.height = Math.max(0, ret.height - ret.y) ;
    return ret ;
  },

  /** Returns the union between two rectangles

    @param r1 {Rect} The first rect
    @param r2 {Rect} The second rect
    @returns {Rect} The union rect.
  */
  unionRects: function(r1, r2) {
    // find all four edges
    var ret = {
      x: Math.min(SC.minX(r1), SC.minX(r2)),
      y: Math.min(SC.minY(r1), SC.minY(r2)),
      width: Math.max(SC.maxX(r1), SC.maxX(r2)),
      height: Math.max(SC.maxY(r1), SC.maxY(r2))
    } ;

    // convert edges to w/h
    ret.width = Math.max(0, ret.width - ret.x) ;
    ret.height = Math.max(0, ret.height - ret.y) ;
    return ret ;
  },

  /** Duplicates the passed rect.

    This is faster than Object.clone().

    @param r {Rect} The rect to clone.
    @returns {Rect} The cloned rect
  */
  cloneRect: function(r) {
    return { x: r.x, y: r.y, width: r.width, height: r.height } ;
  },

  /** Returns a string representation of the rect as {x, y, width, height}.

    @param r {Rect} The rect to stringify.
    @returns {String} A string representation of the rect.
  */
  stringFromRect: function(r) {
    if (!r) {
      return "(null)";
    }
    else {
      return '{ x:'+r.x+', y:'+r.y+', width:'+r.width+', height:'+r.height+' }';
    }
  }


});
