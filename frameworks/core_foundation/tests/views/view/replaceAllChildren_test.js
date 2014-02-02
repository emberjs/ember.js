// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals, ok */

var parentView;

/*
 * SC.CoreView.UNRENDERED
 * SC.CoreView.UNATTACHED
 * SC.CoreView.UNATTACHED_BY_PARENT
 * SC.CoreView.ATTACHED_SHOWING
 * SC.CoreView.ATTACHED_SHOWN
 * SC.CoreView.ATTACHED_HIDING
 * SC.CoreView.ATTACHED_HIDDEN
 * SC.CoreView.ATTACHED_HIDDEN_BY_PARENT
 * SC.CoreView.ATTACHED_BUILDING_IN
 * SC.CoreView.ATTACHED_BUILDING_OUT
 * SC.CoreView.ATTACHED_BUILDING_OUT_BY_PARENT
 */


module("SC.View.prototype.replaceAllChildren", {

  setup: function () {
    parentView = SC.View.create({
      childViews: ['a', 'b', SC.View],

      a: SC.View,
      b: SC.View
    });
  },

  teardown: function () {
    parentView.destroy();
    parentView = null;
  }

});

test("Replaces all children. UNRENDERED parent view.", function () {
  var childViews = parentView.get('childViews'),
    newChildViews = [SC.View.create(), SC.View.create()];

  equals(childViews.get('length'), 3, "There are this many child views originally");

  // Replace all children.
  parentView.replaceAllChildren(newChildViews);

  childViews = parentView.get('childViews');
  equals(childViews.get('length'), 2, "There are this many child views after replaceAllChildren");
});


test("Replaces all children.  UNATTACHED parent view.", function () {
  var childViews = parentView.get('childViews'),
    newChildViews = [SC.View.create(), SC.View.create()],
    childView, jq;

  // Render the parent view.
  parentView.createLayer();

  equals(childViews.get('length'), 3, "There are this many child views originally");

  jq = parentView.$();
  for (var i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }

  // Replace all children.
  parentView.replaceAllChildren(newChildViews);

  childViews = parentView.get('childViews');
  equals(childViews.get('length'), 2, "There are this many child views after replaceAllChildren");

  jq = parentView.$();
  for (i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The new child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }
});


test("Replaces all children.  ATTACHED_SHOWN parent view.", function () {
  var childViews = parentView.get('childViews'),
    newChildViews = [SC.View.create(), SC.View.create()],
    childView, jq;

  // Render the parent view and attach.
  parentView.createLayer();
  parentView._doAttach(document.body);

  equals(childViews.get('length'), 3, "There are this many child views originally");

  jq = parentView.$();
  for (var i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }

  // Replace all children.
  parentView.replaceAllChildren(newChildViews);

  childViews = parentView.get('childViews');
  equals(childViews.get('length'), 2, "There are this many child views after replaceAllChildren");

  jq = parentView.$();
  for (i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The new child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }
});


module("SC.View.prototype.replaceAllChildren", {

  setup: function () {
    parentView = SC.View.create({
      childViews: ['a', 'b', SC.View],

      containerLayer: function () {
        return this.$('._wrapper')[0];
      }.property('layer').cacheable(),

      a: SC.View,
      b: SC.View,

      render: function (context) {
        context = context.begin().addClass('_wrapper');
        this.renderChildViews(context);
        context = context.end();
      }
    });
  },

  teardown: function () {
    parentView.destroy();
    parentView = null;
  }

});


test("Replaces all children. UNRENDERED parent view.", function () {
  var childViews = parentView.get('childViews'),
    newChildViews = [SC.View.create(), SC.View.create()];

  equals(childViews.get('length'), 3, "There are this many child views originally");

  // Replace all children.
  parentView.replaceAllChildren(newChildViews);

  childViews = parentView.get('childViews');
  equals(childViews.get('length'), 2, "There are this many child views after replaceAllChildren");
});


test("Replaces all children.  UNATTACHED parent view.", function () {
  var childViews = parentView.get('childViews'),
    newChildViews = [SC.View.create(), SC.View.create()],
    childView, jq;

  // Render the parent view.
  parentView.createLayer();

  equals(childViews.get('length'), 3, "There are this many child views originally");

  jq = parentView.$('._wrapper');
  for (var i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }

  // Replace all children.
  parentView.replaceAllChildren(newChildViews);

  childViews = parentView.get('childViews');
  equals(childViews.get('length'), 2, "There are this many child views after replaceAllChildren");

  jq = parentView.$('._wrapper');
  for (i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The new child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }
});


test("Replaces all children using containerLayer.  ATTACHED_SHOWN parent view.", function () {
  var childViews = parentView.get('childViews'),
    newChildViews = [SC.View.create(), SC.View.create()],
    childView, jq;

  // Render the parent view and attach.
  parentView.createLayer();
  parentView._doAttach(document.body);

  equals(childViews.get('length'), 3, "There are this many child views originally");

  jq = parentView.$('._wrapper');
  for (var i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }

  // Replace all children.
  parentView.replaceAllChildren(newChildViews);

  childViews = parentView.get('childViews');
  equals(childViews.get('length'), 2, "There are this many child views after replaceAllChildren");

  jq = parentView.$('._wrapper');
  for (i = 0, len = childViews.get('length'); i < len; i++) {
    childView = childViews.objectAt(i);

    ok(jq.find('#' + childView.get('layerId')).get('length') === 1, "The new child view with layer id %@ exists in the parent view's layer".fmt(childView.get('layerId')));
  }
});
