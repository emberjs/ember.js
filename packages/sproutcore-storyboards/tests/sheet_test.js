require('sproutcore-storyboards/sheet');

var get = SC.get, set = SC.set, getPath = SC.getPath, setPath = SC.setPath;

module("SC.Sheet");

test("it inherits from SC.State", function() {
  ok(SC.State.detect(SC.Sheet), "SC.Sheet is an SC.State");
});

test("it can act like a state in a storyboard", function() {
  var sheet = SC.Sheet.create({
    entered: 0,

    enter: function() {
      this.entered++;
    }
  });

  var storyboard = SC.Storyboard.create({
    start: sheet
  });

  ok(get(storyboard, 'currentState') === sheet, "automatically transitions to the sheet");
  equals(sheet.entered, 1, "sheet receives enter event when transitioning to current state");
});

test("it appends and removes a view when it is entered and exited", function() {
  var view = SC.View.create({
    elementId: 'test-view'
  });

  var sheet = SC.Sheet.create({
    view: view
  });

  var storyboard;

  SC.run(function() {
    storyboard = SC.Storyboard.create({
      start: sheet,

      other: SC.Sheet.create()
    });
  });

  equals(SC.$('#test-view').length, 1, "found view with custom id in DOM");

  SC.run(function() {
    storyboard.goToState('other');
  });

  equals(SC.$('#test-view').length, 0, "found view with custom id in DOM");
});

test("it appends and removes a view to the element specified in its storyboard", function() {
  var view = SC.View.create({
    elementId: 'test-view'
  });

  var sheet = SC.Sheet.create({
    view: view
  });

  var storyboard;

  $('<div id="my-container"></div>').appendTo($('#qunit-fixture'));

  equals($('#qunit-fixture > #my-container')[0].childNodes.length, 0, "precond - container does not have any child nodes");

  SC.run(function() {
    storyboard = SC.Storyboard.create({
      rootElement: '#qunit-fixture > #my-container',
      start: sheet,

      other: SC.Sheet.create()
    });
  });

  equals(SC.$('#test-view').length, 1, "found view with custom id in DOM");
  equals($("#test-view").parent().attr('id'), "my-container", "appends view to the correct element");

  SC.run(function() {
    storyboard.goToState('other');
  });

  equals(SC.$('#test-view').length, 0, "found view with custom id in DOM");
});
