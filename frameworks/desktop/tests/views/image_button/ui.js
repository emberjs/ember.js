
var pane = SC.ControlTestPane.design({height:24})
  .add('default', SC.ImageButtonView, {
    layout: { left: 0, top: 2, right: 0, bottom: 2 },
    image: 'start',
    toolTip: 'OMGHI'
  })

  .add("iconchange", SC.ImageButtonView, {
    layout: { left: 0, top: 2, right: 0, bottom: 2 },
    image: 'start'
  });

module('SC.ImageButtonView ui', pane.standardSetup());

test("Check if image class is set properly on ImageButton", function() {
  var viewElem = pane.view('default').$();
  ok(viewElem.hasClass('start'), 'Icon class set initially to "start"');
});

test("toolTip support", function() {
  var view = pane.view('default'),
      viewElem = view.$();

  equals(viewElem.attr('title'), 'OMGHI', 'title attribute is set correctly');
  equals(viewElem.attr('alt'), 'OMGHI', 'alt attribute is set correctly');

  SC.run(function() {
    view.set('toolTip', 'ZOMG');
  });

  equals(viewElem.attr('title'), 'ZOMG', 'title attribute is updated correctly');
  equals(viewElem.attr('alt'), 'ZOMG', 'alt attribute is updated correctly');

  SC.run(function() {
    view.set('toolTip', null);
  });

  equals(viewElem.attr('title'), "", 'title attribute is removed correctly');
  equals(viewElem.attr('alt'), "", 'alt attribute is removed correctly');
});

test("Check if image class is set properly on ImageButton if changed", function() {
  SC.RunLoop.begin();
  var viewElem = pane.view('iconchange');
  viewElem.set('image','stop');
  SC.RunLoop.end(); // force redraw...
  var newViewElem = pane.view('iconchange').$();
  ok(newViewElem.hasClass('stop'), 'Icon class has correctly changed to "stop"');
});
