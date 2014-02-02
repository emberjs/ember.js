// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2012 7x7 Software, Inc.
// License:   Licensed under MIT license
// ==========================================================================
/*globals module, test, ok, isObj, equals, expects, start, stop*/

var content, root;
var TestObject = SC.Object.extend({
  toString: function () { return "TestObject(%@)".fmt(this.get('title')); }
});

module('SC.TreeItemObserver Methods', {
  setup: function () {
    content = [
      TestObject.create({
        isGroup: YES,
        title: "A",
        isExpanded: YES,
        outline: 0,
        children: "0".w().map(function (x) {
          return TestObject.create({
            title: "A.%@".fmt(x),
            outline: 1
          });
        })
      }),

      TestObject.create({
        isGroup: YES,
        title: "B",
        isExpanded: YES,
        outline: 0,
        children: "0 1".w().map(function (x) {
          return TestObject.create({
            title: "B.%@".fmt(x),
            outline: 1
          });
        })
      }),

      TestObject.create({
        isGroup: YES,
        title: "C",
        isExpanded: NO,
        outline: 0,
        children: "0 1 2".w().map(function (x) {
          return TestObject.create({
            title: "C.%@".fmt(x),
            outline: 1
          });
        })
      })
    ];

    root = TestObject.create({
      title: "ROOT",
      children: content,
      isExpanded: YES
    });

    // Create a TreeItemObserver for testing.
    // SC.run(function () {
    //   tio = SC.TreeItemObserver.create({
    //     delegate: SC.Object.create({
    //       treeItemChildrenKey: "children",
    //       treeItemIsExpandedKey: "isExpanded"
    //     }),
    //     item: root
    //   });
    // });
  },

  teardown: function () {
    // tio.destroy();
    // tio = null;
    root.destroy();
    content.invoke('destroy');
    root = content = null;
  }
});

test("SC.TreeItemObserver.prototype.init(): No delegate", function () {
  var tio,
    item;

  SC.run(function () {
    tio = SC.TreeItemObserver.create({
      item: root
    });
  });

  item = tio.get('item');

  // TIO should add observers on the item (based on the default keys)
  ok(item.hasObserverFor('treeItemChildren'), "The item is observed for changes to treeItemChildren.");
  ok(item.hasObserverFor('treeItemIsExpanded'), "The item is observed for changes to treeItemIsExpanded.");

  // Clean up.
  tio.destroy();
});

test("SC.TreeItemObserver.prototype.init(): With delegate", function () {
  var tio,
    delegate,
    item;

  SC.run(function () {
    tio = SC.TreeItemObserver.create({
      delegate: SC.Object.create({
        treeItemChildrenKey: "children",
        treeItemIsExpandedKey: "isExpanded"
      }),
      item: root
    });
  });

  delegate = tio.get('delegate');
  item = tio.get('item');

  // TIO should add observers on the delegate.
  ok(delegate.hasObserverFor('treeItemChildrenKey'), "The delegate is observed for changes to treeItemChildrenKey.");
  ok(delegate.hasObserverFor('treeItemIsExpandedKey'), "The delegate is observed for changes to treeItemIsExpandedKey.");
  ok(delegate.hasObserverFor('treeItemIsGrouped'), "The delegate is observed for changes to treeItemIsGrouped.");

  // TIO should add observers on the item (based on the delegate keys)
  ok(item.hasObserverFor('children'), "The item is observed for changes to children.");
  ok(item.hasObserverFor('isExpanded'), "The item is observed for changes to isExpanded.");

  // Clean up.
  tio.destroy();
});


test("SC.TreeItemObserver.prototype.destroy(): No delegate", function () {
  var tio,
    item;

  SC.run(function () {
    tio = SC.TreeItemObserver.create({
      item: root
    });
  });

  item = tio.get('item');
  tio.destroy();

  // TIO should remove observers on the item on destroy (based on the default keys)
  ok(!item.hasObserverFor('treeItemChildren'), "The item is no longer observed for changes to treeItemChildren.");
  ok(!item.hasObserverFor('treeItemIsExpanded'), "The item is no longer observed for changes to treeItemIsExpanded.");

});


