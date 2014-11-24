/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup
import jQuery from "ember-views/system/jquery";
import run from "ember-metal/run_loop";
import Namespace from "ember-runtime/system/namespace";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberHandlebars from "ember-handlebars";
import EmberObject from "ember-runtime/system/object";
import ObjectController from "ember-runtime/controllers/object_controller";
import { A } from "ember-runtime/system/native_array";
import { computed } from "ember-metal/computed";
import ContainerView from "ember-views/views/container_view";
import { Binding } from "ember-metal/binding";
import { observersFor } from "ember-metal/observer";
import TextField from "ember-views/views/text_field";
import Container from "ember-runtime/system/container";
import { create as o_create } from "ember-metal/platform";
import { ViewHelper as handlebarsViewHelper } from "ember-handlebars/helpers/view";
import { ViewHelper as htmlbarsViewHelper } from "ember-htmlbars/helpers/view";

var trim = jQuery.trim;

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

function firstGrandchild(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
}

function nthChild(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
}

var firstChild = nthChild;

var originalLog, logCalls;

var caretPosition = function (element) {
  var ctrl = element[0];
  var caretPos = 0;

  // IE Support
  if (document.selection) {
    ctrl.focus();
    var selection = document.selection.createRange();

    selection.moveStart('character', -ctrl.value.length);

    caretPos = selection.text.length;
  }
  // Firefox support
  else if (ctrl.selectionStart || ctrl.selectionStart === '0') {
    caretPos = ctrl.selectionStart;
  }

  return caretPos;
};

var setCaretPosition = function (element, pos) {
  var ctrl = element[0];

  if (ctrl.setSelectionRange) {
    ctrl.focus();
    ctrl.setSelectionRange(pos,pos);
  } else if (ctrl.createTextRange) {
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
};

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

test("template view should call the function of the associated template", function() {
  container.register('template:testTemplate', EmberHandlebars.compile("<h1 id='twas-called'>template was called</h1>"));

  view = EmberView.create({
    container: container,
    templateName: 'testTemplate'
  });

  appendView();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("{{view}} should not override class bindings defined on a child view", function() {
  var LabelView = EmberView.extend({
    container:         container,
    templateName:      'nested',
    classNameBindings: ['something'],
    something:         'visible'
  });

  container.register('controller:label', ObjectController, { instantiate: true });
  container.register('view:label',       LabelView);
  container.register('template:label',   EmberHandlebars.compile('<div id="child-view"></div>'));
  container.register('template:nester', EmberHandlebars.compile('{{render "label"}}'));

  view = EmberView.create({
    container:    container,
    templateName: 'nester',
    controller:   ObjectController.create({
      container: container
    })
  });

  appendView();

  ok(view.$('.visible').length > 0, 'class bindings are not overriden');
});

test("template view should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', EmberHandlebars.compile("<h1 id='twas-called'>template was called for {{view.personName}}. Yea {{view.personName}}</h1>"));

  view = EmberView.createWithMixins({
    container: container,
    templateName: 'testTemplate',

    _personName: "Tom DAAAALE",
    _i: 0,

    personName: computed(function() {
      this._i++;
      return this._personName + this._i;
    })
  });

  appendView();

  equal("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#with view.person as person}}{{person.firstName}} {{person.lastName}} (and {{person.pet.name}}){{/with}}'),

    person: {
      firstName: 'Señor',
      lastName: 'CFC',
      pet: {
        name: 'Fido'
      }
    }
  });

  appendView();

  equal(view.$().text(), "Señor CFC (and Fido)", "prints out values from a hash");
});

test("should read from globals (DEPRECATED)", function() {
  Ember.lookup.Global = 'Klarg';
  view = EmberView.create({
    template: EmberHandlebars.compile('{{Global}}')
  });

  expectDeprecation(function(){
    appendView();
  }, "Global lookup of Global from a Handlebars template is deprecated.");
  equal(view.$().text(), Ember.lookup.Global);
});

test("should read from globals with a path (DEPRECATED)", function() {
  Ember.lookup.Global = { Space: 'Klarg' };
  view = EmberView.create({
    template: EmberHandlebars.compile('{{Global.Space}}')
  });

  expectDeprecation(function(){
    appendView();
  }, "Global lookup of Global.Space from a Handlebars template is deprecated.");
  equal(view.$().text(), Ember.lookup.Global.Space);
});

test("with context, should read from globals (DEPRECATED)", function() {
  Ember.lookup.Global = 'Klarg';
  view = EmberView.create({
    context: {},
    template: EmberHandlebars.compile('{{Global}}')
  });

  expectDeprecation(function(){
    appendView();
  }, "Global lookup of Global from a Handlebars template is deprecated.");
  equal(view.$().text(), Ember.lookup.Global);
});

test("with context, should read from globals with a path (DEPRECATED)", function() {
  Ember.lookup.Global = { Space: 'Klarg' };
  view = EmberView.create({
    context: {},
    template: EmberHandlebars.compile('{{Global.Space}}')
  });

  expectDeprecation(function(){
    appendView();
  }, "Global lookup of Global.Space from a Handlebars template is deprecated.");
  equal(view.$().text(), Ember.lookup.Global.Space);
});

test("should read from a global-ish simple local path without deprecation", function() {
  view = EmberView.create({
    context: { NotGlobal: 'Gwar' },
    template: EmberHandlebars.compile('{{NotGlobal}}')
  });

  expectNoDeprecation();
  appendView();

  equal(view.$().text(), 'Gwar');
});

test("should read a number value", function() {
  var context = { aNumber: 1 };
  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('{{aNumber}}')
  });

  appendView();
  equal(view.$().text(), '1');

  Ember.run(function(){
    Ember.set(context, 'aNumber', 2);
  });
  equal(view.$().text(), '2');
});

