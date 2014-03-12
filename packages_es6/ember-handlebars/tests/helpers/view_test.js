/*globals EmberDev */

var view, originalLookup;

var container = {
  lookupFactory: function() { }
};

function viewClass(options) {
  options.container = options.container || container;
  return Ember.View.extend(options);
}

module("Handlebars {{#view}} helper", {
  setup: function() {
    originalLookup = Ember.lookup;

  },

  teardown: function() {
    Ember.lookup = originalLookup;

    if (view) {
      Ember.run(view, 'destroy');
    }
  }
});


test("View lookup - App.FuView", function() {
  Ember.lookup = {
    App: {
      FuView: viewClass({
        elementId: "fu",
        template: Ember.Handlebars.compile("bro")
      })
    }
  };

  view = viewClass({
    template: Ember.Handlebars.compile("{{view App.FuView}}")
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#fu').text(), 'bro');
});

test("View lookup - 'App.FuView'", function() {
  Ember.lookup = {
    App: {
      FuView: viewClass({
        elementId: "fu",
        template: Ember.Handlebars.compile("bro")
      })
    }
  };

  view = viewClass({
    template: Ember.Handlebars.compile("{{view 'App.FuView'}}")
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#fu').text(), 'bro');
});

test("View lookup - 'fu'", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: Ember.Handlebars.compile("bro")
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = Ember.View.extend({
    template: Ember.Handlebars.compile("{{view 'fu'}}"),
    container: container
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#fu').text(), 'bro');

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }
});

test("id bindings downgrade to one-time property lookup", function() {
  view = Ember.View.extend({
    template: Ember.Handlebars.compile("{{#view Ember.View id=view.meshuggah}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#stengah').text(), 'stengah', "id binding performed property lookup");
  Ember.run(view, 'set', 'meshuggah', 'omg');
  equal(Ember.$('#stengah').text(), 'omg', "id didn't change");
});

test("mixing old and new styles of property binding fires a warning, treats value as if it were quoted", function() {
  if (EmberDev && EmberDev.runningProdBuild){
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(2);

  var oldWarn = Ember.warn;

  Ember.warn = function(msg) {
    equal(msg, "You're attempting to render a view by passing borfBinding=view.snork to a view helper, but this syntax is ambiguous. You should either surround view.snork in quotes or remove `Binding` from borfBinding.");
  };

  view = Ember.View.extend({
    template: Ember.Handlebars.compile("{{#view Ember.View borfBinding=view.snork}}<p id='lol'>{{view.borf}}</p>{{/view}}"),
    snork: "nerd"
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#lol').text(), "nerd", "awkward mixed syntax treated like binding");

  Ember.warn = oldWarn;
});
