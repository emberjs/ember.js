// ========================================================================
// SproutCore -- JavaScript Application Framework
// Copyright ©2006-2011, Strobe Inc. and contributors.
// Portions copyright ©2008 Apple Inc.  All rights reserved.
// ========================================================================

/**
  This View is used by Greenhouse when application is in design mode
  This view draws selection handles for a given designer.  It will also
  forward any mouse events to the underlying designer.
*/
SC.SelectionHandlesView = SC.View.extend({

  /**
    The designer that owns this selection.  mouse and keyboard events are
    forwarded to this.
  */
  designer: null,

  classNames: 'handles',

  render: function(context, firstTime) {
    var designer = this.get('designer'),
        vertical = designer ? designer.get('canResizeVertical') : NO,
        horizontal = designer ? designer.get('canResizeHorizontal') : NO,
        handles ;

    // render handles
    if (firstTime || (vertical !== this._vertical) || (horizontal === this._horizontal)) {
      this._vertical = vertical ;
      this._horizontal = horizontal;

      if (vertical && horizontal) {
        handles = ['top left', 'top right', 'bottom left','bottom right'];
      } else if (vertical) {
        handles = ['top', 'bottom'];
      } else if (horizontal) {
        handles = ['left', 'right'];
      } else handles = [];


      handles.forEach(function(classNames) {
        context.begin('span')
          .addClass(SC.String.w(classNames))
          .addClass('handle')
          .end();
      }, this);
    }

  },

  // ..........................................................
  // EVENT HANDLING
  //
  // By default just forward to designer

  mouseDown: function(evt) {
    var d = this.designer;
    return (d && d.mouseDown) ? d.mouseDown(evt) : null;
  },

  mouseUp: function(evt) {
    var d = this.designer;
    return (d && d.mouseUp) ? d.mouseUp(evt) : null;
  },

  mouseMoved: function(evt) {
    var d = this.designer;
    return (d && d.mouseMoved) ? d.mouseMoved(evt) : null;
  },

  mouseDragged: function(evt) {
    var d = this.designer;
    return (d && d.mouseDragged) ? d.mouseDragged(evt) : null;
  }

});