test("should read an escaped number value", function() {
  var context = { aNumber: 1 };
  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('{{{aNumber}}}')
  });

  appendView();
  equal(view.$().text(), '1');

  Ember.run(function(){
    Ember.set(context, 'aNumber', 2);
  });
  equal(view.$().text(), '2');
});

test("should read from an Object.create(null)", function() {
  // Use ember's polyfill for Object.create
  var nullObject = o_create(null);
  nullObject['foo'] = 'bar';
  view = EmberView.create({
    context: { nullObject: nullObject },
    template: EmberHandlebars.compile('{{nullObject.foo}}')
  });

  appendView();
  equal(view.$().text(), 'bar');

  Ember.run(function(){
    Ember.set(nullObject, 'foo', 'baz');
  });
  equal(view.$().text(), 'baz');
});

test("should escape HTML in normal mustaches", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{view.output}}'),
    output: "you need to be more <b>bold</b>"
  });

  appendView();
  equal(view.$('b').length, 0, "does not create an element");
  equal(view.$().text(), 'you need to be more <b>bold</b>', "inserts entities, not elements");

  run(function() { set(view, 'output', "you are so <i>super</i>"); });
  equal(view.$().text(), 'you are so <i>super</i>', "updates with entities, not elements");
  equal(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in triple mustaches", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{{view.output}}}'),
    output: "you need to be more <b>bold</b>"
  });

  appendView();

  equal(view.$('b').length, 1, "creates an element");

  run(function() {
    set(view, 'output', "you are so <i>super</i>");
  });

  equal(view.$('i').length, 1, "creates an element when value is updated");
});

test("should not escape HTML if string is a Handlebars.SafeString", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{view.output}}'),
    output: new Handlebars.SafeString("you need to be more <b>bold</b>")
  });

  appendView();

  equal(view.$('b').length, 1, "creates an element");

  run(function() {
    set(view, 'output', new Handlebars.SafeString("you are so <i>super</i>"));
  });

  equal(view.$('i').length, 1, "creates an element when value is updated");
});

