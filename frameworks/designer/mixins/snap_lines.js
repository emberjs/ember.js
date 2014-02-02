// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC SnapLines
// ========================================================================
sc_require('views/drawing');
/**
  @mixin
  @author Mike Ball
  
  Add this Mixin to any View and it gives you an API to draw snap lines for
  all the child views
*/

//the number of pixles that will cause a snap line (factor of 2?)
SC.SNAP_ZONE = 2;

SC.SNAP_LINE = {
  shape: SC.LINE,
  start: {x: 0, y: 0},
  end: {x: 0, y: 0},
  style: {
    width: 0.5,
    color: '#00c6ff'
    //transparency: 0.2
  }
};


SC.SnapLines = {
  
  hasSnapLines: YES,
  
  
  
  /*
    This method will setup the data structure required to draw snap lines
    it should be called in dragStarted if using with an `SC.Drag` or on
    `mouseDown` if using it with a move
  
    @param {Array} ignoreViews array of views to not include
    sets up the data structure used for the line drawing
  */
  setupData: function(ignoreViews){
    if(!ignoreViews) ignoreViews = [];
    this.removeLines(); //can't have any existing lines
    this._xPositions = {};
    this._yPositions = {}; 
    
    var xPositions = this._xPositions, yPositions = this._yPositions, children = this.get('childViews'), 
        that = this, parentView, frame, minX, midX, maxX, minY, midY, maxY, factor = (SC.SNAP_ZONE*2);
    
    
    // little insert utility
    var insert = function(min, mid, max, child, positions){
      var origMin = min, origMid = mid, origMax = max;
      min = Math.floor(min/factor);
      mid = Math.floor(mid/factor);
      max = Math.floor(max/factor);
      if(positions[min]){
        positions[min].push({value: origMin, child: child});
      }
      else{
        positions[min] = [{value: origMin, child: child}];
      }
      
      if(positions[mid]){
        positions[mid].push({value: origMid, child: child});
      }
      else{
        positions[mid] = [{value: origMid, child: child}];
      }
      
      if(positions[max]){
        positions[max].push({value: origMax, child: child});
      }
      else{
        positions[max] = [{value: origMax, child: child}];
      }
    };

    parent = this;    
    children.forEach(function(child){
      if(ignoreViews.indexOf(child) < 0){
        frame = parent ? parent.convertFrameToView(child.get('frame'), null) : child.get('frame');
      
        minX = frame.x;
        midX = SC.midX(frame);
        maxX = frame.x + frame.width;
        insert(minX, midX, maxX, child, xPositions);
      
      
        minY = frame.y;
        midY = SC.midY(frame);
        maxY = frame.y + frame.height;
        insert(minY, midY, maxY, child, yPositions);
      }
    });

    //add the parent
    parent = this.get('parentView');
    frame = parent ? parent.convertFrameToView(this.get('frame'), null) : this.get('frame');
    this._globalFrame = frame;
    minX = frame.x;
    midX = SC.midX(frame);
    maxX = frame.x + frame.width;
    insert(minX, midX, maxX, this, xPositions);
    
    
    minY = frame.y;
    midY = SC.midY(frame);
    maxY = frame.y + frame.height;
    insert(minY, midY, maxY, this, yPositions);
    
    
  },
  
  /**
    This method will check the passed views position with the other child views
    and draw any lines.  It should be called in `dragUpdated` if using `SC.Drag`
    or in `mouseMoved` if using a move.  it will also return a hash of the
    snapped coords in local and global coordinates
    
  */
  drawLines: function(view, eventX, eventY, mouseDownX, mouseDownY){
    if(!this._drawingView){
      this._drawingView = this.createChildView(SC.DrawingView.design({
        shapes: []
      }));
      this.appendChild(this._drawingView);
    }
    var factor = (SC.SNAP_ZONE*2), shapes = [], xline, yline, frame, parent, rMinX, rMidX, rMaxX,
        rMinY, rMidY, rMaxY, rMinXMod, rMidXMod, rMaxXMod, rMinYMod, rMidYMod, rMaxYMod, xHit, yHit,
        moveDirection = this._dragDirection(eventX, eventY, mouseDownX, mouseDownY), xValues, yValues, 
        that = this, xHitVals, yHitVals, ret;
    //get the frame and all the relevant points of interest
    parent = view.get('parentView');
    frame = parent ? parent.convertFrameToView(view.get('frame'), null) : view.get('frame');
    rMinX = SC.minX(frame);
    rMidX = SC.midX(frame);
    rMaxX = SC.maxX(frame);
    rMinY = SC.minY(frame);
    rMidY = SC.midY(frame);
    rMaxY = SC.maxY(frame);
    rMinXMod = Math.floor(rMinX/factor);
    rMidXMod = Math.floor(rMidX/factor);
    rMaxXMod = Math.floor(rMaxX/factor);
    rMinYMod = Math.floor(rMinY/factor);
    rMidYMod = Math.floor(rMidY/factor);
    rMaxYMod = Math.floor(rMaxY/factor);
    
    //array of tuples containing the mod and the value you need to add to the resulting position
    xValues = moveDirection.UP ? [{mod: rMinXMod, val: 0}, {mod: rMidXMod, val: frame.width/2}, {mod: rMaxXMod, val: frame.width}] : [{mod: rMaxXMod, val: frame.width}, {mod: rMidXMod, val: frame.width/2}, {mod: rMinXMod, val: 0}];
    //compute the three possible line positions
    xValues.forEach(function(xVal){
      if(that._xPositions[xVal.mod]){
        xHitVals = xVal;
        xHit = that._xPositions[xVal.mod][0].value - that._globalFrame.x;
        return;
      }
    });
    if(!SC.none(xHit)){
      xline = SC.copy(SC.SNAP_LINE);
      xline.start = {x: xHit, y: 0};
      xline.end = {x: xHit, y: this._globalFrame.height};
      shapes.push(xline);
    }
    
    yValues = moveDirection.LEFT ? [{mod: rMinYMod, val: 0}, {mod: rMidYMod, val: frame.height/2}, {mod: rMaxYMod, val: frame.height}] : [{mod: rMaxYMod, val: frame.height}, {mod: rMidYMod, val: frame.height/2}, {mod: rMinYMod, val: 0}];
    //compute the three possible line positions
    yValues.forEach(function(yVal){
      if(that._yPositions[yVal.mod]){
        yHitVals = yVal;
        yHit = that._yPositions[yVal.mod][0].value - that._globalFrame.y;
        return;
      }
    });
    if(!SC.none(yHit)){
      yline = SC.copy(SC.SNAP_LINE);
      yline.start = {y: yHit, x: 0};
      yline.end = {y: yHit, x: this._globalFrame.width};
      shapes.push(yline);
    }
    this._drawingView.set('shapes', shapes);
    ret = {pageX: xHit + this._globalFrame.x, pageY: yHit + this._globalFrame.y, frameX: xHit, frameY: yHit};
    if(xHitVals){
      ret.pageX -= xHitVals.val;
      ret.frameX -= xHitVals.val;
    }
    if(yHitVals){
      ret.pageY -= yHitVals.val;
      ret.frameY -= yHitVals.val;
    }
    return ret;
  },
  
  /*
    called to cleanup the lines...
    This method should be called in `mouseUp` if doing a move and in
    `dragEnded` if using a `SC.Drag`.
  */
  removeLines: function() {
    this._xPositions = null;
    this._yPositions = null;
    this._globalFrame = null;
    if(this._drawingView) {
      this.removeChild(this._drawingView);
      this._drawingView = null;
    }
  },
  
  /*
    takes the event x, y and mouseDown x, y and computes a direction
  */
  _dragDirection: function(eventX, eventY, mouseDownX, mouseDownY){
    var deltaX = eventX - mouseDownX, deltaY = eventY - mouseDownY, ret = {};
    ret.UP = deltaX > 0 ? NO : YES;
    ret.DOWN = deltaX > 0 ? YES : NO;
    ret.LEFT = deltaY > 0 ? NO : YES;
    ret.RIGHT = deltaY > 0 ? YES : NO;
    return ret;
  }
};

