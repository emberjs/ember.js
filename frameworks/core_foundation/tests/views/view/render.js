// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

// .......................................................
//  render()
//
module("SC.View#render");

test("default implementation invokes renderChildViews if firstTime = YES", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = SC.View.create({
    displayProperties: ["triggerRenderProperty"],
    childViews: ["child"],

    render: function(context) {
      parentRendered++;
    },

    update: function(jquery) {
      parentUpdated++;
    },

    child: SC.View.create({
      render: function(context) {
        rendered++;
      },

      update: function(jquery) {
        updated++;
      }
    })
  });

  view.createLayer();
  equals(rendered, 1, 'rendered the child');
  equals(parentRendered, 1);

  view.updateLayer(true);
  equals(rendered, 1, 'didn\'t call render again');
  equals(parentRendered, 1, 'didn\'t call the parent\'s render again');
  equals(parentUpdated, 1, 'called the parent\'s update');
  equals(updated, 0, 'didn\'t call the child\'s update');

  // Clean up.
  view.destroy();
});

test("default implementation does not invoke renderChildViews if explicitly rendered in render method", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = SC.View.create({
    displayProperties: ["triggerRenderProperty"],
    childViews: ["child"],

    render: function(context) {
      this.renderChildViews(context);
      parentRendered++;
    },

    update: function(jquery) {
      parentUpdated++;
    },

    child: SC.View.create({
      render: function(context) {
        rendered++;
      },

      update: function(jquery) {
        updated++;
      }
    })
  });

  view.createLayer();
  equals(rendered, 1, 'rendered the child once');
  equals(parentRendered, 1);
  equals(view.$('div').length, 1);

  view.updateLayer(true);
  equals(rendered, 1, 'didn\'t call render again');
  equals(parentRendered, 1, 'didn\'t call the parent\'s render again');
  equals(parentUpdated, 1, 'called the parent\'s update');
  equals(updated, 0, 'didn\'t call the child\'s update');

  // Clean up.
  view.destroy();
});

test("should invoke renderChildViews if layer is destroyed then re-rendered", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  var view = SC.View.create({
    displayProperties: ["triggerRenderProperty"],
    childViews: ["child"],

    render: function(context) {
      parentRendered++;
    },

    update: function(jquery) {
      parentUpdated++;
    },

    child: SC.View.create({
      render: function(context) {
        rendered++;
      },

      update: function(jquery) {
        updated++;
      }
    })
  });

  view.createLayer();
  equals(rendered, 1, 'rendered the child once');
  equals(parentRendered, 1);
  equals(view.$('div').length, 1);

  view.destroyLayer();
  view.createLayer();
  equals(rendered, 2, 'rendered the child twice');
  equals(parentRendered, 2);
  equals(view.$('div').length, 1);

  // Clean up.
  view.destroy();
});
// .......................................................
// renderChildViews()
//

module("SC.View#renderChildViews");

test("creates a context and then invokes renderToContext or updateLayer on each childView", function() {

  var runCount = 0, curContext, curFirstTime ;

  var ChildView = SC.View.extend({
    renderToContext: function(context) {
      equals(context.prevObject, curContext, 'passed child context of curContext');

      equals(context.tagName(), this.get('tagName'), 'context setup with current tag name');

      runCount++; // record run
    },

    updateLayer: function() {
      runCount++;
    }
  });

  var view = SC.View.create({
    childViews: [
      ChildView.extend({ tagName: 'foo' }),
      ChildView.extend({ tagName: 'bar' }),
      ChildView.extend({ tagName: 'baz' })
    ]
  });

  // VERIFY: firstTime= YES
  curContext = view.renderContext('div');
  curFirstTime= YES ;
  equals(view.renderChildViews(curContext, curFirstTime), curContext, 'returns context');
  equals(runCount, 3, 'renderToContext() invoked for each child view');


  // VERIFY: firstTime= NO
  runCount = 0 ; //reset
  curContext = view.renderContext('div');
  curFirstTime= NO ;
  equals(view.renderChildViews(curContext, curFirstTime), curContext, 'returns context');
  equals(runCount, 3, 'updateLayer() invoked for each child view');

  // Clean up.
  view.destroy();
});

test("creates a context and then invokes renderChildViews to call renderToContext on each childView", function() {

  var runCount = 0, curContext ;

  var ChildView = SC.View.extend({
    renderToContext: function(context) {
      equals(context.prevObject, curContext, 'passed child context of curContext');
      equals(context.tagName(), this.get('tagName'), 'context setup with current tag name');
      runCount++; // record run
    }
  });

  var view = SC.View.create({
    childViews: [
      ChildView.extend({ tagName: 'foo' }),
      ChildView.extend({ tagName: 'bar' }),
      ChildView.extend({ tagName: 'baz' })
    ]
  });

  // VERIFY: firstTime= YES
  curContext = view.renderContext('div');
  view.renderChildViews(curContext);
  equals(runCount, 3, 'renderToContext() invoked for each child view');

  // Clean up.
  view.destroy();
});