test("child views can be inserted using the {{view}} Handlebars helper", function() {
  container.register('template:nester', EmberHandlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view view.labelView}}"));
  container.register('template:nested', EmberHandlebars.compile("<div id='child-view'>Goodbye {{cruel}} {{world}}</div>"));

  var context = {
    world: "world!"
  };

  var LabelView = EmberView.extend({
    container: container,
    tagName: "aside",
    templateName: 'nested'
  });

  view = EmberView.create({
    labelView: LabelView,
    container: container,
    templateName: 'nester',
    context: context
  });

  set(context, 'cruel', "cruel");

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("#child-view:contains('Goodbye cruel world!')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\!/), "parent view should appear before the child view");
});

test("child views can be inserted inside a bind block", function() {
  container.register('template:nester', EmberHandlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view view.bqView}}"));
  container.register('template:nested', EmberHandlebars.compile("<div id='child-view'>Goodbye {{#with content as thing}}{{thing.blah}} {{view view.otherView}}{{/with}} {{world}}</div>"));
  container.register('template:other', EmberHandlebars.compile("cruel"));

  var context = {
    world: "world!"
  };

  var OtherView = EmberView.extend({
    container: container,
    templateName: 'other'
  });

  var BQView = EmberView.extend({
    container: container,
    otherView: OtherView,
    tagName: "blockquote",
    templateName: 'nested'
  });

  view = EmberView.create({
    container: container,
    bqView: BQView,
    context: context,
    templateName: 'nester'
  });

  set(context, 'content', EmberObject.create({ blah: "wot" }));

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");

  ok(view.$("blockquote").text().match(/Goodbye.*wot.*cruel.*world\!/), "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\!/), "parent view should appear before the child view");
});

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {
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

test("View should update when a property changes and the bind helper is used", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#with view.content as thing}}{{bind "thing.wham"}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  run(function() { set(get(view, 'content'), 'wham', 'bazam'); });
  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("View should not use keyword incorrectly - Issue #1315", function() {
  container.register('template:foo', EmberHandlebars.compile('{{#each value in view.content}}{{value}}-{{#each option in view.options}}{{option.value}}:{{option.label}} {{/each}}{{/each}}'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: A(['X', 'Y']),
    options: A([
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 }
    ])
  });

  appendView();

  equal(view.$().text(), 'X-1:One 2:Two Y-1:One 2:Two ');
});

test("View should update when a property changes and no bind helper is used", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#with view.content as thing}}{{thing.wham}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  run(function() { set(get(view, 'content'), 'wham', 'bazam'); });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("View should update when the property used with the #with helper changes [DEPRECATED]", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  expectDeprecation(function() {
    appendView();
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  run(function() {
    set(view, 'content', EmberObject.create({
      wham: 'bazam'
    }));
  });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
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

test("Template views add an elementId to child views created using the view helper", function() {
  container.register('template:parent', EmberHandlebars.compile('<div>{{view view.childView}}</div>'));
  container.register('template:child', EmberHandlebars.compile("I can't believe it's not butter."));

  var ChildView = EmberView.extend({
    container: container,
    templateName: 'child'
  });

  view = EmberView.create({
    container: container,
    childView: ChildView,
    templateName: 'parent'
  });

  appendView();
  var childView = get(view, 'childViews.firstObject');
  equal(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

test("views set the template of their children to a passed block", function() {
  container.register('template:parent', EmberHandlebars.compile('<h1>{{#view}}<span>It worked!</span>{{/view}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'parent'
  });

  appendView();
  ok(view.$('h1:has(span)').length === 1, "renders the passed template inside the parent template");
});

test("views render their template in the context of the parent view's context", function() {
  container.register('template:parent', EmberHandlebars.compile('<h1>{{#with content as person}}{{#view}}{{person.firstName}} {{person.lastName}}{{/view}}{{/with}}</h1>'));

  var context = {
    content: {
      firstName: "Lana",
      lastName: "del Heeeyyyyyy"
    }
  };

  view = EmberView.create({
    container: container,
    templateName: 'parent',
    context: context
  });

  appendView();
  equal(view.$('h1').text(), "Lana del Heeeyyyyyy", "renders properties from parent context");
});

test("views make a view keyword available that allows template to reference view context", function() {
  container.register('template:parent', EmberHandlebars.compile('<h1>{{#with view.content as person}}{{#view person.subview}}{{view.firstName}} {{person.lastName}}{{/view}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'parent',

    content: {
      subview: EmberView.extend({
        firstName: "Brodele"
      }),
      firstName: "Lana",
      lastName: "del Heeeyyyyyy"
    }
  });

  appendView();
  equal(view.$('h1').text(), "Brodele del Heeeyyyyyy", "renders properties from parent context");
});

test("a view helper's bindings are to the parent context", function() {
  var Subview = EmberView.extend({
    classNameBindings: ['color'],
    controller: EmberObject.create({
      color: 'green',
      name: "bar"
    }),
    template: EmberHandlebars.compile('{{view.someController.name}} {{name}}')
  });
  var View = EmberView.extend({
    controller: EmberObject.create({
      color: "mauve",
      name: 'foo'
    }),
    Subview: Subview,
    template: EmberHandlebars.compile('<h1>{{view view.Subview colorBinding="color" someControllerBinding="this"}}</h1>')
  });
  view = View.create();
  appendView();
  equal(view.$('h1 .mauve').length, 1, "renders property on helper declaration from parent context");
  equal(view.$('h1 .mauve').text(), "foo bar", "renders property bound in template from subview context");
});

// test("should warn if setting a template on a view with a templateName already specified", function() {
//   view = EmberView.create({
//     childView: EmberView.extend({
//       templateName: 'foo'
//     }),

//     template: EmberHandlebars.compile('{{#view childView}}test{{/view}}')
//   });

//   expectAssertion(function() {
//     appendView();
//   }, "Unable to find view at path 'childView'");

//   run(function() {
//     view.destroy();
//   });

//   view = EmberView.create({
//     childView: EmberView.extend(),
//     template: EmberHandlebars.compile('{{#view childView templateName="foo"}}test{{/view}}')
//   });

//   expectAssertion(function() {
//     appendView();
//   }, "Unable to find view at path 'childView'");
// });

test("Child views created using the view helper should have their parent view set properly", function() {
  var template = '{{#view}}{{#view}}{{view}}{{/view}}{{/view}}';

  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  appendView();

  var childView = firstGrandchild(view);
  equal(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
});

test("Child views created using the view helper should have their IDs registered for events", function() {
  var template = '{{view}}{{view id="templateViewTest"}}';

  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  appendView();

  var childView = firstChild(view);
  var id = childView.$()[0].id;
  equal(EmberView.views[id], childView, 'childView without passed ID is registered with View.views so that it can properly receive events from EventDispatcher');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equal(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equal(EmberView.views[id], childView, 'childView with passed ID is registered with View.views so that it can properly receive events from EventDispatcher');
});

test("Child views created using the view helper and that have a viewName should be registered as properties on their parentView", function() {
  var template = '{{#view}}{{view viewName="ohai"}}{{/view}}';

  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  appendView();

  var parentView = firstChild(view);
  var childView  = firstGrandchild(view);

  equal(get(parentView, 'ohai'), childView);
});

test("{{view}} id attribute should set id on layer", function() {
  container.register('template:foo', EmberHandlebars.compile('{{#view view.idView id="bar"}}baz{{/view}}'));

  var IdView = EmberView;

  view = EmberView.create({
    idView: IdView,
    container: container,
    templateName: 'foo'
  });

  appendView();

  equal(view.$('#bar').length, 1, "adds id attribute to layer");
  equal(view.$('#bar').text(), 'baz', "emits content");
});

test("{{view}} tag attribute should set tagName of the view", function() {
  container.register('template:foo', EmberHandlebars.compile('{{#view view.tagView tag="span"}}baz{{/view}}'));

  var TagView = EmberView;

  view = EmberView.create({
    tagView: TagView,
    container: container,
    templateName: 'foo'
  });

  appendView();

  equal(view.$('span').length, 1, "renders with tag name");
  equal(view.$('span').text(), 'baz', "emits content");
});

test("{{view}} class attribute should set class on layer", function() {
  container.register('template:foo', EmberHandlebars.compile('{{#view view.idView class="bar"}}baz{{/view}}'));

  var IdView = EmberView;

  view = EmberView.create({
    idView: IdView,
    container: container,
    templateName: 'foo'
  });

  appendView();

  equal(view.$('.bar').length, 1, "adds class attribute to layer");
  equal(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should not allow attributeBindings to be set", function() {
  expectAssertion(function() {
    view = EmberView.create({
      template: EmberHandlebars.compile('{{view attributeBindings="one two"}}')
    });
    appendView();
  }, /Setting 'attributeBindings' via template helpers is not allowed/);
});

test("{{view}} should be able to point to a local view", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile("{{view view.common}}"),

    common: EmberView.extend({
      template: EmberHandlebars.compile("common")
    })
  });

  appendView();

  equal(view.$().text(), "common", "tries to look up view name locally");
});

test("{{view}} should evaluate class bindings set to global paths DEPRECATED", function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create({
      isApp:       true,
      isGreat:     true,
      directClass: "app-direct",
      isEnabled:   true
    });
  });

  view = EmberView.create({
    textField: TextField,
    template: EmberHandlebars.compile('{{view view.textField class="unbound" classBinding="App.isGreat:great App.directClass App.isApp App.isEnabled:enabled:disabled"}}')
  });

  expectDeprecation(function() {
    appendView();
  });

  ok(view.$('input').hasClass('unbound'),     "sets unbound classes directly");
  ok(view.$('input').hasClass('great'),       "evaluates classes bound to global paths");
  ok(view.$('input').hasClass('app-direct'),  "evaluates classes bound directly to global paths");
  ok(view.$('input').hasClass('is-app'),      "evaluates classes bound directly to booleans in global paths - dasherizes and sets class when true");
  ok(view.$('input').hasClass('enabled'),     "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),   "evaluates ternary operator in classBindings");

  run(function() {
    App.set('isApp', false);
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-app'),     "evaluates classes bound directly to booleans in global paths - removes class when false");
  ok(!view.$('input').hasClass('enabled'),    "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),    "evaluates ternary operator in classBindings");

  run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate class bindings set in the current context", function() {
  view = EmberView.create({
    isView:      true,
    isEditable:  true,
    directClass: "view-direct",
    isEnabled: true,
    textField: TextField,
    template: EmberHandlebars.compile('{{view view.textField class="unbound" classBinding="view.isEditable:editable view.directClass view.isView view.isEnabled:enabled:disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),     "sets unbound classes directly");
  ok(view.$('input').hasClass('editable'),    "evaluates classes bound in the current context");
  ok(view.$('input').hasClass('view-direct'), "evaluates classes bound directly in the current context");
  ok(view.$('input').hasClass('is-view'),     "evaluates classes bound directly to booleans in the current context - dasherizes and sets class when true");
  ok(view.$('input').hasClass('enabled'),     "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),   "evaluates ternary operator in classBindings");

  run(function() {
    view.set('isView', false);
    view.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-view'),    "evaluates classes bound directly to booleans in the current context - removes class when false");
  ok(!view.$('input').hasClass('enabled'),    "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),    "evaluates ternary operator in classBindings");
});

test("{{view}} should evaluate class bindings set with either classBinding or classNameBindings from globals DEPRECATED", function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create({
      isGreat: true,
      isEnabled: true
    });
  });

  view = EmberView.create({
    textField: TextField,
    template: EmberHandlebars.compile('{{view view.textField class="unbound" classBinding="App.isGreat:great App.isEnabled:enabled:disabled" classNameBindings="App.isGreat:really-great App.isEnabled:really-enabled:really-disabled"}}')
  });

  expectDeprecation(function() {
    appendView();
  });

  ok(view.$('input').hasClass('unbound'),          "sets unbound classes directly");
  ok(view.$('input').hasClass('great'),            "evaluates classBinding");
  ok(view.$('input').hasClass('really-great'),     "evaluates classNameBinding");
  ok(view.$('input').hasClass('enabled'),          "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('really-enabled'),   "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),        "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('really-disabled'), "evaluates ternary operator in classBindings");

  run(function() {
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('enabled'),        "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('really-enabled'), "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),        "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('really-disabled'), "evaluates ternary operator in classBindings");

  run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate other attribute bindings set to global paths", function() {
  run(function() {
    lookup.App = Namespace.create({
      name: "myApp"
    });
  });

  view = EmberView.create({
    textField: TextField,
    template: EmberHandlebars.compile('{{view view.textField valueBinding="App.name"}}')
  });

  expectDeprecation(function() {
    appendView();
  }, 'Global lookup of App.name from a Handlebars template is deprecated.');

  equal(view.$('input').val(), "myApp", "evaluates attributes bound to global paths");

  run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate other attributes bindings set in the current context", function() {
  view = EmberView.create({
    name: "myView",
    textField: TextField,
    template: EmberHandlebars.compile('{{view view.textField valueBinding="view.name"}}')
  });

  appendView();

  equal(view.$('input').val(), "myView", "evaluates attributes bound in the current context");
});

test("{{view}} should be able to bind class names to truthy properties", function() {
  container.register('template:template', EmberHandlebars.compile('{{#view view.classBindingView classBinding="view.number:is-truthy"}}foo{{/view}}'));

  var ClassBindingView = EmberView.extend();

  view = EmberView.create({
    classBindingView: ClassBindingView,
    container: container,
    number: 5,
    templateName: 'template'
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name");

  run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "removes class name if bound property is set to falsey");
});

test("{{view}} should be able to bind class names to truthy or falsy properties", function() {
  container.register('template:template', EmberHandlebars.compile('{{#view view.classBindingView classBinding="view.number:is-truthy:is-falsy"}}foo{{/view}}'));

  var ClassBindingView = EmberView.extend();

  view = EmberView.create({
    classBindingView: ClassBindingView,
    container: container,
    number: 5,
    templateName: 'template'
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name to truthy value");
  equal(view.$('.is-falsy').length, 0, "doesn't set class name to falsy value");

  run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "doesn't set class name to truthy value");
  equal(view.$('.is-falsy').length, 1, "sets class name to falsy value");
});

test("should not reset cursor position when text field receives keyUp event", function() {
  view = TextField.create({
    value: "Broseidon, King of the Brocean"
  });

  run(function() {
    view.append();
  });

  view.$().val('Brosiedoon, King of the Brocean');
  setCaretPosition(view.$(), 5);

  run(function() {
    view.trigger('keyUp', {});
  });

  equal(caretPosition(view.$()), 5, "The keyUp event should not result in the cursor being reset due to the bind-attr observers");

  run(function() {
    view.destroy();
  });
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

test("should work with precompiled templates", function() {
  var templateString = EmberHandlebars.precompile("{{view.value}}");
  var compiledTemplate = EmberHandlebars.template(eval(templateString));

  view = EmberView.create({
    value: "rendered",
    template: compiledTemplate
  });

  appendView();

  equal(view.$().text(), "rendered", "the precompiled template was rendered");

  run(function() { view.set('value', 'updated'); });

  equal(view.$().text(), "updated", "the precompiled template was updated");
});

test("should expose a controller keyword when present on the view", function() {
  var templateString = "{{controller.foo}}{{#view}}{{controller.baz}}{{/view}}";
  view = EmberView.create({
    container: container,
    controller: EmberObject.create({
      foo: "bar",
      baz: "bang"
    }),

    template: EmberHandlebars.compile(templateString)
  });

  appendView();

  equal(view.$().text(), "barbang", "renders values from controller and parent controller");

  var controller = get(view, 'controller');

  run(function() {
    controller.set('foo', "BAR");
    controller.set('baz', "BLARGH");
  });

  equal(view.$().text(), "BARBLARGH", "updates the DOM when a bound value is updated");

  run(function() {
    view.destroy();
  });

  view = EmberView.create({
    controller: "aString",
    template: EmberHandlebars.compile("{{controller}}")
  });

  appendView();

  equal(view.$().text(), "aString", "renders the controller itself if no additional path is specified");
});

test("should expose a controller keyword that can be used in conditionals", function() {
  var templateString = "{{#view}}{{#if controller}}{{controller.foo}}{{/if}}{{/view}}";
  view = EmberView.create({
    container: container,
    controller: EmberObject.create({
      foo: "bar"
    }),

    template: EmberHandlebars.compile(templateString)
  });

  appendView();

  equal(view.$().text(), "bar", "renders values from controller and parent controller");

  run(function() {
    view.set('controller', null);
  });

  equal(view.$().text(), "", "updates the DOM when the controller is changed");
});

test("should expose a controller keyword that persists through Ember.ContainerView", function() {
  var templateString = "{{view view.containerView}}";
  view = EmberView.create({
    containerView: ContainerView,
    container: container,
    controller: EmberObject.create({
      foo: "bar"
    }),

    template: EmberHandlebars.compile(templateString)
  });

  appendView();

  var containerView = get(view, 'childViews.firstObject');
  var viewInstanceToBeInserted = EmberView.create({
    template: EmberHandlebars.compile('{{controller.foo}}')
  });

  run(function() {
    containerView.pushObject(viewInstanceToBeInserted);
  });

  equal(trim(viewInstanceToBeInserted.$().text()), "bar", "renders value from parent's controller");
});

test("should expose a view keyword [DEPRECATED]", function() {
  var templateString = '{{#with view.differentContent}}{{view.foo}}{{#view baz="bang"}}{{view.baz}}{{/view}}{{/with}}';
  view = EmberView.create({
    container: container,
    differentContent: {
      view: {
        foo: "WRONG",
        baz: "WRONG"
      }
    },

    foo: "bar",

    template: EmberHandlebars.compile(templateString)
  });

  expectDeprecation(function() {
    appendView();
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$().text(), "barbang", "renders values from view and child view");
});

test("should be able to explicitly set a view's context", function() {
  var context = EmberObject.create({
    test: 'test'
  });

  var CustomContextView = EmberView.extend({
    context: context,
    template: EmberHandlebars.compile("{{test}}")
  });

  view = EmberView.create({
    customContextView: CustomContextView,
    template: EmberHandlebars.compile("{{view view.customContextView}}")
  });

  appendView();

  equal(view.$().text(), "test");
});

test("should escape HTML in primitive value contexts when using normal mustaches", function() {
  view = EmberView.create({
    context: '<b>Max</b><b>James</b>',
    template: EmberHandlebars.compile('{{this}}'),
  });

  appendView();

  equal(view.$('b').length, 0, "does not create an element");
  equal(view.$().text(), '<b>Max</b><b>James</b>', "inserts entities, not elements");

  run(function() { set(view, 'context', '<i>Max</i><i>James</i>'); });

  equal(view.$().text(), '<i>Max</i><i>James</i>', "updates with entities, not elements");
  equal(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in primitive value contexts when using triple mustaches", function() {
  view = EmberView.create({
    context: '<b>Max</b><b>James</b>',
    template: EmberHandlebars.compile('{{{this}}}'),
  });

  appendView();

  equal(view.$('b').length, 2, "creates an element");

  run(function() { set(view, 'context', '<i>Max</i><i>James</i>'); });

  equal(view.$('i').length, 2, "creates an element when value is updated");
});

QUnit.module("Ember.View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = Ember.Logger.log;
    logCalls = [];
    Ember.Logger.log = function(arg) { logCalls.push(arg); };
  },

  teardown: function() {
    if (view) {
      run(function() {
        view.destroy();
      });
      view = null;
    }

    Ember.Logger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

test("should be able to log a property", function() {
  var context = {
    value: 'one'
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('{{log value}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
});

test("should be able to log a view property", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{log view.value}}'),
    value: 'one'
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
});

test("should be able to log `this`", function() {
  view = EmberView.create({
    context: 'one',
    template: EmberHandlebars.compile('{{log this}}'),
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with item one");
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

test("bindings should be relative to the current context", function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: "SFMoMA",
      price: 20
    }),

    museumView: EmberView.extend({
      template: EmberHandlebars.compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: EmberHandlebars.compile('{{#if view.museumOpen}} {{view view.museumView nameBinding="view.museumDetails.name" dollarsBinding="view.museumDetails.price"}} {{/if}}')
  });

  appendView();

  equal(trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings should respect keywords", function() {
  view = EmberView.create({
    museumOpen: true,

    controller: {
      museumOpen: true,
      museumDetails: EmberObject.create({
        name: "SFMoMA",
        price: 20
      })
    },

    museumView: EmberView.extend({
      template: EmberHandlebars.compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: EmberHandlebars.compile('{{#if view.museumOpen}}{{view view.museumView nameBinding="controller.museumDetails.name" dollarsBinding="controller.museumDetails.price"}}{{/if}}')
  });

  appendView();

  equal(trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings can be 'this', in which case they *are* the current context [DEPRECATED]", function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: "SFMoMA",
      price: 20,
      museumView: EmberView.extend({
        template: EmberHandlebars.compile('Name: {{view.museum.name}} Price: ${{view.museum.price}}')
      })
    }),


    template: EmberHandlebars.compile('{{#if view.museumOpen}} {{#with view.museumDetails}}{{view museumView museum=this}} {{/with}}{{/if}}')
  });

  expectDeprecation(function() {
    appendView();
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

// https://github.com/emberjs/ember.js/issues/120

test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  var LinkView = EmberView.extend({
    classNames: ['app-link'],
    tagName: 'a',
    attributeBindings: ['href'],
    href: '#none',

    click: function() {
      return false;
    }
  });

  var parentView = EmberView.create({
    linkView: LinkView,
    test: EmberObject.create({ href: 'test' }),
    template: EmberHandlebars.compile('{{#view view.linkView hrefBinding="view.test.href"}} Test {{/view}}')
  });


  run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  // Use match, since old IE appends the whole URL
  var href = parentView.$('a').attr('href');
  ok(href.match(/(^|\/)test$/), "Expected href to be 'test' but got '"+href+"'");

  run(function() {
    parentView.destroy();
  });
});

test("should update bound values after the view is removed and then re-appended", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile("{{#if view.showStuff}}{{view.boundValue}}{{else}}Not true.{{/if}}"),
    showStuff: true,
    boundValue: "foo"
  });

  appendView();

  equal(trim(view.$().text()), "foo");
  run(function() {
    set(view, 'showStuff', false);
  });
  equal(trim(view.$().text()), "Not true.");

  run(function() {
    set(view, 'showStuff', true);
  });
  equal(trim(view.$().text()), "foo");

  run(function() {
    view.remove();
    set(view, 'showStuff', false);
  });
  run(function() {
    set(view, 'showStuff', true);
  });
  appendView();

  run(function() {
    set(view, 'boundValue', "bar");
  });
  equal(trim(view.$().text()), "bar");
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

test("should teardown observers from bound properties on rerender", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile("{{view.foo}}"),
    foo: 'bar'
  });

  appendView();

  equal(observersFor(view, 'foo').length, 1);

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 1);
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
}
