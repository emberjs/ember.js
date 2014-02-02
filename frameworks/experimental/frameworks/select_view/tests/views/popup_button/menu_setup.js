module("PopupButtonView -- Menu Setup");


test("Setting up menu without background task queue", function() {
  SC.RunLoop.begin();
  var popup = SC.PopupButtonView.create({
    menu: SC.MenuPane.extend({
      items: "1 2 3 4 5".w()
    })
  });
  SC.RunLoop.end();

  equals(popup.get('menu').isClass, YES, "Menu not yet instantiated");

  SC.RunLoop.begin();
  popup.setupMenu();
  SC.RunLoop.end();

  equals(popup.get('menu').isClass, undefined, "Menu now instantiated");

});

test("Setting up in background task queue", function() {
  SC.RunLoop.begin();
  var popup = SC.PopupButtonView.create({
    shouldLoadInBackground: YES,
    menu: SC.MenuPane.extend({
      items: "1 2 3 4 5".w()
    })
  });
  SC.RunLoop.end();

  equals(popup.get('menu').isClass, YES, "Menu not yet instantiated");

  SC.RunLoop.begin();
  SC.backgroundTaskQueue.run();
  SC.RunLoop.end();

  equals(popup.get('menu').isClass, undefined, "Menu now instantiated");
});
