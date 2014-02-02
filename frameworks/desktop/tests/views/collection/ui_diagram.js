// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/* Test SC.StackedView with a Comments example. */

var ShapeView = SC.View.extend(SC.Control, {

  content: null,

  classNames: 'shape',

  DIMENSION_KEYS: 'x y width height'.w(),

  contentPropertyDidChange: function(target, key) {
    if (key === '*') {
      this.recomputeLayout();
      this.displayDidChange();
    } else if (key === 'label') {
      this.displayDidChange();
    } else if (this.DIMENSION_KEYS.indexOf(key) >= 0) {
      this.recomputeLayout();
    }
  },

  recomputeLayout: function() {
    var content = this.get('content'), layout ;
    if (content) {
      layout = {
        top: content.get('y'),
        left: content.get('x'),
        width: content.get('width'),
        height: content.get('height')
      };
    } else {
      layout = { top: 0, left: 0, height: 0, width: 0 };
    }

    this.set('layout', layout);
  },

  render: function(context, firstTime) {
    var label = this.getPath('content.label');
    context.push('<label>', label, '</label>');
  }
});

var content = [
  SC.Object.create({
    label: "Shape 1",
    x: 10, y: 10, width: 100, height: 50
  }),

  SC.Object.create({
    label: "Shape 2",
    x: 50, y: 50, width: 65, height: 200
  }),

  SC.Object.create({
    label: "Shape 3",
    x: 100, y: 80, width: 200, height: 72
  })

];

var extra = SC.Object.create({
  label: "Extra Shape",
  x: 70, y: 70, width: 40, height: 50
});

var ShapeCanvasView = SC.CollectionView.extend({

  // save position on screen at mouse down so that we can properly compute
  // you can save in mouseDownInfo, which will be cleared on mouseUp
  mouseDown: function(ev) {
    var ret = sc_super();
    if (ret) {
      var offset = { x: ev.pageX, y: ev.pageY };
      this.mouseDownInfo.dragAnchor = this.convertFrameFromView(offset, null);
    }
    return ret ;
  },

  // handle dragging of content around on the screen
  mouseDragged: function(ev) {
    var info   = this.mouseDownInfo,
        items  = info.dragContent,
        anchor = info.dragAnchor,
        xpoints = info.xpoints,
        ypoints = info.ypoints,
        adjust, sel, item, content, idx;

    // if no items have been collected yet, this is the first time drag is
    // called.  collect content items to drag.  If there is no selection, etc
    // just clear the anchor prop so that we don't try to drag again
    if (!items) {
      sel = this.get('selection');
      content = this.get('content');

      // collect info about items to drag.  save initial x/y coordinates so we
      // can edit them later
      if (content && sel && sel.get('length') > 0) {

        xpoints = info.xpoints = [];
        ypoints = info.ypoints = [];
        items   = info.dragContent = [];

        sel.forEach(function(idx) {
          item = content.objectAt(idx);
          if (!item) return; // nothing to do here
          items.push(item);
          xpoints.push(item.get('x'));
          ypoints.push(item.get('y'));
        }, this);

        info.shouldReselect = NO; // once we drag, don't alter selection

      // if no content or no selection or selection is empty, just disable
      } else anchor = info.dragAnchor = null ;
    }

    // if anchor is empty, dragging is disabled for this mouse down.
    if (!anchor) return sc_super();

    // now figure the adjustment for content items.
    adjust = this.convertFrameFromView({ x: ev.pageX, y: ev.pageY }, null);
    adjust.x -= anchor.x;
    adjust.y -= anchor.y;

    // and move each
    idx = items.length;
    while(--idx >= 0) {
      item = items[idx];
      item.beginPropertyChanges()
        .set('x', xpoints[idx] + adjust.x)
        .set('y', ypoints[idx] + adjust.y)
      .endPropertyChanges();
    }

    return YES ;
  }

});

var pane = SC.ControlTestPane.design()
  .add("basic", ShapeCanvasView, {
    layout: { top: 0, left: 0, right: 0, height: 300 },
    content: content,
    exampleView: ShapeView,
    allowDeselectAll: YES
  });

// ..........................................................
// BASIC TESTS
//
module("Basic Tests", {
  setup: function(){
    htmlbody(["<style>",
      '.sc-collection-view { border: 1px black solid; background-color: white; }',
      '.shape.sel { background-color: #f55; color: white; }',
      '.shape { background-color: #ddd; border: 1px black solid; color: black; box-shadow: 3px 3px 5px #888; }',
      '.shape label { position: absolute; left: 0; right: 0; height: 12px; margin-top: -6px; top: 50%; font-size: 11px; text-align: center; }',
    '</style>'].join("\n"));
    pane.standardSetup().setup();
  },
  teardown: function(){
    pane.standardSetup().teardown();
    clearHtmlbody();
  }
});


// ..........................................................
// SPECIAL CASES
//

// tests specific bug where a series of many edits strung together would
// cause the height to get out of sync.




