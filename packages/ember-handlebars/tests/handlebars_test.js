/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup
import jQuery from "ember-views/system/jquery";
// import {expectAssertion} from "ember-metal/tests/debug_helpers";
import { forEach } from "ember-metal/enumerable_utils";
import run from "ember-metal/run_loop";
import Namespace from "ember-runtime/system/namespace";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-handlebars/views/metamorph_view";
import EmberHandlebars from "ember-handlebars";
import EmberObject from "ember-runtime/system/object";
import ObjectController from "ember-runtime/controllers/object_controller";
import { A } from "ember-runtime/system/native_array";
import { computed } from "ember-metal/computed";
import { fmt } from "ember-runtime/system/string";
import { typeOf } from "ember-metal/utils";
import ArrayProxy from "ember-runtime/system/array_proxy";
import CollectionView from "ember-views/views/collection_view";
import ContainerView from "ember-views/views/container_view";
import { Binding } from "ember-metal/binding";
import { observersFor } from "ember-metal/observer";
import TextField from "ember-handlebars/controls/text_field";
import Container from "ember-runtime/system/container";

import htmlSafe from "ember-handlebars/string";

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
    template: EmberHandlebars.compile('{{#with view.person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

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

  expectNoDeprecation(/Global lookup/);
  appendView();

  equal(view.$().text(), 'Gwar');
});

test("htmlSafe should return an instance of Handlebars.SafeString", function() {
  var safeString = htmlSafe("you need to be more <b>bold</b>");

  ok(safeString instanceof Handlebars.SafeString, "should return SafeString");
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

test("should accept relative paths to views", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('Hey look, at {{view "view.myCool.view"}}'),

    myCool: EmberObject.create({
      view: EmberView.extend({
        template: EmberHandlebars.compile("my cool view")
      })
    })
  });

  appendView();

  equal(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  container.register('template:nester', EmberHandlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view view.bqView}}"));
  container.register('template:nested', EmberHandlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view view.otherView}}{{/with}} {{world}}</div>"));
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

test("View should bind properties in the parent context", function() {
  var context = {
    content: EmberObject.create({
      wham: 'bam'
    }),

    blam: "shazam"
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('<h1 id="first">{{#with content}}{{wham}}-{{../blam}}{{/with}}</h1>')
  });

  appendView();

  equal(view.$('#first').text(), "bam-shazam", "renders parent properties");
});

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

test("View should bind properties in the grandparent context", function() {
  var context = {
    content: EmberObject.create({
      wham: 'bam',
      thankYou: EmberObject.create({
        value: "ma'am"
      })
    }),

    blam: "shazam"
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('<h1 id="first">{{#with content}}{{#with thankYou}}{{value}}-{{../wham}}-{{../../blam}}{{/with}}{{/with}}</h1>')
  });

  appendView();

  equal(view.$('#first').text(), "ma'am-bam-shazam", "renders grandparent properties");
});

