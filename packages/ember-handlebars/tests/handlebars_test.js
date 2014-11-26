/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup
import jQuery from "ember-views/system/jquery";
import run from "ember-metal/run_loop";
import Namespace from "ember-runtime/system/namespace";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberHandlebars from "ember-handlebars";
import EmberObject from "ember-runtime/system/object";
import { A } from "ember-runtime/system/native_array";
import { computed } from "ember-metal/computed";
import ContainerView from "ember-views/views/container_view";
import { Binding } from "ember-metal/binding";
import Container from "ember-runtime/system/container";
import { ViewHelper as handlebarsViewHelper } from "ember-handlebars/helpers/view";
import { ViewHelper as htmlbarsViewHelper } from "ember-htmlbars/helpers/view";

var trim = jQuery.trim;

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

var view;

var appendView = function() {
  run(function() { view.appendTo('#qunit-fixture'); });
};

var originalLookup = Ember.lookup;
var TemplateTests, container, lookup;

/**
  This module specifically tests integration with Handlebars and Ember-specific
  Handlebars extensions.

  If you add additional template support to View, you should create a new
  file in which to test.
*/
QUnit.module("View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
    container = new Container();
    container.optionsForType('template', { instantiate: false });
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    run(function() {
        if (container) {
          container.destroy();
        }
        if (view) {
          view.destroy();
        }
        container = view = null;
    });
    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;
  }
});

test("Template views return throw if their template cannot be found", function() {
  view = EmberView.create({
    templateName: 'cantBeFound',
    container: { lookup: function() { }}
  });

  expectAssertion(function() {
    get(view, 'template');
  }, /cantBeFound/);
});

test("Layout views return throw if their layout cannot be found", function() {
  view = EmberView.create({
    layoutName: 'cantBeFound',
    container: { lookup: function() { }}
  });

  expectAssertion(function() {
    get(view, 'layout');
  }, /cantBeFound/);
});

test("should allow standard Handlebars template usage", function() {
  view = EmberView.create({
    context: { name: "Erik" },
    template: Handlebars.compile("Hello, {{name}}")
  });

  appendView();

  equal(view.$().text(), "Hello, Erik");
});

test("should be able to use standard Handlebars #each helper", function() {
  view = EmberView.create({
    context: { items: ['a', 'b', 'c'] },
    template: Handlebars.compile("{{#each items}}{{this}}{{/each}}")
  });

  appendView();

  equal(view.$().html(), "abc");
});

QUnit.module("Ember.View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
  },

  teardown: function() {
    if (view) {
      run(function() {
        view.destroy();
      });
      view = null;
    }

    Ember.lookup = originalLookup;
  }
});

var MyApp;

