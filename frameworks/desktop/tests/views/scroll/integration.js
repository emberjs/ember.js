module("SC.ScrollView integration");

test("should work with views that have static layout applied", function() {
  var pane;
  try {
    pane = SC.MainPane.create({
      childViews: ['scrollView'],

      scrollView: SC.ScrollView.design({
        layout: { width: 400, height: 600 },

        contentView: SC.View.design({
          useStaticLayout: YES
        })
      })
    });

    pane.append();
    SC.RunLoop.begin().end();

    ok(true, "displays scroll view without throwing an exception");
  } finally {
    if (pane) { pane.remove(); }
  }
});