test("View should update when a property changes and the bind helper is used", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#with view.content}}{{bind "wham"}}{{/with}}</h1>'));

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
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

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

test("View should update when the property used with the #with helper changes", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

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

  run(function() {
    set(view, 'content', EmberObject.create({
      wham: 'bazam'
    }));
  });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("should not update when a property is removed from the view", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#bind "view.content"}}{{#bind "foo"}}{{bind "baz"}}{{/bind}}{{/bind}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      foo: EmberObject.create({
        baz: "unicorns"
      })
    })
  });

  appendView();

  equal(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = get(view, 'content');

  run(function() {
    set(view, 'content', EmberObject.create({
      foo: EmberObject.create({
        baz: "ninjas"
      })
    }));
  });

  equal(view.$('#first').text(), 'ninjas', "updates to new content value");

  run(function() {
    set(oldContent, 'foo.baz', 'rockstars');
  });

  run(function() {
    set(oldContent, 'foo.baz', 'ewoks');
  });

  equal(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  container.register('template:menu', EmberHandlebars.compile('<h1>Today\'s Menu</h1>{{#bind "view.coffee"}}<h2>{{color}} coffee</h2><span id="price">{{bind "price"}}</span>{{/bind}}'));

  run(function() {
    view = EmberView.create({
      container: container,
      templateName: 'menu',

      coffee: EmberObject.create({
        color: 'brown',
        price: '$4'
      })
    });
  });

  appendView();

  equal(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equal(view.$('#price').text(), '$4', "precond - renders price correctly");

  run(function() {
    set(view, 'coffee', EmberObject.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$4.50", "should update price field when content changes");

  run(function() {
    set(view, 'coffee', EmberObject.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$5.50", "should update price field when content changes");

  run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('#price').text(), "$5", "should update price field when price property is changed");

  run(function() {
    view.destroy();
  });
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  container.register('template:menu', EmberHandlebars.compile('<h1>{{bind "view.coffee.price"}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    coffee: EmberObject.create({
      price: '$4'
    })
  });

  appendView();

  equal(view.$('h1').text(), "$4", "precond - renders price");

  run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property changes");

  run(function() {
    set(view, 'coffee', { price: "$6" });
  });

  equal(view.$('h1').text(), "$6", "updates when parent property changes");
});

test("Template updates correctly if a path is passed to the bind helper and the context object is an ObjectController", function() {
  container.register('template:menu', EmberHandlebars.compile('<h1>{{bind "view.coffee.price"}}</h1>'));

  var controller = ObjectController.create();

  var realObject = EmberObject.create({
    price: "$4"
  });

  set(controller, 'model', realObject);

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    coffee: controller
  });

  appendView();

  equal(view.$('h1').text(), "$4", "precond - renders price");

  run(function() {
    set(realObject, 'price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property is set on real object");

  run(function() {
    set(controller, 'price', "$6" );
  });

  equal(view.$('h1').text(), "$6", "updates when property is set on object controller");
});

test("should update the block when object passed to #if helper changes", function() {
  container.register('template:menu', EmberHandlebars.compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView();

  equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "renders block if a string");

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', fmt("hides block when conditional is '%@'", [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("should update the block when object passed to #unless helper changes", function() {
  container.register('template:advice', EmberHandlebars.compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  appendView();

  equal(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', fmt("renders block when conditional is '%@'; %@", [String(val), typeOf(val)]));

    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), "", "precond - hides block when conditional is true");
  });
});

test("should update the block when object passed to #if helper changes and an inverse is supplied", function() {
  container.register('template:menu', EmberHandlebars.compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  appendView();

  equal(view.$('h1').text(), "BOONG?", "renders alternate if false");

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', fmt("renders alternate if %@", [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("edge case: child conditional should not render children if parent conditional becomes false", function() {
  var childCreated = false;
  var child = null;

  view = EmberView.create({
    cond1: true,
    cond2: false,
    viewClass: EmberView.extend({
      init: function() {
        this._super();
        childCreated = true;
        child = this;
      }
    }),
    template: EmberHandlebars.compile('{{#if view.cond1}}{{#if view.cond2}}{{#view view.viewClass}}test{{/view}}{{/if}}{{/if}}')
  });

  appendView();

  ok(!childCreated, 'precondition');

  run(function() {
    // The order of these sets is important for the test
    view.set('cond2', true);
    view.set('cond1', false);
  });

  // TODO: Priority Queue, for now ensure correct result.
  //ok(!childCreated, 'child should not be created');
  ok(child.isDestroyed, 'child should be gone');
  equal(view.$().text(), '');
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
  container.register('template:parent', EmberHandlebars.compile('<h1>{{#with content}}{{#view}}{{firstName}} {{lastName}}{{/view}}{{/with}}</h1>'));

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
  container.register('template:parent', EmberHandlebars.compile('<h1>{{#with view.content}}{{#view subview}}{{view.firstName}} {{lastName}}{{/view}}{{/with}}</h1>'));

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

test("Collection views that specify an example view class have their children be of that class", function() {
  var ExampleViewCollection = CollectionView.extend({
    itemViewClass: EmberView.extend({
      isCustom: true
    }),

    content: A(['foo'])
  });

  view = EmberView.create({
    exampleViewCollection: ExampleViewCollection,
    template: EmberHandlebars.compile('{{#collection view.exampleViewCollection}}OHAI{{/collection}}')
  });

  run(function() {
    view.append();
  });

  ok(firstGrandchild(view).isCustom, "uses the example view class");
});

test("itemViewClass works in the #collection helper with a global (DEPRECATED)", function() {
  TemplateTests.ExampleItemView = EmberView.extend({
    isAlsoCustom: true
  });

  view = EmberView.create({
    exampleController: ArrayProxy.create({
      content: A(['alpha'])
    }),
    template: EmberHandlebars.compile('{{#collection content=view.exampleController itemViewClass="TemplateTests.ExampleItemView"}}beta{{/collection}}')
  });

  expectDeprecation(function(){
    run(view, 'append');
  }, /Resolved the view "TemplateTests.ExampleItemView" on the global context/);

  ok(firstGrandchild(view).isAlsoCustom, "uses the example view class specified in the #collection helper");
});

test("itemViewClass works in the #collection helper relatively", function() {
  var ExampleItemView = EmberView.extend({
    isAlsoCustom: true
  });

  var ExampleCollectionView = CollectionView.extend({
    possibleItemView: ExampleItemView
  });

  view = EmberView.create({
    exampleCollectionView: ExampleCollectionView,
    exampleController: ArrayProxy.create({
      content: A(['alpha'])
    }),
    template: EmberHandlebars.compile('{{#collection view.exampleCollectionView content=view.exampleController itemViewClass="possibleItemView"}}beta{{/collection}}')
  });

  run(function() {
    view.append();
  });

  ok(firstGrandchild(view).isAlsoCustom, "uses the example view class specified in the #collection helper");
});

test("itemViewClass works in the #collection via container", function() {
  container.register('view:example-item', EmberView.extend({
    isAlsoCustom: true
  }));

  view = EmberView.create({
    container: container,
    exampleCollectionView: CollectionView.extend(),
    exampleController: ArrayProxy.create({
      content: A(['alpha'])
    }),
    template: EmberHandlebars.compile('{{#collection view.exampleCollectionView content=view.exampleController itemViewClass="example-item"}}beta{{/collection}}')
  });

  run(function() {
    view.append();
  });

  ok(firstGrandchild(view).isAlsoCustom, "uses the example view class specified in the #collection helper");
});

test("should update boundIf blocks if the conditional changes", function() {
  container.register('template:foo', EmberHandlebars.compile('<h1 id="first">{{#boundIf "view.content.myApp.isEnabled"}}{{view.content.wham}}{{/boundIf}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am",
      myApp: EmberObject.create({
        isEnabled: true
      })
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "renders block when condition is true");

  run(function() {
    set(get(view, 'content'), 'myApp.isEnabled', false);
  });

  equal(view.$('#first').text(), "", "re-renders without block when condition is false");

  run(function() {
    set(get(view, 'content'), 'myApp.isEnabled', true);
  });

  equal(view.$('#first').text(), "bam", "re-renders block when condition changes to true");
});

test("should not update boundIf if truthiness does not change", function() {
  var renderCount = 0;

  view = EmberView.create({
    template: EmberHandlebars.compile('<h1 id="first">{{#boundIf "view.shouldDisplay"}}{{view view.InnerViewClass}}{{/boundIf}}</h1>'),

    shouldDisplay: true,

    InnerViewClass: EmberView.extend({
      template: EmberHandlebars.compile("bam"),

      render: function() {
        renderCount++;
        return this._super.apply(this, arguments);
      }
    })
  });

  appendView();

  equal(renderCount, 1, "precond - should have rendered once");
  equal(view.$('#first').text(), "bam", "renders block when condition is true");

  run(function() {
    set(view, 'shouldDisplay', 1);
  });

  equal(renderCount, 1, "should not have rerendered");
  equal(view.$('#first').text(), "bam", "renders block when condition is true");
});

test("boundIf should support parent access", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile(
      '<h1 id="first">{{#with view.content}}{{#with thankYou}}'+
        '{{#boundIf ../view.show}}parent{{/boundIf}}-{{#boundIf ../../view.show}}grandparent{{/boundIf}}'+
      '{{/with}}{{/with}}</h1>'
    ),

    content: EmberObject.create({
      show: true,
      thankYou: EmberObject.create()
    }),

    show: true
  });

  appendView();

  equal(view.$('#first').text(), "parent-grandparent", "renders boundIfs using ..");
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
  }, /Setting 'attributeBindings' via Handlebars is not allowed/);
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

test("{{view}} should evaluate class bindings set to global paths", function() {
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

  appendView();

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

test("{{view}} should evaluate class bindings set with either classBinding or classNameBindings", function() {
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

  appendView();

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

  appendView();

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

test("should be able to bind element attributes using {{bind-attr}}", function() {
  var template = EmberHandlebars.compile('<img {{bind-attr src="view.content.url" alt="view.content.title"}}>');

  view = EmberView.create({
    template: template,
    content: EmberObject.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  run(function() {
    set(view, 'content', EmberObject.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equal(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equal(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  run(function() {
    set(view, 'content', EmberObject.createWithMixins({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equal(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");
});

test("should be able to bind to view attributes with {{bind-attr}}", function() {
  view = EmberView.create({
    value: 'Test',
    template: EmberHandlebars.compile('<img src="test.jpg" {{bind-attr alt="view.value"}}>')
  });

  appendView();

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  run(function() {
    view.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

test("should be able to bind to globals with {{bind-attr}} (DEPRECATED)", function() {
  TemplateTests.set('value', 'Test');

  view = EmberView.create({
    template: EmberHandlebars.compile('<img src="test.jpg" {{bind-attr alt="TemplateTests.value"}}>')
  });

  expectDeprecation(function(){
    appendView();
  }, /Global lookup of TemplateTests.value from a Handlebars template is deprecated/);

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  expectDeprecation(function(){
    run(function() {
      TemplateTests.set('value', 'Updated');
    });
  }, /Global lookup of TemplateTests.value from a Handlebars template is deprecated/);

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

test("should not allow XSS injection via {{bind-attr}}", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('<img src="test.jpg" {{bind-attr alt="view.content.value"}}>'),
    content: {
      value: 'Trololol" onmouseover="alert(\'HAX!\');'
    }
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('alt'), 'Trololol" onmouseover="alert(\'HAX!\');');
});

test("should be able to bind use {{bind-attr}} more than once on an element", function() {
  var template = EmberHandlebars.compile('<img {{bind-attr src="view.content.url"}} {{bind-attr alt="view.content.title"}}>');

  view = EmberView.create({
    template: template,
    content: EmberObject.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  run(function() {
    set(view, 'content', EmberObject.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equal(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equal(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  run(function() {
    set(view, 'content', EmberObject.createWithMixins({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equal(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");

});

test("{{bindAttr}} is aliased to {{bind-attr}}", function() {

  var originalBindAttr = EmberHandlebars.helpers['bind-attr'];
  var originalWarn = Ember.warn;

  Ember.warn = function(msg) {
    equal(msg, "The 'bindAttr' view helper is deprecated in favor of 'bind-attr'", 'Warning called');
  };

  EmberHandlebars.helpers['bind-attr'] = function() {
    equal(arguments[0], 'foo', 'First arg match');
    equal(arguments[1], 'bar', 'Second arg match');
    return 'result';
  };
  var result = EmberHandlebars.helpers.bindAttr('foo', 'bar');
  equal(result, 'result', 'Result match');

  EmberHandlebars.helpers['bind-attr'] = originalBindAttr;
  Ember.warn = originalWarn;
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

test("should be able to bind element attributes using {{bind-attr}} inside a block", function() {
  var template = EmberHandlebars.compile('{{#with view.content}}<img {{bind-attr src="url" alt="title"}}>{{/with}}');

  view = EmberView.create({
    template: template,
    content: EmberObject.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bind-attr}}", function() {
  var template = EmberHandlebars.compile('<img {{bind-attr class="view.foo"}}>');

  view = EmberView.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equal(view.$('img').attr('class'), 'bar', "renders class");

  run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind class attribute via a truthy property with {{bind-attr}}", function() {
  var template = EmberHandlebars.compile('<img {{bind-attr class="view.isNumber:is-truthy"}}>');

  view = EmberView.create({
    template: template,
    isNumber: 5
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name");

  run(function() {
    set(view, 'isNumber', 0);
  });

  equal(view.$('.is-truthy').length, 0, "removes class name if bound property is set to something non-truthy");
});

test("should be able to bind class to view attribute with {{bind-attr}}", function() {
  var template = EmberHandlebars.compile('<img {{bind-attr class="view.foo"}}>');

  view = EmberView.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equal(view.$('img').attr('class'), 'bar', "renders class");

  run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

test("should not allow XSS injection via {{bind-attr}} with class", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('<img {{bind-attr class="view.foo"}}>'),
    foo: '" onmouseover="alert(\'I am in your classes hacking your app\');'
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('class'), '" onmouseover="alert(\'I am in your classes hacking your app\');');
});

test("should be able to bind class attribute using ternary operator in {{bind-attr}}", function() {
  var template = EmberHandlebars.compile('<img {{bind-attr class="view.content.isDisabled:disabled:enabled"}} />');
  var content = EmberObject.create({
    isDisabled: true
  });

  view = EmberView.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('img').hasClass('disabled'), 'disabled class is rendered');
  ok(!view.$('img').hasClass('enabled'), 'enabled class is not rendered');

  run(function() {
    set(content, 'isDisabled', false);
  });

  ok(!view.$('img').hasClass('disabled'), 'disabled class is not rendered');
  ok(view.$('img').hasClass('enabled'), 'enabled class is rendered');
});

test("should be able to add multiple classes using {{bind-attr class}}", function() {
  var template = EmberHandlebars.compile('<div {{bind-attr class="view.content.isAwesomeSauce view.content.isAlsoCool view.content.isAmazing:amazing :is-super-duper view.content.isEnabled:enabled:disabled"}}></div>');
  var content = EmberObject.create({
    isAwesomeSauce: true,
    isAlsoCool: true,
    isAmazing: true,
    isEnabled: true
  });

  view = EmberView.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('div').hasClass('is-awesome-sauce'), "dasherizes first property and sets classname");
  ok(view.$('div').hasClass('is-also-cool'), "dasherizes second property and sets classname");
  ok(view.$('div').hasClass('amazing'), "uses alias for third property and sets classname");
  ok(view.$('div').hasClass('is-super-duper'), "static class is present");
  ok(view.$('div').hasClass('enabled'), "truthy class in ternary classname definition is rendered");
  ok(!view.$('div').hasClass('disabled'), "falsy class in ternary classname definition is not rendered");

  run(function() {
    set(content, 'isAwesomeSauce', false);
    set(content, 'isAmazing', false);
    set(content, 'isEnabled', false);
  });

  ok(!view.$('div').hasClass('is-awesome-sauce'), "removes dasherized class when property is set to false");
  ok(!view.$('div').hasClass('amazing'), "removes aliased class when property is set to false");
  ok(view.$('div').hasClass('is-super-duper'), "static class is still present");
  ok(!view.$('div').hasClass('enabled'), "truthy class in ternary classname definition is not rendered");
  ok(view.$('div').hasClass('disabled'), "falsy class in ternary classname definition is rendered");
});

test("should be able to bind classes to globals with {{bind-attr class}} (DEPRECATED)", function() {
  TemplateTests.set('isOpen', true);

  view = EmberView.create({
    template: EmberHandlebars.compile('<img src="test.jpg" {{bind-attr class="TemplateTests.isOpen"}}>')
  });

  expectDeprecation(function(){
    appendView();
  }, /Global lookup of TemplateTests.isOpen from a Handlebars template is deprecated/);

  ok(view.$('img').hasClass('is-open'), "sets classname to the dasherized value of the global property");

  expectDeprecation(function(){
    run(function() {
      TemplateTests.set('isOpen', false);
    });
  }, /Global lookup of TemplateTests.isOpen from a Handlebars template is deprecated/);

  ok(!view.$('img').hasClass('is-open'), "removes the classname when the global property has changed");
});

test("should be able to bind-attr to 'this' in an {{#each}} block", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#each view.images}}<img {{bind-attr src="this"}}>{{/each}}'),
    images: A(['one.png', 'two.jpg', 'three.gif'])
  });

  appendView();

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));
});

test("should be able to bind classes to 'this' in an {{#each}} block with {{bind-attr class}}", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#each view.items}}<li {{bind-attr class="this"}}>Item</li>{{/each}}'),
    items: A(['a', 'b', 'c'])
  });

  appendView();

  ok(view.$('li').eq(0).hasClass('a'), "sets classname to the value of the first item");
  ok(view.$('li').eq(1).hasClass('b'), "sets classname to the value of the second item");
  ok(view.$('li').eq(2).hasClass('c'), "sets classname to the value of the third item");
});

test("should be able to bind-attr to var in {{#each var in list}} block", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#each image in view.images}}<img {{bind-attr src="image"}}>{{/each}}'),
    images: A(['one.png', 'two.jpg', 'three.gif'])
  });

  appendView();

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));

  run(function() {
    var imagesArray = view.get('images');
    imagesArray.removeAt(0);
  });

  images = view.$('img');
  ok(images.length === 2, "");
  ok(/two\.jpg$/.test(images[0].src));
  ok(/three\.gif$/.test(images[1].src));
});

test("should be able to output a property without binding", function() {
  var context = {
    content: EmberObject.create({
      anUnboundString: "No spans here, son."
    }),

    anotherUnboundString: "Not here, either."
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile(
      '<div id="first">{{unbound content.anUnboundString}}</div>'+
      '{{#with content}}<div id="second">{{unbound ../anotherUnboundString}}</div>{{/with}}'
    )
  });

  appendView();

  equal(view.$('#first').html(), "No spans here, son.");
  equal(view.$('#second').html(), "Not here, either.");
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

test("should be able to use unbound helper in #each helper", function() {
  view = EmberView.create({
    items: A(['a', 'b', 'c', 1, 2, 3]),
    template: EmberHandlebars.compile(
      "<ul>{{#each view.items}}<li>{{unbound this}}</li>{{/each}}</ul>")
  });

  appendView();

  equal(view.$().text(), "abc123");
  equal(view.$('li').children().length, 0, "No markers");
});

test("should be able to use unbound helper in #each helper (with objects)", function() {
  view = EmberView.create({
    items: A([{wham: 'bam'}, {wham: 1}]),
    template: EmberHandlebars.compile(
      "<ul>{{#each view.items}}<li>{{unbound wham}}</li>{{/each}}</ul>")
  });

  appendView();

  equal(view.$().text(), "bam1");
  equal(view.$('li').children().length, 0, "No markers");
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

test("should expose a view keyword", function() {
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

  appendView();

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
    template: EmberHandlebars.compile('{{#each view.kiddos}}{{this}}{{/each}}'),
    kiddos: A(['<b>Max</b>', '<b>James</b>'])
  });

  appendView();
  equal(view.$('b').length, 0, "does not create an element");
  equal(view.$().text(), '<b>Max</b><b>James</b>', "inserts entities, not elements");

  run(function() { set(view, 'kiddos', A(['<i>Max</i>','<i>James</i>'])); });
  equal(view.$().text(), '<i>Max</i><i>James</i>', "updates with entities, not elements");
  equal(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in primitive value contexts when using triple mustaches", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#each view.kiddos}}{{{this}}}{{/each}}'),
    kiddos: A(['<b>Max</b>', '<b>James</b>'])
  });

  appendView();

  equal(view.$('b').length, 2, "creates an element");

  run(function() { set(view, 'kiddos', A(['<i>Max</i>','<i>James</i>'])); });
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
    value: 'one',
    valueTwo: 'two',

    content: EmberObject.create({})
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('{{log value}}{{#with content}}{{log ../valueTwo}}{{/with}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
  equal(logCalls[1], 'two', "should call log with valueTwo");
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
    template: EmberHandlebars.compile('{{#each view.items}}{{log this}}{{/each}}'),
    items: A(['one', 'two'])
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with item one");
  equal(logCalls[1], 'two', "should call log with item two");
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

test("properties within an if statement should not fail on re-render", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  appendView();

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
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

test("views within an if statement should be sane on re-render", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#if view.display}}{{view Ember.TextField}}{{/if}}'),
    display: false
  });

  appendView();

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

test("the {{this}} helper should not fail on removal", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#if view.show}}{{#each view.list}}{{this}}{{/each}}{{/if}}'),
    show: true,
    list: A(['a', 'b', 'c'])
  });

  appendView();

  equal(view.$().text(), 'abc', "should start property - precond");

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
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

test("bindings can be 'this', in which case they *are* the current context", function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: "SFMoMA",
      price: 20,
      museumView: EmberView.extend({
        template: EmberHandlebars.compile('Name: {{view.museum.name}} Price: ${{view.museum.price}}')
      })
    }),


    template: EmberHandlebars.compile('{{#if view.museumOpen}} {{#with view.museumDetails}}{{view museumView museumBinding="this"}} {{/with}}{{/if}}')
  });

  appendView();

  equal(trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

// https://github.com/emberjs/ember.js/issues/120

test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create();
  });

  App.test = EmberObject.create({ href: 'test' });
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
    template: EmberHandlebars.compile('{{#view view.linkView hrefBinding="App.test.href"}} Test {{/view}}')
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

  run(function() {
    lookup.App.destroy();
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
    options.hash.bindingTestBinding = Binding.oneWay('context.' + id);
    options.hash.stringTestBinding = id;
    return EmberHandlebars.ViewHelper.helper(this, viewClass, options);
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

test("should teardown observers from bind-attr on rerender", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('<span {{bind-attr class="view.foo" name="view.foo"}}>wat</span>'),
    foo: 'bar'
  });

  appendView();

  equal(observersFor(view, 'foo').length, 2);

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 2);
});