QUnit.module("Templates redrawing and bindings", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = EmberObject.create({});
  },
  teardown: function() {
    run(function() {
      if (view) view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("should be able to update when bound property updates", function() {
  MyApp.set('controller', EmberObject.create({name: 'first'}));

  var View = EmberView.extend({
    template: EmberHandlebars.compile('<i>{{view.value.name}}, {{view.computed}}</i>'),
    valueBinding: 'MyApp.controller',
    computed: computed(function() {
      return this.get('value.name') + ' - computed';
    }).property('value')
  });

  run(function() {
    view = View.create();
  });

  appendView();

  run(function() {
    MyApp.set('controller', EmberObject.create({
      name: 'second'
    }));
  });

  equal(view.get('computed'), "second - computed", "view computed properties correctly update");
  equal(view.$('i').text(), 'second, second - computed', "view rerenders when bound properties change");
});

test('should cleanup bound properties on rerender', function() {
  view = EmberView.create({
    controller: EmberObject.create({name: 'wycats'}),
    template: EmberHandlebars.compile('{{name}}')
  });

  appendView();

  equal(view.$().text(), 'wycats', 'rendered binding');

  run(view, 'rerender');

  equal(view._childViews.length, 1);
});

test("should update bound values after view's parent is removed and then re-appended", function() {
  expectDeprecation("Setting `childViews` on a Container is deprecated.");

  var controller = EmberObject.create();

  var parentView = ContainerView.create({
    childViews: ['testView'],

    controller: controller,

    testView: EmberView.create({
      template: EmberHandlebars.compile("{{#if showStuff}}{{boundValue}}{{else}}Not true.{{/if}}")
    })
  });

  controller.setProperties({
    showStuff: true,
    boundValue: "foo"
  });

  run(function() {
    parentView.appendTo('#qunit-fixture');
  });
  view = parentView.get('testView');

  equal(trim(view.$().text()), "foo");
  run(function() {
    set(controller, 'showStuff', false);
  });
  equal(trim(view.$().text()), "Not true.");

  run(function() {
    set(controller, 'showStuff', true);
  });
  equal(trim(view.$().text()), "foo");


  run(function() {
    parentView.remove();
    set(controller, 'showStuff', false);
  });
  run(function() {
    set(controller, 'showStuff', true);
  });
  run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  run(function() {
    set(controller, 'boundValue', "bar");
  });
  equal(trim(view.$().text()), "bar");

  run(function() {
    parentView.destroy();
  });
});

test("should call a registered helper for mustache without parameters", function() {
  EmberHandlebars.registerHelper('foobar', function() {
    return 'foobar';
  });

  view = EmberView.create({
    template: EmberHandlebars.compile("{{foobar}}")
  });

  appendView();

  ok(view.$().text() === 'foobar', "Regular helper was invoked correctly");
});

test("should bind to the property if no registered helper found for a mustache without parameters", function() {
  view = EmberView.createWithMixins({
    template: EmberHandlebars.compile("{{view.foobarProperty}}"),
    foobarProperty: computed(function() {
      return 'foobarProperty';
    })
  });

  appendView();

  ok(view.$().text() === 'foobarProperty', "Property was bound to correctly");
});

test("should accept bindings as a string or an Ember.Binding", function() {
  var viewClass = EmberView.extend({
    template: EmberHandlebars.compile("binding: {{view.bindingTest}}, string: {{view.stringTest}}")
  });

  EmberHandlebars.registerHelper('boogie', function(id, options) {
    options.hash = options.hash || {};
    options.hashTypes = options.hashTypes || {};

    options.hash.bindingTestBinding = Binding.oneWay('context.' + id);
    options.hash.stringTestBinding = id;

    var result;
    if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
      result = htmlbarsViewHelper.helper(viewClass, options.hash, options, options);
    } else {
      result = handlebarsViewHelper.helper(this, viewClass, options);
    }

    return result;
  });

  view = EmberView.create({
    context: EmberObject.create({
      direction: 'down'
    }),
    template: EmberHandlebars.compile("{{boogie direction}}")
  });

  appendView();

  equal(trim(view.$().text()), "binding: down, string: down");
});

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {
// HTMLBars properly handles this scenario
// https://github.com/tildeio/htmlbars/pull/162
test("should provide a helpful assertion for bindings within HTML comments", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('<!-- {{view.someThing}} -->'),
    someThing: 'foo',
    _debugTemplateName: 'blahzorz'
  });

  expectAssertion(function() {
    appendView();
  }, 'An error occured while setting up template bindings. Please check "blahzorz" template for invalid markup or bindings within HTML comments.');
});

// HTMLBars does not throw an error when a missing helper is found
test("using Handlebars helper that doesn't exist should result in an error", function() {
  var names = [{ name: 'Alex' }, { name: 'Stef' }];
  var context = { content: A(names) };

  throws(function() {
    view = EmberView.create({
      context: context,
      template: EmberHandlebars.compile('{{#group}}{{#each name in content}}{{name}}{{/each}}{{/group}}')
    });

    appendView();
  }, "Missing helper: 'group'");
});
}
