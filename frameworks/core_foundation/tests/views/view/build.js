// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test ok */

var buildableView, parent;
module('SC.Buildable', {
  setup: function () {
    parent = SC.View.create();
    buildableView = SC.View.create({
      buildIn: function () {
        this.called_any = YES;
        this.called_buildIn = YES;
      },

      resetBuild: function () {
        this.called_any = YES;
        this.called_resetBuild = YES;
      },

      buildOut: function () {
        this.called_any = YES;
        this.called_buildOut = YES;
      },

      buildOutDidCancel: function () {
        this.called_any = YES;
        this.called_buildOutDidCancel = YES;
      },

      buildInDidCancel: function () {
        this.called_any = YES;
        this.called_buildInDidCancel = YES;
      }
    });
  },

  teardown: function () {
    parent.destroy();
    buildableView.destroy();
  }
});

test("resetBuildState calls resetBuild", function (){
  ok(!buildableView.called_any, "Nothing should have happened yet.");
  buildableView.resetBuildState();
  ok(buildableView.called_resetBuild, "reset should have been called");
});

test("changing parent view calls resetBuild", function () {
  ok(!buildableView.called_any, "Nothing should have happened yet.");
  parent.appendChild(buildableView);
  ok(buildableView.called_resetBuild, "reset should have been called");
});

test("buildInToView starts build in", function () {
  buildableView.willBuildInToView(parent);
  ok(!buildableView.isBuildingIn, "Should not be building in yet.");
  buildableView.buildInToView(parent);
  ok(buildableView.isBuildingIn, "Should now be building in.");
  ok(buildableView.called_buildIn, "Build in should have been called.");
});

test("buildOutFromView starts build out", function () {
  buildableView.willBuildInToView(parent);
  buildableView.buildInToView(parent);
  buildableView.buildInDidFinish(); // hack this in here, because our implementations above purposefully don't.

  ok(!buildableView.isBuildingOut, "Should not yet be building out.");
  buildableView.buildOutFromView(parent);
  ok(buildableView.isBuildingOut, "View should now be building out.");
});

test("resetBuildState cancels buildOut", function () {
  buildableView.willBuildInToView(parent);
  buildableView.buildInToView(parent);
  buildableView.buildInDidFinish(); // hack this in here, because our implementations above purposefully don't.

  buildableView.buildOutFromView(parent);
  ok(buildableView.isBuildingOut, "View should now be building out.");

  buildableView.resetBuildState(parent);
  ok(!buildableView.isBuildingOut, "View should no longer be building out.");
  ok(buildableView.called_buildOutDidCancel, "Cancel ought to have been called.");
});
