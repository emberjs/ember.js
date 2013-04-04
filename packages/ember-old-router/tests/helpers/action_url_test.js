// FIXME: Move this to an integration test pacakge with proper requires
try {
  require('ember-handlebars');
} catch(e) { }

var view;

module("the {{action}} helper with href attribute", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

var compile = function(string) {
  return Ember.Handlebars.compile(string);
};

var namespace = {
  "Component": {
    toString: function() { return "Component"; },
    find: function() { return { id: 1 }; }
  }
};

test("it generates the URL from the target", function() {
  view = Ember.View.create({
    template: compile("<a {{action show href=true}}>Hi</a>")
  });

  var controller = Ember.Object.createWithMixins(Ember.ControllerMixin, {
    target: {
      urlForEvent: function(event, context) {
        return "/foo/bar";
      }
    }
  });

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  ok(view.$().html().match(/href=['"].*\/foo\/bar['"]/), "The html (" + view.$().html() + ") does not have the href /foo/bar in it");
});

test("it does not generate the URL when href property is not specified", function() {
  view = Ember.View.create({
    template: compile("<a {{action show}}>Hi</a>")
  });

  var controller = Ember.Object.createWithMixins(Ember.ControllerMixin, {
    target: {
      urlForEvent: function(event, context) {
        return "/foo/bar";
      }
    }
  });

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  ok(!view.$().html().match(/href=['"]\/foo\/bar['"]/), "The html (" + view.$().html() + ") has the href /foo/bar in it");
});

