// Tests:
// - defaultTitle
// - title comes from selected item
// - value changing changes selected item
var View, pane, obj;

module("SelectView - Selected Item", {
  setup: function() {
    pane = SC.Pane.create();

    obj = SC.Object.create({title: 'Lost', value: 'Found'});

    View = SC.SelectView.extend({
      items: [
        {title: 'Hello', value: 'hi'},
        {title: 'Yo', value: 'Jimbo'},
        obj,
        {title: 'The Greate American Flee Market', value: 'aFilm'}
      ],

      itemTitleKey: 'title',
      itemValueKey: 'value'
    });
  },

  teardown: function() {
    
  }
});

function createView(settings) {
  var view = View.create(settings || {});
  pane.appendChild(view);
  return view;
}

test("defaultTitle used when no item is selected", function() {
  SC.RunLoop.begin();
  var view = createView({ defaultTitle: "Bonjour" });
  SC.RunLoop.end();

  equals(view.get('title'), "Bonjour", "Title is the default title");
});

test("defaultTitle is NOT used when an item IS selected at startup", function() {
  SC.RunLoop.begin();
  var view = createView({ defaultTitle: "Bonjour", value: 'Jimbo' });
  SC.RunLoop.end();

  equals(view.get('title'), "Yo", "Title comes from selected item");

});

test("title changes when selected item changes", function() {
  SC.RunLoop.begin();
  var view = createView({ defaultTitle: "Bonjour", value: 'Jimbo' });
  SC.RunLoop.end();

  equals(view.get('title'), "Yo", "Initial title comes from selected item");

  SC.RunLoop.begin();

  // the actual item is an SC.Object. However, MenuPane's selected item will not be
  // the original, so we do in fact need to test that it works even when the "selected
  // item" is not the exact same object.
  view.set('selectedItem', {title: 'Lost', value: 'Found'});
  SC.RunLoop.end();

  equals(view.get('title'), "Lost", "Title changed");

});

test("title reverts to defaultTitle when item is deselected", function() {
  SC.RunLoop.begin();
  var view = createView({ defaultTitle: "Bonjour" });
  SC.RunLoop.end();

  equals(view.get('title'), "Bonjour", "Initial title comes from default title");

  SC.RunLoop.begin();
  view.set('selectedItem', {title: 'Lost', value: 'Found'});
  SC.RunLoop.end();

  equals(view.get('title'), "Lost", "Title changed");

  // now the real test: changing back
  SC.RunLoop.begin();
  view.set('selectedItem', null);
  SC.RunLoop.end();

  equals(view.get('title'), "Bonjour", "Back to defaultTitle");
});

test("changing value changes the selected item", function() {
  SC.RunLoop.begin();
  var view = createView({ defaultTitle: "Bonjour" });
  SC.RunLoop.end();

  equals(view.get('selectedItem'), null, "Selected item starts at null");

  SC.RunLoop.begin();
  view.set('value', "Jimbo");
  SC.RunLoop.end();

  ok(view.get('selectedItem') !== null, "Selected item is no longer null");
  equals(view.get('title'), "Yo", "Title has changed");
});

test("changing value to a value not in the list deselects", function() {
  SC.RunLoop.begin();
  var view = createView({ defaultTitle: "Bonjour" });
  SC.RunLoop.end();

  equals(view.get('selectedItem'), null, "Selected item starts at null");

  SC.RunLoop.begin();
  view.set('value', "Jimbo");
  SC.RunLoop.end();

  ok(view.get('selectedItem') !== null, "Selected item is no longer null");
  equals(view.get('title'), "Yo", "Title has changed");

  SC.RunLoop.begin();
  view.set('value', "NOT THE ITEM YOU ARE LOOKING FOR");
  SC.RunLoop.end();

  equals(view.get('selectedItem'), null, "No item selected anymore");
  equals(view.get('title'), "Bonjour", "Back to default title");
});

test("title changes when an SC.Object item's title changes", function() {
  SC.RunLoop.begin();
  var view = createView({ value: "Found" });
  SC.RunLoop.end();

  equals(view.get('title'), "Lost", "Title starts at that of selected item");

  SC.RunLoop.begin();
  obj.set('title', "Found");
  SC.RunLoop.end();

  equals(view.get('title'), "Found", "Title has changed");

});

test("value changes when an SC.Object item's value changes", function() {
  SC.RunLoop.begin();
  var view = createView({ value: "Found" });
  SC.RunLoop.end();

  equals(view.get('value'), "Found", "Title starts at that of selected item");

  SC.RunLoop.begin();
  obj.set('value', "Yo");
  SC.RunLoop.end();

  equals(view.get('value'), "Yo", "Title has changed");

});

test("value does not change when an SC.Object item's value changes when that item is not selected", function() {
  SC.RunLoop.begin();
  var view = createView({ value: "Found" });
  SC.RunLoop.end();

  equals(view.get('value'), "Found", "Title starts at that of selected item");

  SC.RunLoop.begin();
  obj.set('value', "Yo");
  SC.RunLoop.end();

  equals(view.get('value'), "Yo", "Title has changed");

  SC.RunLoop.begin();
  view.set('value', "Jimbo");
  SC.RunLoop.end();

  equals(view.get('value'), "Jimbo", "Value changed");
  equals(view.get('title'), "Yo", "Title changed");

  SC.RunLoop.begin();
  obj.set('value', "Something else");
  SC.RunLoop.end();

  equals(view.get('value'), "Jimbo", "Value has not changed");
  equals(view.get('title'), "Yo", "Title has not changed");

});



