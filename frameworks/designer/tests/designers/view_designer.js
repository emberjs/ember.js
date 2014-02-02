// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Mike Ball and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test htmlbody ok equals same stop start v*/

(function() {
  var basic, testView, page;
  // ..........................................................
  // TEST VIEWS
  // 
  module('SC.ViewDesigner', {
    setup: function () {
      testView = SC.View.extend({
        mouseDown: function(){
          var page = this.get('page');
          page.set('mouseDownInView', YES);
        }
      });
      testView.Designer = SC.ViewDesigner.extend({
        mouseDown: function(){
          var page = this.get('page');
          page.set('mouseDownInDesigner', YES);
        }
      });
      basic = SC.Page.design({
        needsDesigner: true, 
        mouseDownInView: false, 
        mouseDownInDesigner: false,
        view: testView.design({})
      });
      
      
    },
    teardown: function () {}
  });

  test("tryToPerform redirects to designer",function() {
    var view = basic.get('view');
    view.tryToPerform('mouseDown', {});
    ok(basic.get('mouseDownInDesigner'), "designer got mouseDown");
    ok(!basic.get('mouseDownInView'), "view did not get mouseDown");
  });

})();