test("SC.TreeItemObserver.prototype.destroy(): With delegate", function () {
  var tio,
    delegate,
    item;

  SC.run(function () {
    tio = SC.TreeItemObserver.create({
      delegate: SC.Object.create({
        treeItemChildrenKey: "children",
        treeItemIsExpandedKey: "isExpanded"
      }),
      item: root
    });
  });

  delegate = tio.get('delegate');
  item = tio.get('item');
  tio.destroy();

  // TIO should remove observers on the delegate on destroy.
  ok(!delegate.hasObserverFor('treeItemChildrenKey'), "The delegate is no longer observed for changes to treeItemChildrenKey.");
  ok(!delegate.hasObserverFor('treeItemIsExpandedKey'), "The delegate is no longer observed for changes to treeItemIsExpandedKey.");
  ok(!delegate.hasObserverFor('treeItemIsGrouped'), "The delegate is no longer observed for changes to treeItemIsGrouped.");

  // TIO should remove observers on the item on destroy (based on the delegate keys)
  ok(!item.hasObserverFor('children'), "The item is no longer observed for changes to children.");
  ok(!item.hasObserverFor('isExpanded'), "The item is no longer observed for changes to isExpanded.");

});


test("SC.TreeItemObserver.prototype._delegateDidChange()", function () {
  var tio,
    oldDelegate,
    newDelegate,
    item;

  SC.run(function () {
    tio = SC.TreeItemObserver.create({
      delegate: SC.Object.create({
        treeItemChildrenKey: "children",
        treeItemIsExpandedKey: "isExpanded"
      }),
      item: root
    });
  });

  oldDelegate = tio.get('delegate');
  item = tio.get('item');

  SC.run(function () {
    tio.set('delegate', SC.Object.create({
      treeItemChildrenKey: "otherChildren",
      treeItemIsExpandedKey: "otherIsExpanded"
    }));
  });

  newDelegate = tio.get('delegate');

  // TIO should remove observers on the old delegate.
  ok(!oldDelegate.hasObserverFor('treeItemChildrenKey'), "The original delegate is no longer observed for changes to treeItemChildrenKey.");
  ok(!oldDelegate.hasObserverFor('treeItemIsExpandedKey'), "The original delegate is no longer observed for changes to treeItemIsExpandedKey.");
  ok(!oldDelegate.hasObserverFor('treeItemIsGrouped'), "The original delegate is no longer observed for changes to treeItemIsGrouped.");

  // TIO should add observers on the new delegate.
  ok(newDelegate.hasObserverFor('treeItemChildrenKey'), "The delegate is observed for changes to treeItemChildrenKey.");
  ok(newDelegate.hasObserverFor('treeItemIsExpandedKey'), "The delegate is observed for changes to treeItemIsExpandedKey.");
  ok(newDelegate.hasObserverFor('treeItemIsGrouped'), "The delegate is observed for changes to treeItemIsGrouped.");

  // TIO should remove observers on the item when the delegate changes (based on the old delegate keys).
  ok(!item.hasObserverFor('children'), "The original item is no longer observed for changes to children.");
  ok(!item.hasObserverFor('isExpanded'), "The original item is no longer observed for changes to isExpanded.");

  // TIO should add observers on the item (based on the new delegate keys).
  ok(item.hasObserverFor('otherChildren'), "The item is observed for changes to otherChildren.");
  ok(item.hasObserverFor('otherIsExpanded'), "The item is observed for changes to otherIsExpanded.");
});


test("SC.TreeItemObserver.prototype._itemDidChange()", function () {
  var tio,
    oldItem,
    newItem;

  SC.run(function () {
    tio = SC.TreeItemObserver.create({
      delegate: SC.Object.create({
        treeItemChildrenKey: "children",
        treeItemIsExpandedKey: "isExpanded"
      }),
      item: root
    });
  });

  oldItem = tio.get('item');

  SC.run(function () {
    tio.set('item', TestObject.create({
      title: "NEW ROOT",
      children: content,
      isExpanded: YES
    }));
  });

  newItem = tio.get('item');

  // TIO should remove observers on the item when the delegate changes (based on the old delegate keys).
  ok(!oldItem.hasObserverFor('children'), "The original item is no longer observed for changes to children.");
  ok(!oldItem.hasObserverFor('isExpanded'), "The original item is no longer observed for changes to isExpanded.");

  // TIO should add observers on the item (based on the new delegate keys).
  ok(newItem.hasObserverFor('children'), "The item is observed for changes to otherChildren.");
  ok(newItem.hasObserverFor('isExpanded'), "The item is observed for changes to otherIsExpanded.");
});
