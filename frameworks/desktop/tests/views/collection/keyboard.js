// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


var controller = SC.ArrayController.create({
	content: "1 2 3 4 5 6 7 8 9 10".w().map(function(x) {
    return SC.Object.create({ value: x });
  })
});

var pane = SC.ControlTestPane.design();
pane.add('default', SC.CollectionView, {
	content: controller.get('arrangedObjects')
});

module("SC.CollectionView Keyboard events and handlers", {
	setup: function() {
    pane.standardSetup().setup();
	},
	teardown: function() {
		pane.standardSetup().teardown();
	}
});

test("selectAll (ctrl+a handler)", function() {
	SC.run(function() {
		pane.view('default').selectAll();
	});
	equals(pane.view('default').getPath('selection.length'), 10, "selectAll selects all when allowsMultipleSelection is YES (default)");
	SC.run(function() {
		controller.set('allowsMultipleSelection', NO);
		pane.view('default').set('selection', null);
		pane.view('default').selectAll();
	});
	ok(!pane.view('default').getPath('selection.length'), "selectAll has no effect when allowsMultipleSelection is not set");

	// Cleanup
	controller.set('allowsMultipleSelection', YES);
});

test("deselectAll", function() {
	var view = pane.view('default');
	SC.run(function() {
		view.selectAll();
	});
	equals(view.getPath('selection.length'), 10, "PRELIM: All items are selected");
	SC.run(function() {
		view.deselectAll();
	});
	equals(view.getPath('selection.length'), 0, "deselectAll clears the selection when allowsEmptySelection is YES (default)");
	SC.run(function() {
		view.selectAll();
	})
	equals(view.getPath('selection.length'), 10, "PRELIM: All items are re-selected");
	SC.run(function() {
		controller.set('allowsEmptySelection', NO);
		view.deselectAll();
	});
	equals(view.getPath('selection.length'), 10, "deselectAll has no effect when allowsEmptySelection is NO")
});

// TODO: yeah all the other keyboard stuff.
