// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view, content1, content2 ;

module("SC.CollectionView.content", {
  setup: function() {

    // stub in collection view to verify that proper method are called
    view = SC.CollectionView.create({

      // ..........................................................
      // STUB: contentPropertyDidChange
      //
      contentPropertyDidChange: CoreTest.stub('contentPropertyDidChange'),

      // ..........................................................
      // STUB: computeLayout
      //
      computeLayout: CoreTest.stub('computeLayout'),

      // ..........................................................
      // STUB: RELOAD
      //
      reload: CoreTest.stub("reload", {

        // detect if we would reload everything.
        shouldReloadAll: function() {
          var history = this.history,
              loc = history.length,
              args;

          while(--loc >= 0) {
            args = history[loc];
            if (args <= 1) return YES ;
            if (args[1] === null) return YES ;
            if (args[0].get('nowShowing').contains(args[1])) return YES ;
          }
          return NO ;
        },

        // join all reload indexes passed excluding null or undefined
        indexes: function() {
          var history = this.history,
              loc = history.length,
              ret = SC.IndexSet.create(),
              args;

          while(--loc >= 0) {
            args = history[loc];
            if (args[1] && args[1].isIndexSet) ret.add(args[1]);
          }

          return ret ;
        },

        // need to save the passed indexes set as a clone because it may be
        // reused later...
        action: function(indexes) {
          var history = this.reload.history;  // note "this" is view
          if (indexes) {
            history[history.length-1][1] = indexes.clone();
          }

          // simulate calling computeLayout() to match original impl.
          this.computeLayout();

          return this ;
        },

        expect: function(indexes, callCount) {

          if (indexes === YES) {
            equals(this.shouldReloadAll(), YES, 'reload() should reload all');
          } else if (indexes !== NO) {
            var expected = this.indexes();
            var passed = indexes.isEqual(expected);
            ok(passed, "expected reload(%@), actual: reload(%@)".fmt(indexes, expected));
          }

          if (callCount !== undefined) {
            equals(this.callCount, callCount, 'reload() should have been called X times');
          }

          this.reset();
        }

      }),

      expectLength: function(len) {
        equals(view.get('length'), len, 'view.length after change');


        var nowShowing = view.get('nowShowing'),
            expected = SC.IndexSet.create(0,len);
        ok(expected.isEqual(nowShowing), 'nowShowing expected: %@, actual: %@'.fmt(expected, nowShowing));
      },

      // reset stubs
      reset: function() {
        this.reload.reset();
        this.contentPropertyDidChange.reset();
        this.computeLayout.reset();
      }

    });

    content1 = "a b c d e f".w().map(function(x) {
      return SC.Object.create({ title: x });
    });

    content2 = "d e f x y z".w().map(function(x) {
      return SC.Object.create({ title: x });
    });

  }
});

// ..........................................................
// BASIC EDITS
//

test("setting content for first time", function() {
  equals(view.get('content'), null, 'precond - view.content should be null');

  view.set('content', content1);
  view.reload.expect(YES, 2); // should reload everything
  view.contentPropertyDidChange.expect(0); // should not call
  view.computeLayout.expect(YES);
  view.expectLength(content1.get('length'));
});

test("changing content with different size", function() {

  view.set('content', "a b".w());
  view.reset();

  view.set('content', content2);
  view.reload.expect(YES, 2); // call twice?
  view.contentPropertyDidChange.expect(0); // should not call
  view.computeLayout.expect(YES);
  view.expectLength(content2.get('length'));
});

test("changing content with same size", function() {

  view.set('content', "a b".w());
  view.reset();

  view.set('content', content2);
  view.reload.expect(YES);
  view.contentPropertyDidChange.expect(0); // should not call
  view.computeLayout.expect(YES);
  view.expectLength(content2.get('length'));
});

test("changing the content of a single item should reload that item", function() {

  view.set('content', content1);
  view.reset(); // don't care about this fire

  content1.replace(1,1, ["X"]);
  view.reload.expect(SC.IndexSet.create(1));
  view.contentPropertyDidChange.expect(0); // should not call
  view.computeLayout.expect(YES);
  view.expectLength(content1.get('length'));
});

test("changing the content of several items should reload each item", function() {

  view.set('content', content1);
  view.reset(); // don't care about this fire

  content1.replace(1,1, ["X"]);
  content1.replace(3,1, ["X"]);
  view.reload.expect(SC.IndexSet.create(1).add(3));
  view.contentPropertyDidChange.expect(0); // should not call
  view.computeLayout.expect(YES);
  view.expectLength(content1.get('length'));
});

test("adding to end of content should reload new items", function() {

  view.set('content', content1);
  view.reset(); // don't care about this fire

  content1.pushObject("X");
  content1.pushObject("Y");

  view.reload.expect(SC.IndexSet.create(content1.get('length')-2, 2));
  view.contentPropertyDidChange.expect(0); // should not call
  view.expectLength(content1.get('length'));
  view.computeLayout.expect(YES);
});

test("removing from end of content should reload removed items", function() {

  view.set('content', content1);
  view.reset(); // don't care about this fire

  content1.popObject();
  content1.popObject();

  view.reload.expect(SC.IndexSet.create(content1.get('length'), 2));
  view.contentPropertyDidChange.expect(0); // should not call
  view.expectLength(content1.get('length'));
  view.computeLayout.expect(YES);
});

test("inserting into middle should reload all following items", function() {
  view.set('content', content1);
  view.reset(); // don't care about this fire

  content1.insertAt(3, 'FOO');

  view.reload.expect(SC.IndexSet.create(3, content1.get('length')-3));
  view.contentPropertyDidChange.expect(0); // should not call
  view.expectLength(content1.get('length'));
  view.computeLayout.expect(YES);
});

// ..........................................................
// EDITING PROPERTIES
//

test("editing properties", function() {
  view.set('content', content1);
  view.reset();
  view.contentPropertyDidChange.reset();

  var obj = content1.objectAt(3);
  ok(obj !== null, 'precond -has object to edit');

  obj.set('title', 'FOO');
  view.reload.expect(NO, 0);
  view.contentPropertyDidChange.expect(0);
  view.computeLayout.expect(NO);
});
