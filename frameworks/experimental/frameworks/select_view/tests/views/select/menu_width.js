// Tests that the minimum menu width changes with the size of the SelectView
//
var View, pane, obj;

module("SelectView - Minimum Menu Width", {
  setup: function() {
    pane = SC.Pane.create();

    obj = SC.Object.create({title: 'Lost', value: 'Found'});

    View = SC.SelectView.extend({
      items: [
        {title: 'Hello', value: 'hi'},
        {title: 'Yo', value: 'Jimbo'},
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

test("Menu width changes with minimumMenuWidth", function() {
  SC.RunLoop.begin();
  var view = createView({ minimumMenuWidth: 500 });
  view.showMenu();
  SC.RunLoop.end();

  equals(view.get('menu').get('frame').width, 500, "Width is 500");

  SC.RunLoop.begin();
  view.set('minimumMenuWidth', 1000);
  SC.RunLoop.end();

  equals(view.get('menu').get('frame').width, 1000, "Width has changed to 1000");

  view.hideMenu();

});
