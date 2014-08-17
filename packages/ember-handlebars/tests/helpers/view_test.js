/*globals EmberDev */
import EmberView from "ember-views/views/view";
import Container from 'container/container';
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

QUnit.module("Handlebars {{#view}} helper", {
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

test("By default view:toplevel is used", function() {
  var DefaultView = viewClass({
    elementId: 'toplevel-view',
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

  equal(jQuery('#toplevel-view').text(), 'hello world');

  function lookupFactory(fullName) {
    equal(fullName, 'view:toplevel');

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

test("View lookup - view.computed", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: Ember.Handlebars.compile("bro")
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: Ember.Handlebars.compile("{{view view.computed}}"),
    container: container,
    computed: 'fu'
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

test("allows you to pass attributes that will be assigned to the class instance, like class=\"foo\"", function() {
  expect(4);

  var container = new Container();
  container.register('view:toplevel', EmberView.extend());

  view = EmberView.extend({
    template: Ember.Handlebars.compile('{{view id="foo" tagName="h1" class="foo"}}{{#view id="bar" class="bar"}}Bar{{/view}}'),
    container: container
  }).create();

  run(view, 'appendTo', '#qunit-fixture');

  ok(jQuery('#foo').hasClass('foo'));
  ok(jQuery('#foo').is('h1'));
  ok(jQuery('#bar').hasClass('bar'));
  equal(jQuery('#bar').text(), 'Bar');
});

test("Should apply class without condition always", function() {
  var container = new Container();
  container.register('view:toplevel', EmberView.extend());

  view = EmberView.create({
    context: [],
    container: container,
    controller: Ember.Object.create(),
    template: Ember.Handlebars.compile('{{#view id="foo" classBinding=":foo"}} Foo{{/view}}')
  });

  run(view, 'appendTo', '#qunit-fixture');

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");

});
