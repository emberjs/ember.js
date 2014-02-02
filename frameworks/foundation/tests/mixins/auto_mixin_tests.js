// ==========================================================================
// Project:   Showcase
// Copyright: ©2013 7x7 Software, Inc.
// License:   Licensed under MIT license
// ==========================================================================
/*globals module, test, ok, equals */

module("SC.AutoMixin");

test("Auto mixins should be applied to child views.", function () {
  var A, B, a, d;

  // Create a child view ahead of time. This will be unaffected by autoMixins.
  d = SC.View.create({
    foo: false
  });

  B = SC.View.extend({
    baz: false
  });

  // Create a view class that uses SC.AutoMixin
  A = SC.View.extend(SC.AutoMixin, {
    autoMixins: [{ foo: true }, { bar: true }],

    createChildViews: function () {
      var childViews = this.get('childViews'),
        len = childViews.length,
        idx, key, view;

      // swap the array
      for (idx = 0; idx < len; ++idx) {
        key = view = childViews[idx];

        // is this is a key name, lookup view class
        if (typeof key === SC.T_STRING) {
          view = this[key];
        } else {
          key = null;
        }

        var uniqueHash = { idx: idx };
        uniqueHash['prop_for_view_' + idx] = true;
        view = this.createChildView(view, uniqueHash);
        if (key) { this[key] = view; } // save on key name if passed

        childViews[idx] = view;
      }

      return this;
    },

    childViews: ['b', 'c', d],

    b: B.extend({
      bar: false,
      baz: true
    }),
    c: B
  });

  // Create an instance of the view class.
  a = A.create();
  ok(a.b.foo, "The first child view has the foo property.");
  ok(a.b.bar, "The first child view has the bar property (overridden by mixin).");
  ok(a.b.baz, "The first child view has the baz property (overridden by extend).");
  equals(a.b.idx, 0, "The first child view has the idx property of");
  ok(a.b.prop_for_view_0, "The first child view has the prop_for_view_0 property (set by the view).");

  ok(a.c.foo, "The second child view has the foo property.");
  ok(a.c.bar, "The second child view has the bar property.");
  ok(!a.c.baz, "The second child view doesn't have the baz value from the previous child view.");
  equals(a.c.idx, 1, "The second child view has the idx property of");
  ok(SC.none(a.c.prop_for_view_0), "The second child view doesn't have the prop_for_view_0 property (set by the view on previous child view).");
  ok(a.c.prop_for_view_1, "The second child view has the prop_for_view_1 property (set by the view).");

  ok(!d.foo, "The pre-initialized child view is unaffected by autoMixins.");
});
