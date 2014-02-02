// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same htmlbody */

module("Create a pane with some custom views and adding it to the window", {
  setup: function(){
    htmlbody('<style>.sc-view { border: 1px red solid; z-index: -1; position: absolute; }</style>');
  },
  teardown: function(){
    clearHtmlbody();
  }
});

test("layer creation and management", function() {
  
  // create custom view w/ render method
  var MyView = SC.View.extend({
    cv: 0,
    
    displayProperties: 'cv'.w(),
    
    render: function(context, firstTime) {
      this.renderChildViews(context, YES); // always re-render...
      context.begin()
        .push('View %@'.fmt(this.get('cv')))
      .end();
    }
  });
  
  // create design
  var pane = SC.Pane.design()
    .layout({ bottom: 10, right: 20, top: 20, left: 20 })
    .childView(MyView.design({ cv: 1 })
      .classNames('view-1')
      .layout({ top: 50 })
      .childView(MyView.design({ cv: 2 })
        .classNames('view-2')
        .layout({ bottom: 10, right: 20, width: 100, height: 23 })));
    
  
  // instantiate pane...
  pane = pane.create();
  var cv1 = pane.childViews[0], cv2 = cv1.childViews[0];
  
  // pane should have nested child views.
  equals(cv1.cv, 1, 'has childView 1');
  equals(cv2.cv, 2, 'has childView 2');
  
  // it should not have a layer yet (nor should children)
  ok(!pane.get('layer'), 'pane has no layer');
  ok(!cv1.get('layer'), 'cv1 has no layer');
  ok(!cv2.get('layer'), 'cv2 has no layer');
  
  // if we mark cv2 as needed an update, it should not do anything, even at
  // end of the runloop.
  // -- temporarily replace updateLayer()
  var runCount = 0; 
  cv2.updateLayer = function() { runCount++; };
  SC.RunLoop.begin();
  cv2.set('displayNeedsUpdate', YES) ;
  SC.RunLoop.end();
  
  // updateLayer should NOT have run...
  equals(runCount, 0, 'cv2.updateLayer did not run');
  
  // restore original updateLayer
  delete cv2.updateLayer ;
  
  // all the views should have their isVisibleInWindow set to NO now
  ok(!pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be NO');
  ok(!cv1.get('isVisibleInWindow'), 'cv1.isVisibleInWindow should be NO');
  ok(!cv2.get('isVisibleInWindow'), 'cv2.isVisibleInWindow should be NO');
  // -----
  // OK, let's add this baby to the window
  SC.RunLoop.begin();
  pane.append();
  SC.RunLoop.end();
  
  // all the views should have their isVisibleInWindow set to YES now
  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');
  ok(cv1.get('isVisibleInWindow'), 'cv1.isVisibleInWindow should be YES');
  ok(cv2.get('isVisibleInWindow'), 'cv2.isVisibleInWindow should be YES');

  // pane should have layer...cv's should not have had to find their layers
  // yet.
  ok(pane.get('layer'), 'pane has layer');
  ok(!cv1._view_pane, 'cv1 has not found its layer yet') ;
  ok(!cv2._view_pane, 'cv2 has not found its layer yet') ;
  
  // now let's make sure the pane layer has some of the things we expect...
  var layer = pane.get('layer');
  equals(layer.firstChild.id, cv1.get('layerId'), 'has cv1 elem');
  equals(layer.firstChild.firstChild.id, cv2.get('layerId'), 'has cv2 elem');
  layer = null;
  
  // but if we get the layer for cv1 & cv2 they should find them...
  ok(cv1.get('layer'), 'cv1 can find its layer');
  ok(cv2.get('layer'), 'cv2 can find its layer');
  
  // also, the pane should now belong to the main document body.  it should 
  // have a parent.
  equals(pane.get('layer').parentNode, document.body, 'panes layer is in document body');
  
  // ok, now we're going to change the view number for cv2 and see if that
  // updates the UI.
  SC.RunLoop.begin();
  cv2.set('cv', 'foo');
  SC.RunLoop.end();
  
  // the innerHTML for cv2 should now contain 'View foo'
  layer = cv2.get('layer');
  ok(layer.innerHTML.toString().match(/View foo/), 'does not have new label!');
  
});
