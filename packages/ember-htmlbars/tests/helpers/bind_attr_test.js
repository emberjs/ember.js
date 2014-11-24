/*jshint newcap:false*/
import Ember from "ember-metal/core"; // Ember.lookup
import run from "ember-metal/run_loop";
import Namespace from "ember-runtime/system/namespace";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberHandlebars from "ember-handlebars";
import EmberObject from "ember-runtime/system/object";
import { A } from "ember-runtime/system/native_array";
import { computed } from "ember-metal/computed";
import { observersFor } from "ember-metal/observer";
import Container from "ember-runtime/system/container";
import { set } from "ember-metal/property_set";

import {
  default as htmlbarsHelpers
} from "ember-htmlbars/helpers";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile, helpers;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
  helpers = htmlbarsHelpers;
} else {
  compile = EmberHandlebars.compile;
  helpers = EmberHandlebars.helpers;
}

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
QUnit.module("ember-htmlbars: {{bind-attr}}", {
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

test("should be able to bind element attributes using {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr src=view.content.url alt=view.content.title}}>');

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
    template: compile('<img src="test.jpg" {{bind-attr alt=view.value}}>')
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
    template: compile('<img src="test.jpg" {{bind-attr alt=TemplateTests.value}}>')
  });

  expectDeprecation(function(){
    appendView();
  }, /Global lookup of TemplateTests.value from a Handlebars template is deprecated/);

  equal(view.$('img').attr('alt'), "Test", "renders initial value");
});

test("should not allow XSS injection via {{bind-attr}}", function() {
  view = EmberView.create({
    template: compile('<img src="test.jpg" {{bind-attr alt=view.content.value}}>'),
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
  var template = compile('<img {{bind-attr src=view.content.url}} {{bind-attr alt=view.content.title}}>');

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
  expect(4);

  var originalBindAttr = helpers['bind-attr'];

  try {
    helpers['bind-attr'] = function() {
      equal(arguments[0], 'foo', 'First arg match');
      equal(arguments[1], 'bar', 'Second arg match');

      return 'result';
    };

    expectDeprecation(function() {
      var result;

      if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
        result = helpers.bindAttr.helperFunction('foo', 'bar');
      } else {
        result = helpers.bindAttr('foo', 'bar');
      }
      equal(result, 'result', 'Result match');
    }, "The 'bindAttr' view helper is deprecated in favor of 'bind-attr'");
  } finally {
    helpers['bind-attr'] = originalBindAttr;
  }
});

test("should be able to bind element attributes using {{bind-attr}} inside a block", function() {
  var template = compile('{{#with view.content as image}}<img {{bind-attr src=image.url alt=image.title}}>{{/with}}');

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
  var template = compile('<img {{bind-attr class="view.foo"}}>');

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
  var template = compile('<img {{bind-attr class="view.isNumber:is-truthy"}}>');

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
  var template = compile('<img {{bind-attr class="view.foo"}}>');

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
    template: compile('<img {{bind-attr class="view.foo"}}>'),
    foo: '" onmouseover="alert(\'I am in your classes hacking your app\');'
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('class'), '" onmouseover="alert(\'I am in your classes hacking your app\');');
});

test("should be able to bind class attribute using ternary operator in {{bind-attr}}", function() {
  var template = compile('<img {{bind-attr class="view.content.isDisabled:disabled:enabled"}} />');
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
    template: compile('<img src="test.jpg" {{bind-attr class="TemplateTests.isOpen"}}>')
  });

  expectDeprecation(function(){
    appendView();
  }, /Global lookup of TemplateTests.isOpen from a Handlebars template is deprecated/);

  ok(view.$('img').hasClass('is-open'), "sets classname to the dasherized value of the global property");
});

test("should be able to bind-attr to 'this' in an {{#each}} block [DEPRECATED]", function() {
  expectDeprecation('Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  view = EmberView.create({
    template: compile('{{#each view.images}}<img {{bind-attr src=this}}>{{/each}}'),
    images: A(['one.png', 'two.jpg', 'three.gif'])
  });

  appendView();

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));
});

test("should be able to bind classes to 'this' in an {{#each}} block with {{bind-attr class}} [DEPRECATED]", function() {
  expectDeprecation('Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  view = EmberView.create({
    template: compile('{{#each view.items}}<li {{bind-attr class="this"}}>Item</li>{{/each}}'),
    items: A(['a', 'b', 'c'])
  });

  appendView();

  ok(view.$('li').eq(0).hasClass('a'), "sets classname to the value of the first item");
  ok(view.$('li').eq(1).hasClass('b'), "sets classname to the value of the second item");
  ok(view.$('li').eq(2).hasClass('c'), "sets classname to the value of the third item");
});

test("should be able to bind-attr to var in {{#each var in list}} block", function() {
  view = EmberView.create({
    template: compile('{{#each image in view.images}}<img {{bind-attr src=image}}>{{/each}}'),
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

test("should teardown observers from bind-attr on rerender", function() {
  view = EmberView.create({
    template: compile('<span {{bind-attr class="view.foo" name=view.foo}}>wat</span>'),
    foo: 'bar'
  });

  appendView();

  equal(observersFor(view, 'foo').length, 1);

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 1);
});

test('should allow either quoted or unquoted values', function() {
  view = EmberView.create({
    value: 'Test',
    source: 'test.jpg',
    template: compile('<img {{bind-attr alt="view.value" src=view.source}}>')
  });

  appendView();

  equal(view.$('img').attr('alt'), "Test", "renders initial value");
  equal(view.$('img').attr('src'), "test.jpg", "renders initial value");

  run(function() {
    view.set('value', 'Updated');
    view.set('source', 'test2.jpg');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
  equal(view.$('img').attr('src'), "test2.jpg", "updates value");
});
