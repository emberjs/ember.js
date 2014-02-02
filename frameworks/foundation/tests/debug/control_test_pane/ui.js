// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

(function() {
  // var content = []
  // for (var idx=0, len=20; idx<len; ++idx) {
  //   content.push(SC.Record.create({
  //     id: 'item_'+idx,
  //     title: 'Item ' + idx
  //   }))
  // }
  // 
  // var singleSelection = [content[0]];
  // var multiSelectionContiguous = [content[0], content[1], content[2]];
  // var multiSelectionDiscontiguous = [content[0], content[2], content[4]];
  // 
  // var pane = SC.ControlTestPane.design({ height: 100 })
  //   .add("basic", SC.ListView, {
  //     content: content,
  //     contentValueKey: 'title'
  //   })
  //   
  //   .add("disabled", SC.ListView, {
  //     isEnabled: NO,
  //     content: content,
  //     contentValueKey: 'title'
  //   })
  //   
  //   .add("disabled - single selection", SC.ListView, {
  //     isEnabled: NO,
  //     content: content,
  //     contentValueKey: 'title',
  //     selection: singleSelection
  //   })
  //   
  //   .add("single selection", SC.ListView, {
  //     content: content,
  //     contentValueKey: 'title',
  //     selection: singleSelection
  //   })
  //   
  //   .add("multiple selection, contiguous", SC.ListView, {
  //     content: content,
  //     contentValueKey: 'title',
  //     selection: multiSelectionContiguous
  //   })
  //   
  //   .add("multiple selection, discontiguous", SC.ListView, {
  //     content: content,
  //     contentValueKey: 'title',
  //     selection: multiSelectionDiscontiguous
  //   })
  //   
  // pane.show(); // add a test to show the test pane
  
  // ..........................................................
  // TEST PANE
  // 
  
  module('SC.ControlTestPane UI');
  
  test("showing/removing a pane", function() {
    var pane = SC.ControlTestPane.design() ;
    pane = pane.create() ;
    
    ok(pane.$().hasClass('sc-control-test-pane'), 'should have class sc-control-test-pane');
    
    ok(pane.get('isVisible'), 'control test pane should be visible after we create it');
    ok(pane.get('isVisibleInWindow'), 'control tast pane should be visible in the window after we create it');
    
    pane.remove() ;
    
    ok(pane.get('isVisible'), 'control test pane still should be visible after we remove it');
    ok(!pane.get('isVisibleInWindow'), 'control tast pane should NOT be visible in the window after we remove it');
  });
  
  test("adding named children to the pane", function() {
    var pane = SC.ControlTestPane.design() ;
    pane.add('first', SC.View) ;
    pane.add('second', SC.View) ;
    pane.add('third', SC.View) ;
    
    equals(pane.prototype.childViews.length, 6, 'control test pane has correct number of children before create') ;
    pane = pane.create() ;
    equals(pane.getPath('childViews.length'), 6, 'control test pane has correct number of children after create') ;
    
    var childViews = pane.get('childViews') ;
    var firstLabel = childViews[0] ;
    equals(firstLabel.$().text(), 'first:', 'first label should be correct') ;
    
    var secondLabel = childViews[2] ;
    equals(secondLabel.$().text(), 'second:', 'second label should be correct') ;
    
    var thirdLabel = childViews[4] ;
    equals(thirdLabel.$().text(), 'third:', 'third label should be correct') ;
    
    var paneLayer = pane.get('layer') ;
    for (var idx=0, len=6; idx<len; ++idx) {
      var view = childViews[idx] ;
      var layer = view.get('layer') ;
      equals(layer.parentNode, paneLayer, 'control test pane childView has layer with correct parentNode');
    }
    
    pane.remove() ;
  });
  
})();
