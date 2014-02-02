module("PopupButtonView -- Showing menu");

test("Popping up the menu will set the preferMatrix", function() {
  SC.RunLoop.begin();
  var popup = SC.PopupButtonView.create({
    menu: SC.MenuPane.extend({
      items: "1 2 3 4 5".w()
    }),

    menuPreferMatrix: [1, 2, 3]
  });
  popup.showMenu();
  SC.RunLoop.end();

  same(popup.get('menu').get('preferMatrix'), [1, 2, 3], "Prefer Matrix is same.");

  popup.hideMenu();
});

test("Showing the menu activates the button.", function() {
  SC.RunLoop.begin();
    var popup = SC.PopupButtonView.create({
      menu: SC.MenuPane.extend({
        items: "1 2 3 4 5".w()
      }),

      menuPreferMatrix: [1, 2, 3]
    });
  SC.RunLoop.end();

    equals(popup.get('isActive'), NO, "Is not active at startup.");

  SC.RunLoop.begin();
    popup.showMenu();
  SC.RunLoop.end();

  equals(popup.get('isActive'), YES, "Is active when menu is open.");

  SC.RunLoop.begin();
    popup.hideMenu();
  SC.RunLoop.end();

  equals(popup.get('isActive'), NO, "Is not active once menu closes.");
});

