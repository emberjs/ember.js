/*globals EmberDev */
import {View as EmberView} from "ember-views/views/view";
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";

var view, originalLookup;

var container = {
  lookupFactory: function() { }
};

function viewClass(options) {
  options.container = options.container || container;
  return EmberView.extend(options);
}

module("Handlebars {{#view}} helper", {
  setup: function() {
    originalLookup = Ember.lookup;
  },

  teardown: function() {
    Ember.lookup = originalLookup;

    if (view) {
      run(view, 'destroy');
    }
  }
});

test("By default view:default is used", function() {
  var DefaultView = viewClass({
    elementId: 'default-view',
    template: Ember.Handlebars.compile('hello world')
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: Ember.Handlebars.compile('{{view}}'),
    container: container
  }).create();

  run(view, 'appendTo', '#qunit-fixture');

  equal(jQuery('#default-view').text(), 'hello world');

  function lookupFactory(fullName) {
    equal(fullName, 'view:default');

    return DefaultView;
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

  run(view, 'appendTo', '#qunit-fixture');

  equal(jQuery('#fu').text(), 'bro');
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

  run(view, 'appendTo', '#qunit-fixture');

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - 'fu'", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: Ember.Handlebars.compile("bro")
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: Ember.Handlebars.compile("{{view 'fu'}}"),
    container: container
  }).create();

  run(view, 'appendTo', '#qunit-fixture');

  equal(jQuery('#fu').text(), 'bro');

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }
});

test("id bindings downgrade to one-time property lookup", function() {
  view = EmberView.extend({
    template: Ember.Handlebars.compile("{{#view Ember.View id=view.meshuggah}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  run(view, 'appendTo', '#qunit-fixture');

  equal(jQuery('#stengah').text(), 'stengah', "id binding performed property lookup");
  run(view, 'set', 'meshuggah', 'omg');
  equal(jQuery('#stengah').text(), 'omg', "id didn't change");
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

  view = EmberView.extend({
    template: Ember.Handlebars.compile("{{#view Ember.View borfBinding=view.snork}}<p id='lol'>{{view.borf}}</p>{{/view}}"),
    snork: "nerd"
  }).create();

  run(view, 'appendTo', '#qunit-fixture');

  equal(jQuery('#lol').text(), "nerd", "awkward mixed syntax treated like binding");

  Ember.warn = oldWarn;
});
