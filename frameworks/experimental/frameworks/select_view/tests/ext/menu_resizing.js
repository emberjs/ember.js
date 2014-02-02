module("Menus -- Automatic Resizing");

function createMenu(items) {
  return SC.MenuPane.create({
    items: items
  });
}

test("Different widths for different sets of items", function() {
  SC.RunLoop.begin();
  var menu1 = createMenu("A B C D E F G".w());
  menu1.popup();

  var menu2 = createMenu("HelloY'allVeryLongThing World".w());
  menu2.popup();
  SC.RunLoop.end();

  var w1 = menu1.get('layout').width;
  var w2 = menu2.get('layout').width;

  ok(w2 > w1, "Menu 2 should be wider than Menu 1");

  menu1.remove();
  menu2.remove();
});
