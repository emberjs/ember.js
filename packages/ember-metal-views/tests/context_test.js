import { testsFor, View, $, set, appendTo } from "ember-metal-views/tests/test_helpers";
import { addObserver } from "ember-metal/observer";

var view;

testsFor("ember-metal-views - context-related tests");

test("basics", function() {
  var view = {
    isView: true,
    _childViews: [
      {isView: true}
    ]
  };

  var context = {foo: 'foo is here'};
  set(view, 'context', context);

  appendTo(view, '#qunit-fixture');
  var childView = view._childViews[0];
  equal(context, childView.context, "The parent view's context was set on the child");

  context = {foo: 'no need to pity me sucka'};
  set(view, 'context', context);
  equal(context, childView.context, "Changing a parent view's context propagates it to the child");

  View.destroy(view);
});

test("the shared observer for views' context doesn't leak", function() {
  expect(3);

  var context2 = {};
  var view1 = {isView: true, context: {}};
  var view2 = {isView: true, context: context2};

  appendTo(view1, '#qunit-fixture');
  appendTo(view2, '#qunit-fixture');

  addObserver(view1, 'context', null, function() {
    ok(true, "Observer fires for view1");
  });

  addObserver(view2, 'context', null, function() {
    ok(false, "Observer doesn't fire for view2");
  });

  var newContext = {};
  set(view1, 'context', newContext);
  equal(view1.context, newContext, "The new context was set properly");
  equal(view2.context, context2, "The new context didn't leak over to the other view");

  View.destroy(view1);
  View.destroy(view2);
});

test("explicitly set child view contexts aren't clobbered by parent context changes", function() {
  var parentContext = {},
      childContext = {},
      childView = {isView: true, context: childContext},
      view = {
        isView: true, 
        context: parentContext,
        _childViews: [childView]
      };

  appendTo(view, '#qunit-fixture');

  parentContext = {};
  set(view, 'context', parentContext);
  equal(view.context, parentContext, "parent context changed");
  equal(childView.context, childContext, "child context hasn't changed");

  childContext = {};
  set(childView, 'context', childContext);
  equal(childView.context, childContext, "child context changed");
  equal(view.context, parentContext, "parent context hasn't changed");

  parentContext = {};
  set(view, 'context', parentContext);
  equal(view.context, parentContext, "parent context changed");
  equal(childView.context, childContext, "child context hasn't changed");

  View.destroy(view);
});





