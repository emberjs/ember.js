// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global CoreTest, module, test */

// SC.LOG_BINDINGS = YES;
// SC.LOG_DEFERRED_CALLS = YES;

var view, content, pane;

var renderFunc = CoreTest.stub("render", function () {
  SC.ListItemView.prototype.render.apply(this, arguments);
});

module("SC.ListView.render", {

  setup: function () {
    SC.run(function () {
      content = "1 2 3 4 5 6 7 8 9 10".w().map(function (x) {
        return SC.Object.create({ value: x });
      });

      view = SC.ListView.create({
        content: content,

        layout: { top: 0, left: 0, width: 300, height: 500 },

        layoutForContentIndex: function (idx) {
          return { left: 0, right: 0, top: idx * 50, height: 50 };
        },

        _cv_nowShowingDidChange: CoreTest.stub("_cv_nowShowingDidChange", function () {
          SC.ListView.prototype._cv_nowShowingDidChange.apply(this, arguments);
        }),

        exampleView: SC.ListItemView.extend({
          render: renderFunc
        }),

        // reset stubs
        reset: function () {
          this._cv_nowShowingDidChange.reset();
          renderFunc.reset();
        }

      });

      pane = SC.Pane.create({
        layout: { width: 200, height: 400 }
      });
      pane.appendChild(view);
      pane.append();
    });
  },

  teardown: function () {
    SC.run(function () {
      view.reset();
      pane.remove();
      pane.destroy();
    });
  }

});

// ..........................................................
// BASIC TESTS
//

test("list item render() should only be called once per item view a static content array", function () {
  renderFunc.expect(10);
});

test("_cv_nowShowingDidChange() should only be called once with a static content array", function () {
  view._cv_nowShowingDidChange.expect(3); // currently is 3... could it be once?
});
