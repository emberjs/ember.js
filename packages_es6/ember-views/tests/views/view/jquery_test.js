var set = Ember.set, get = Ember.get;

var view ;
module("Ember.View#$", {
  setup: function() {
    view = Ember.View.extend({
      render: function(context, firstTime) {
        context.push('<span></span>');
      }
    }).create();

    Ember.run(function() {
      view.append();
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("returns undefined if no element", function() {
  var view = Ember.View.create();
  ok(!get(view, 'element'), 'precond - should have no element');
  equal(view.$(), undefined, 'should return undefined');
  equal(view.$('span'), undefined, 'should undefined if filter passed');

  Ember.run(function() {
    view.destroy();
  });
});

test("returns jQuery object selecting element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$();
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0], get(view, 'element'), 'element should be element');
});

test("returns jQuery object selecting element inside element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('span');
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0].parentNode, get(view, 'element'), 'element should be in element');
});

test("returns empty jQuery object if filter passed that does not match item in parent", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('body'); // would normally work if not scoped to view
  equal(jquery.length, 0, 'view.$(body) should have no elements');
});

