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

test("Supports backwards-compatible render method", function() {
  var renderCallCount = 0;
  var view = SC.View.create({
    render: function(context, firstTime) {
      renderCallCount++;
      ok(context._STYLE_REGEX, 'passes RenderContext');
      equals(firstTime, YES, 'passes YES for firstTime');
    }
  });

  view.createLayer();

  view.render = function(context, firstTime) {
    renderCallCount++;
    ok(context._STYLE_REGEX, 'passes RenderContext');
    equals(firstTime, NO, 'passes NO for firstTime');
  };

  view.updateLayer();

  equals(renderCallCount, 2, 'render should have been called twice');

  // Clean up.
  view.destroy();
});

test("Treats a view as its own render delegate", function() {
  var renderCallCount = 0,
      updateCallCount = 0;

  var view = SC.View.create({
    render: function(context) {
      // Check for existence of _STYLE_REGEX to determine if this is an instance
      // of SC.RenderContext
      ok(context._STYLE_REGEX, 'passes render context');
      renderCallCount++;
    },

    update: function(elem) {
     ok(elem.jquery, 'passes a jQuery object as first parameter');
     updateCallCount++;
    }
  });

  view.createLayer();
  view.updateLayer();
  equals(renderCallCount, 1, "calls render once");
  equals(updateCallCount, 1, "calls update once");

  // Clean up.
  view.destroy();
});

test("Passes data source as first parameter if render delegate is not the view", function() {
  var renderCallCount = 0,
      updateCallCount = 0;

  var view;

  var renderDelegate = SC.Object.create({
    render: function(dataSource, context, firstTime) {
      equals(dataSource, view.get('renderDelegateProxy'), "passes the view's render delegate proxy as data source");
      ok(context._STYLE_REGEX, "passes render context");
      equals(firstTime, undefined, "does not pass third parameter");
      renderCallCount++;
    },

    update: function(dataSource, elem) {
      equals(dataSource, view.get('renderDelegateProxy'), "passes view's render delegate proxy as data source");
      ok(elem.jquery, "passes a jQuery object as first parameter");
      updateCallCount++;
    }
  });

  view = SC.View.create({
    renderDelegate: renderDelegate
  });

  view.createLayer();
  view.updateLayer();
  equals(renderCallCount, 1, "calls render once");
  equals(updateCallCount, 1, "calls update once");

  // Clean up.
  view.destroy();
});

test("Extending view with render delegate by implementing old render method", function() {
  var renderCalls = 0, updateCalls = 0;
  var parentView = SC.View.extend({
    renderDelegate: SC.Object.create({
      render: function(context) {
        renderCalls++;
      },

      update: function(cq) {
        updateCalls++;
      }
    })
  });

  var childView = parentView.create({
    render: function(context, firstTime) {
      sc_super();
    }
  });

  childView.createLayer();
  childView.updateLayer();

  equals(renderCalls, 1, "calls render on render delegate once");
  equals(updateCalls, 1, "calls update on render delegates once");
});

test("Views that do not override render should render their child views", function() {
  var newStyleCount = 0, oldStyleCount = 0, renderDelegateCount = 0;

  var parentView = SC.View.design({
    childViews: 'newStyle oldStyle renderDelegateView'.w(),

    newStyle: SC.View.design({
      render: function(context) {
        newStyleCount++;
      },

      update: function() {
        // no op
      }
    }),

    oldStyle: SC.View.design({
      render: function(context, firstTime) {
        oldStyleCount++;
      }
    }),

    renderDelegateView: SC.View.design({
      renderDelegate: SC.Object.create({
        render: function(dataSource, context) {
          ok(dataSource.isViewRenderDelegateProxy, "Render delegate should get passed a view's proxy for its data source");
          renderDelegateCount++;
        },

        update: function() {
          // no op
        }
      })
    })
  });

  parentView = parentView.create();

  parentView.createLayer();
  parentView.updateLayer();

  equals(newStyleCount, 1, "calls render on new style view once");
  equals(oldStyleCount, 1, "calls render on old style view once");
  equals(renderDelegateCount, 1, "calls render on render delegate once");
});
