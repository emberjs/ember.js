/*globals EmberDev */
import { set } from "ember-metal/property_set";
import EmberView from "ember-views/views/view";
import Container from 'container/container';
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var view, originalLookup;

var container = {
  lookupFactory: function() { }
};

function viewClass(options) {
  options.container = options.container || container;
  return EmberView.extend(options);
}

var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

QUnit.module("ember-htmlbars: {{#view}} helper", {
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
    template: compile('hello world')
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:toplevel');

    return DefaultView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile('{{view}}'),
    container: container
  }).create();

  appendView(view);

  equal(jQuery('#toplevel-view').text(), 'hello world');
});

test("By default, without a container, EmberView is used", function() {
  view = EmberView.extend({
    template: compile('{{view tagName="span"}}')
  }).create();

  run(view, 'appendTo', '#qunit-fixture');

  ok(jQuery('#qunit-fixture').html().toUpperCase().match(/<SPAN/), 'contains view with span');
});

test("View lookup - App.FuView (DEPRECATED)", function() {
  Ember.lookup = {
    App: {
      FuView: viewClass({
        elementId: "fu",
        template: compile("bro")
      })
    }
  };

  view = viewClass({
    template: compile("{{view App.FuView}}")
  }).create();

  expectDeprecation(function(){
    appendView(view);
  }, /Global lookup of App.FuView from a Handlebars template is deprecated./);

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - 'fu'", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: compile("bro")
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view 'fu'}}"),
    container: container
  }).create();

  appendView(view);

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - 'fu' when fu is a property and a view name", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: compile("bro")
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view 'fu'}}"),
    context: {fu: 'boom!'},
    container: container
  }).create();

  appendView(view);

  equal(jQuery('#fu').text(), 'bro');
});

test("View lookup - view.computed", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: compile("bro")
  });

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view view.computed}}"),
    container: container,
    computed: 'fu'
  }).create();

  appendView(view);

  equal(jQuery('#fu').text(), 'bro');
});

test("id bindings downgrade to one-time property lookup", function() {
  view = EmberView.extend({
    template: compile("{{#view id=view.meshuggah}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  appendView(view);

  equal(jQuery('#stengah').text(), 'stengah', "id binding performed property lookup");
  run(view, 'set', 'meshuggah', 'omg');
  equal(jQuery('#stengah').text(), 'omg', "id didn't change");
});

test("specifying `id` as a static value works properly", function() {
  view = EmberView.extend({
    template: compile("{{#view id='blah'}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  appendView(view);

  equal(view.$('#blah').text(), 'stengah', "id binding performed property lookup");
});

test("mixing old and new styles of property binding fires a warning, treats value as if it were quoted", function() {
  if (EmberDev && EmberDev.runningProdBuild){
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(2);

  var oldWarn = Ember.warn;

  Ember.warn = function(msg) {
    ok(msg.match(/You're attempting to render a view by passing borfBinding.+, but this syntax is ambiguous./));
  };

  view = EmberView.extend({
    template: compile("{{#view borfBinding=view.snork}}<p id='lol'>{{view.borf}}</p>{{/view}}"),
    snork: "nerd"
  }).create();

  appendView(view);

  equal(jQuery('#lol').text(), "nerd", "awkward mixed syntax treated like binding");

  Ember.warn = oldWarn;
});

test("allows you to pass attributes that will be assigned to the class instance, like class=\"foo\"", function() {
  expect(4);

  var container = new Container();
  container.register('view:toplevel', EmberView.extend());

  view = EmberView.extend({
    template: compile('{{view id="foo" tagName="h1" class="foo"}}{{#view id="bar" class="bar"}}Bar{{/view}}'),
    container: container
  }).create();

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'));
  ok(jQuery('#foo').is('h1'));
  ok(jQuery('#bar').hasClass('bar'));
  equal(jQuery('#bar').text(), 'Bar');
});

test("Should apply class without condition always", function() {
  view = EmberView.create({
    controller: Ember.Object.create(),
    template: compile('{{#view id="foo" classBinding=":foo"}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");
});

test("Should apply classes when bound controller.* property specified", function() {
  view = EmberView.create({
    controller: {
      someProp: 'foo'
    },
    template: compile('{{#view id="foo" class=controller.someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");
});

test("Should apply classes when bound property specified", function() {
  view = EmberView.create({
    controller: {
      someProp: 'foo'
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('foo'), "Always applies classbinding without condition");
});

test("Should not apply classes when bound property specified is false", function() {
  view = EmberView.create({
    controller: {
      someProp: false
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(!jQuery('#foo').hasClass('some-prop'), "does not add class when value is falsey");
});

test("Should apply classes of the dasherized property name when bound property specified is true", function() {
  view = EmberView.create({
    controller: {
      someProp: true
    },
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('some-prop'), "adds dasherized class when value is true");
});

test("Should update classes from a bound property", function() {
  var controller = {
    someProp: true
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{#view id="foo" class=someProp}} Foo{{/view}}')
  });

  appendView(view);

  ok(jQuery('#foo').hasClass('some-prop'), "adds dasherized class when value is true");

  run(function() {
    set(controller, 'someProp', false);
  });

  ok(!jQuery('#foo').hasClass('some-prop'), "does not add class when value is falsey");

  run(function() {
    set(controller, 'someProp', 'fooBar');
  });

  ok(jQuery('#foo').hasClass('fooBar'), "changes property to string value (but does not dasherize)");
});

test("bound properties should be available in the view", function() {
  var FuView = viewClass({
    elementId: 'fu',
    template: compile("{{view.foo}}")
  });

  function lookupFactory(fullName) {
    return FuView;
  }

  var container = {
    lookupFactory: lookupFactory
  };

  view = EmberView.extend({
    template: compile("{{view 'fu' foo=view.someProp}}"),
    container: container,
    someProp: 'initial value'
  }).create();

  appendView(view);

  equal(view.$('#fu').text(), 'initial value');

  run(function() {
    set(view, 'someProp', 'second value');
  });

  equal(view.$('#fu').text(), 'second value');
});
