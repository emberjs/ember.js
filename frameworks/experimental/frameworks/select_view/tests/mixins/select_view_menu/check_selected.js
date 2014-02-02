// The second responsibility of SC.SelectViewMenu is to make sure the selected
// item is checked.

module("SelectViewMenu -- Check Selected");

test("Selected menu item is checked", function() {
  SC.RunLoop.begin();
  var selectView = SC.Object.create({
    value: "A"
  });

  var menu = SC.MenuPane.create(SC.SelectViewMenu, {
    items: "A B C D E".w(),
    selectView: selectView
  });

  menu.popup();
  SC.RunLoop.end();


  equals(menu.get('menuItemViews')[0].get('isChecked'), YES, "First menu item is checked");

  SC.RunLoop.begin();
  selectView.set('value', 'C');
  SC.RunLoop.end();

  equals(menu.get('menuItemViews')[0].get('isChecked'), NO, "First menu item is checked");
  equals(menu.get('menuItemViews')[2].get('isChecked'), YES, "Third menu item is checked");


  menu.remove();
});
