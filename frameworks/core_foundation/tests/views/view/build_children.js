// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

var buildableView, parent;
module('SC.Buildable', {
  setup: function() {
    parent = SC.View.create({
      buildInDidFinishFor: function() {
        sc_super();
        this.called_buildInDidFinishFor = YES;
      },
      buildOutDidFinishFor: function() {
        sc_super();
        this.called_buildOutDidFinishFor = YES;
      }
    });
    buildableView = SC.View.create({
      buildIn: function() {
        this.called_any = YES;
        this.called_buildIn = YES;
      },
      
      resetBuild: function() {
        this.called_any = YES;
        this.called_resetBuild = YES;
      },
      
      buildOut: function() {
        this.called_any = YES;
        this.called_buildOut = YES;
      },
      
      buildOutDidCancel: function() {
        this.called_any = YES;
        this.called_buildOutDidCancel = YES;
      },
      
      buildInDidCancel: function() {
        this.called_any = YES;
        this.called_buildInDidCancel = YES;
      }
    });
  },
  
  teardown: function() {
  }
});

test("Calling buildInChild adds child and builds it in.", function(){
  var v = buildableView, p = parent;
  p.buildInChild(v);
  
  // check right after build in is called
  ok(v.called_buildIn, "child started build in.");
  ok(v.isBuildingIn, "child is building in.");
  ok(!p.called_buildInDidFinishFor, "child has not finished building in, according to parent.");
  
  // the parent view should be set already
  equals(v.get("parentView"), p, "Parent view should be the parent");
  
  // finish build in
  v.buildInDidFinish();
  
  // now check that the view registered that finish
  ok(p.called_buildInDidFinishFor, "child has finished building in, according to parent.");
});


test("Calling buildOutChild builds out the child, and only removes it when done.", function() {
  var v = buildableView, p = parent;
  p.buildInChild(v);
  v.buildInDidFinish();
  
  p.buildOutChild(v);
  ok(v.called_buildOut, "child started build out.");
  ok(v.isBuildingOut, "child is building out.");
  ok(!p.called_buildOutDidFinishFor, "child has not finished building out, according to parent.");
  equals(v.get("parentView"), p, "Parent view should still be the former parent");
  
  // finish build out
  v.buildOutDidFinish();
  
  ok(p.called_buildOutDidFinishFor, "child has finished building out, according to parent.");
  equals(v.get("parentView"), null, "Parent view is now null");
});
