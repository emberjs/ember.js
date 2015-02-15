/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup
import run from "ember-metal/run_loop";
import Namespace from "ember-runtime/system/namespace";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberObject from "ember-runtime/system/object";
import { A } from "ember-runtime/system/native_array";
import { computed } from "ember-metal/computed";
import { observersFor } from "ember-metal/observer";
import { Registry } from "ember-runtime/system/container";
import { set } from "ember-metal/property_set";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

import helpers from "ember-htmlbars/helpers";
import compile from "ember-template-compiler/system/compile";
var view;

var originalLookup = Ember.lookup;
var TemplateTests, registry, container, lookup;

/**
  This module specifically tests integration with Handlebars and Ember-specific
  Handlebars extensions.

  If you add additional template support to View, you should create a new
  file in which to test.
*/
QUnit.module("ember-htmlbars: {{bind-attr}}", {
  setup: function() {
    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
    registry.register('view:default', _MetamorphView);
    registry.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;
  }
});

QUnit.test("should be able to bind element attributes using {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr src=view.content.url alt=view.content.title}}>');

  view = EmberView.create({
    template: template,
    content: EmberObject.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  runAppend(view);

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

QUnit.test("should be able to bind to view attributes with {{bind-attr}}", function() {
  view = EmberView.create({
    value: 'Test',
    template: compile('<img src="test.jpg" {{bind-attr alt=view.value}}>')
  });

  runAppend(view);

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  run(function() {
    view.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

QUnit.test("should be able to bind to globals with {{bind-attr}} (DEPRECATED)", function() {
  TemplateTests.set('value', 'Test');

  view = EmberView.create({
    template: compile('<img src="test.jpg" {{bind-attr alt=TemplateTests.value}}>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /Global lookup of TemplateTests.value from a Handlebars template is deprecated/);

  equal(view.$('img').attr('alt'), "Test", "renders initial value");
});

QUnit.test("should not allow XSS injection via {{bind-attr}}", function() {
  view = EmberView.create({
    template: compile('<img src="test.jpg" {{bind-attr alt=view.content.value}}>'),
    content: {
      value: 'Trololol" onmouseover="alert(\'HAX!\');'
    }
  });

  runAppend(view);

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('alt'), 'Trololol" onmouseover="alert(\'HAX!\');');
});

QUnit.test("should be able to bind use {{bind-attr}} more than once on an element", function() {
  var template = compile('<img {{bind-attr src=view.content.url}} {{bind-attr alt=view.content.title}}>');

  view = EmberView.create({
    template: template,
    content: EmberObject.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  runAppend(view);

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

QUnit.test("{{bindAttr}} is aliased to {{bind-attr}}", function() {
  expect(4);

  var originalBindAttr = helpers['bind-attr'];

  try {
    helpers['bind-attr'] = {
      helperFunction: function() {
        equal(arguments[0], 'foo', 'First arg match');
        equal(arguments[1], 'bar', 'Second arg match');

        return 'result';
      }
    };

    expectDeprecation(function() {
      var result;

      result = helpers.bindAttr.helperFunction('foo', 'bar');
      equal(result, 'result', 'Result match');
    }, "The 'bindAttr' view helper is deprecated in favor of 'bind-attr'");
  } finally {
    helpers['bind-attr'] = originalBindAttr;
  }
});

QUnit.test("{{bindAttr}} can be used to bind attributes [DEPRECATED]", function() {
  expect(3);

  view = EmberView.create({
    value: 'Test',
    template: compile('<img src="test.jpg" {{bindAttr alt=view.value}}>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /The 'bindAttr' view helper is deprecated in favor of 'bind-attr'/);

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  run(function() {
    view.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

QUnit.test("should be able to bind element attributes using {{bind-attr}} inside a block", function() {
  var template = compile('{{#with view.content as image}}<img {{bind-attr src=image.url alt=image.title}}>{{/with}}');

  view = EmberView.create({
    template: template,
    content: EmberObject.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  runAppend(view);

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");
});

QUnit.test("should be able to bind class attribute with {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr class="view.foo"}}>');

  view = EmberView.create({
    template: template,
    foo: 'bar'
  });

  runAppend(view);

  equal(view.element.firstChild.className, 'bar', 'renders class');

  run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.element.firstChild.className, 'baz', 'updates rendered class');
});

QUnit.test("should be able to bind unquoted class attribute with {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr class=view.foo}}>');

  view = EmberView.create({
    template: template,
    foo: 'bar'
  });

  runAppend(view);

  equal(view.$('img').attr('class'), 'bar', "renders class");

  run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

QUnit.test("should be able to bind class attribute via a truthy property with {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr class="view.isNumber:is-truthy"}}>');

  view = EmberView.create({
    template: template,
    isNumber: 5
  });

  runAppend(view);

  equal(view.element.firstChild.className, 'is-truthy', 'renders class');

  run(function() {
    set(view, 'isNumber', 0);
  });

  ok(view.element.firstChild.className !== 'is-truthy', 'removes class');
});

QUnit.test("should be able to bind class to view attribute with {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr class="view.foo"}}>');

  view = EmberView.create({
    template: template,
    foo: 'bar'
  });

  runAppend(view);

  equal(view.$('img').attr('class'), 'bar', "renders class");

  run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

QUnit.test("should not allow XSS injection via {{bind-attr}} with class", function() {
  view = EmberView.create({
    template: compile('<img {{bind-attr class="view.foo"}}>'),
    foo: '" onmouseover="alert(\'I am in your classes hacking your app\');'
  });

  try {
    runAppend(view);
  } catch (e) {
  }

  equal(view.$('img').attr('onmouseover'), undefined);
});

QUnit.test("should be able to bind class attribute using ternary operator in {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr class="view.content.isDisabled:disabled:enabled"}} />');
  var content = EmberObject.create({
    isDisabled: true
  });

  view = EmberView.create({
    template: template,
    content: content
  });

  runAppend(view);

  ok(view.$('img').hasClass('disabled'), 'disabled class is rendered');
  ok(!view.$('img').hasClass('enabled'), 'enabled class is not rendered');

  run(function() {
    set(content, 'isDisabled', false);
  });

  ok(!view.$('img').hasClass('disabled'), 'disabled class is not rendered');
  ok(view.$('img').hasClass('enabled'), 'enabled class is rendered');
});

QUnit.test("should be able to add multiple classes using {{bind-attr class}}", function() {
  var template = compile('<div {{bind-attr class="view.content.isAwesomeSauce view.content.isAlsoCool view.content.isAmazing:amazing :is-super-duper view.content.isEnabled:enabled:disabled"}}></div>');
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

  runAppend(view);

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

QUnit.test("should be able to bind classes to globals with {{bind-attr class}} (DEPRECATED)", function() {
  TemplateTests.set('isOpen', true);

  view = EmberView.create({
    template: compile('<img src="test.jpg" {{bind-attr class="TemplateTests.isOpen"}}>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /Global lookup of TemplateTests.isOpen from a Handlebars template is deprecated/);

  ok(view.$('img').hasClass('is-open'), "sets classname to the dasherized value of the global property");
});

QUnit.test("should be able to bind-attr to 'this' in an {{#each}} block [DEPRECATED]", function() {
  expectDeprecation('Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead.');

  view = EmberView.create({
    template: compile('{{#each view.images}}<img {{bind-attr src=this}}>{{/each}}'),
    images: A(['one.png', 'two.jpg', 'three.gif'])
  });

  runAppend(view);

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));
});

QUnit.test("should be able to bind classes to 'this' in an {{#each}} block with {{bind-attr class}} [DEPRECATED]", function() {
  expectDeprecation('Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead.');

  view = EmberView.create({
    template: compile('{{#each view.items}}<li {{bind-attr class="this"}}>Item</li>{{/each}}'),
    items: A(['a', 'b', 'c'])
  });

  runAppend(view);

  ok(view.$('li').eq(0).hasClass('a'), "sets classname to the value of the first item");
  ok(view.$('li').eq(1).hasClass('b'), "sets classname to the value of the second item");
  ok(view.$('li').eq(2).hasClass('c'), "sets classname to the value of the third item");
});

QUnit.test("should be able to bind-attr to var in {{#each var in list}} block", function() {
  view = EmberView.create({
    template: compile('{{#each image in view.images}}<img {{bind-attr src=image}}>{{/each}}'),
    images: A(['one.png', 'two.jpg', 'three.gif'])
  });

  runAppend(view);

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

QUnit.test("should teardown observers from bind-attr on rerender", function() {
  view = EmberView.create({
    template: compile('<span {{bind-attr class="view.foo" name=view.foo}}>wat</span>'),
    foo: 'bar'
  });

  runAppend(view);

  equal(observersFor(view, 'foo').length, 1);

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 1);
});

QUnit.test("should keep class in the order it appears in", function() {
  view = EmberView.create({
    template: compile('<span {{bind-attr class=":foo :baz"}}></span>')
  });

  runAppend(view);

  equal(view.element.firstChild.className, 'foo baz', 'classes are in expected order');
});

QUnit.test('should allow either quoted or unquoted values', function() {
  view = EmberView.create({
    value: 'Test',
    source: 'test.jpg',
    template: compile('<img {{bind-attr alt="view.value" src=view.source}}>')
  });

  runAppend(view);

  equal(view.$('img').attr('alt'), "Test", "renders initial value");
  equal(view.$('img').attr('src'), "test.jpg", "renders initial value");

  run(function() {
    view.set('value', 'Updated');
    view.set('source', 'test2.jpg');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
  equal(view.$('img').attr('src'), "test2.jpg", "updates value");
});

QUnit.test("property before didInsertElement", function() {
  var matchingElement;
  view = EmberView.create({
    name: 'bob',
    template: compile('<div {{bind-attr alt=view.name}}></div>'),
    didInsertElement: function() {
      matchingElement = this.$('div[alt=bob]');
    }
  });
  runAppend(view);
  equal(matchingElement.length, 1, 'element is in the DOM when didInsertElement');
});

QUnit.test("asserts for <div class='foo' {{bind-attr class='bar'}}></div>", function() {
  var template = compile('<div class="foo" {{bind-attr class=view.foo}}></div>');

  view = EmberView.create({
    template: template,
    foo: 'bar'
  });

  expectAssertion(function() {
    runAppend(view);
  }, /You cannot set `class` manually and via `{{bind-attr}}` helper on the same element/);
});

QUnit.test("asserts for <div data-bar='foo' {{bind-attr data-bar='blah'}}></div>", function() {
  var template = compile('<div data-bar="foo" {{bind-attr data-bar=view.blah}}></div>');

  view = EmberView.create({
    template: template,
    blah: 'bar'
  });

  expectAssertion(function() {
    runAppend(view);
  }, /You cannot set `data-bar` manually and via `{{bind-attr}}` helper on the same element/);
});

QUnit.test("src attribute bound to undefined is not present", function() {
  var template = compile("<img {{bind-attr src=view.undefinedValue}}>");

  view = EmberView.create({
    template: template,
    undefinedValue: undefined
  });

  runAppend(view);

  ok(!view.element.hasAttribute('src'), "src attribute not present");
});

QUnit.test("src attribute bound to null is not present", function() {
  var template = compile("<img {{bind-attr src=view.nullValue}}>");

  view = EmberView.create({
    template: template,
    nullValue: null
  });

  runAppend(view);

  ok(!view.element.hasAttribute('src'), "src attribute not present");
});
