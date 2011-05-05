// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/**
  This module specifically tests integration with Handlebars and SproutCore-specific
  Handlebars extensions.

  If you add additional template support to SC.View, you should create a new
  file in which to test.
*/
module("SC.View - handlebars integration");

test("template view should call the function of the associated template", function() {
  var view = SC.View.create({
    templateName: 'test_template',
    templates: SC.Object.create({
      test_template: SC.Handlebars.compile("<h1 id='twas-called'>template was called</h1>")
    })
  });

  view.createElement();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("template view should call the function of the associated template with itself as the context", function() {
  var view = SC.View.create({
    templateName: 'test_template',

    _personName: "Tom DAAAALE",
    _i: 0,

    personName: function() {
      this._i++;
      return this._personName + this._i;
    }.property().cacheable(),

    templates: SC.Object.create({
      test_template: SC.Handlebars.compile("<h1 id='twas-called'>template was called for {{personName}}. Yea {{personName}}</h1>")
    })
  });

  view.createElement();

  equals("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#with person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

    person: {
      firstName: 'Señor',
      lastName: 'CFC',
      pet: {
        name: 'Fido'
      }
    }
  });

  view.createElement();

  equals(view.$().text(), "Señor CFC (and Fido)", "prints out values from a hash");
});

TemplateTests = {};

test("child views can be inserted using the {{view}} Handlebars helper", function() {
  var templates = SC.Object.create({
    nester: SC.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"),
    nested: SC.Handlebars.compile("<div id='child-view'>Goodbye {{cruel}} {{world}}</div>")
  });

  TemplateTests.LabelView = SC.View.extend({
    tagName: "aside",
    cruel: "cruel",
    world: "world?",
    templateName: 'nested',
    templates: templates
  });

  var view = SC.View.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  view.createElement();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("#child-view:contains('Goodbye cruel world?')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\?/), "parent view should appear before the child view");
});

test("should accept relative paths to views", function() {
  var view = SC.View.create({
    template: SC.Handlebars.compile('Hey look, at {{view ".myCool.view"}}'),

    myCool: SC.Object.create({
      view: SC.View.extend({
        template: SC.Handlebars.compile("my cool view")
      })
    })
  });

  view.createElement();

  equals(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  var templates = SC.Object.create({
    nester: SC.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"),
    nested: SC.Handlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view \"TemplateTests.OtherView\"}}{{/with}} {{world}}</div>"),
    other: SC.Handlebars.compile("cruel")
  });

  TemplateTests.LabelView = SC.View.extend({
    tagName: "aside",
    cruel: "cruel",
    world: "world?",
    content: SC.Object.create({ blah: "wot" }),
    templateName: 'nested',
    templates: templates
  });

  TemplateTests.OtherView = SC.View.extend({
    templates: templates,
    templateName: 'other'
  });

  var view = SC.View.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  view.createElement();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("aside:contains('Goodbye wot cruel world?')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\?/), "parent view should appear before the child view");
});

test("SC.View should update when a property changes and the bind helper is used", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{bind "wham"}}{{/with}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  view.createElement();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() { view.get('content').set('wham', 'bazam'); });
  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("SC.View should update when a property changes and no bind helper is used", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  view.createElement();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() { view.get('content').set('wham', 'bazam'); });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("SC.View should update when the property used with the #with helper changes", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  view.createElement();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() {
    view.set('content', SC.Object.create({
      wham: 'bazam'
    }));
  });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("should not update when a property is removed from the view", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('<h1 id="first">{{#bind "content"}}{{#bind "foo"}}{{bind "baz"}}{{/bind}}{{/bind}}</h1>')
  });
  var removeCalled = 0;

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      foo: SC.Object.create({
        baz: "unicorns",

        removeObserver: function(property, func) {
          sc_super();
          removeCalled++;
        }
      })
    })
  });

  view.createElement();

  equals(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = view.get('content');

  SC.run(function() {
    view.set('content', SC.Object.create({
      foo: SC.Object.create({
        baz: "ninjas"
      })
    }));
  });

  equals(view.$('#first').text(), 'ninjas', "updates to new content value");

  SC.run(function() {
    oldContent.setPath('foo.baz', 'rockstars');
  });

  SC.run(function() {
    oldContent.setPath('foo.baz', 'ewoks');
  });

  equals(removeCalled, 1, "does not try to remove observer more than once");
  equals(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>Today\'s Menu</h1>{{#bind "coffee"}}<h2>{{color}} coffee</h2><span id="price">{{bind "price"}}</span>{{/bind}}')
  });

  var view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    coffee: SC.Object.create({
      color: 'brown',
      price: '$4'
    })
  });

  view.createElement();

  equals(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equals(view.$('#price').text(), '$4', "precond - renders price correctly");

  view.set('coffee', SC.Object.create({
    color: "mauve",
    price: "$4.50"
  }));

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$4.50", "should update price field when content changes");

  view.set('coffee', SC.Object.create({
    color: "mauve",
    price: "$5.50"
  }));

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$5.50", "should update price field when content changes");

  view.setPath('coffee.price', "$5");

  equals(view.$('#price').text(), "$5", "should update price field when price property is changed");
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    coffee: SC.Object.create({
      price: '$4'
    })
  });

  view.createElement();

  equals(view.$('h1').text(), "$4", "precond - renders price");

  view.setPath('coffee.price', "$5");

  equals(view.$('h1').text(), "$5", "updates when property changes");

  view.set('coffee', { price: "$6" });
  equals(view.$('h1').text(), "$6", "updates when parent property changes");
});

// test("Template updates correctly if a path is passed to the bind helper and the context object is an SC.ObjectController", function() {
//   var templates;

//   templates = SC.Object.create({
//     menu: SC.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
//   });

//   var controller = SC.ObjectController.create();
//   var realObject = SC.Object.create({
//     price: "$4"
//   });

//   controller.set('content', realObject);

//   var view = SC.View.create({
//     templateName: 'menu',
//     templates: templates,

//     coffee: controller
//   });

//   view.createElement();

//   equals(view.$('h1').text(), "$4", "precond - renders price");

//   realObject.set('price', "$5");

//   equals(view.$('h1').text(), "$5", "updates when property is set on real object");

//   SC.run(function() {
//     controller.set('price', "$6" );
//   });

//   equals(view.$('h1').text(), "$6", "updates when property is set on object controller");
// });

test("should update the block when object passed to #if helper changes", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{/if}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  view.createElement();

  equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "renders block if a string");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      view.set('inception', val);
    });

    equals(view.$('h1').text(), '', "hides block when conditional is '%@'".fmt(val));

    SC.run(function() {
      view.set('inception', true);
    });

    equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("should update the block when object passed to #unless helper changes", function() {
  var templates;

  templates = SC.Object.create({
    advice: SC.Handlebars.compile('<h1>{{#unless onDrugs}}{{doWellInSchool}}{{/unless}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'advice',
    templates: templates,

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  view.createElement();

  equals(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      view.set('onDrugs', val);
    });

    equals(view.$('h1').text(), 'Eat your vegetables', "renders block when conditional is '%@'; %@".fmt(val, SC.typeOf(val)));

    SC.run(function() {
      view.set('onDrugs', true);
    });

    equals(view.$('h1').text(), "", "precond - hides block when conditional is true");
  });
});

test("should update the block when object passed to #if helper changes and an inverse is supplied", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{else}}{{SAD}}{{/if}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  view.createElement();

  equals(view.$('h1').text(), "BOONG?", "renders alternate if false");

  SC.run(function() { view.set('inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      view.set('inception', val);
    });

    equals(view.$('h1').text(), 'BOONG?', "renders alternate if %@".fmt(val));

    SC.run(function() {
      view.set('inception', true);
    });

    equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

// test("Should insert a localized string if the {{loc}} helper is used", function() {
//   SC.stringsFor('en', {
//     'Brazil': 'Brasilia'
//   });

//   templates = SC.Object.create({
//     'loc': SC.Handlebars.compile('<h1>Country: {{loc "Brazil"}}')
//   });

//   var view = SC.View.create({
//     templateName: 'loc',
//     templates: templates,

//     country: 'Brazil'
//   });

//   view.createElement();
//   equals(view.$('h1').text(), 'Country: Brasilia', "returns localized value");
// });

test("Template views return a no-op function if their template cannot be found", function() {
  var view = SC.View.create({
    templateName: 'cantBeFound'
  });

  raises(function() {
    var template = view.get('template');

    ok(SC.typeOf(template) === 'function', 'template should be a function');
    equals(template(), '', 'should return an empty string');
  });
});

test("Template views add an elementId to child views created using the view helper", function() {
  var templates = SC.Object.create({
    parent: SC.Handlebars.compile('<aside>{{view "TemplateTests.ChildView"}}</aside>'),
    child: SC.Handlebars.compile("I can't believe it's not butter.")
  });

  TemplateTests.ChildView = SC.View.extend({
    templates: templates,
    templateName: 'child'
  });

  var view = SC.View.create({
    templates: templates,
    templateName: 'parent'
  });

  view.createElement();
  var childView = view.getPath('childViews.firstObject');
  equals(view.$().children().first().children().first().attr('id'), childView.get('elementId'));
});

test("Template views set the template of their children to a passed block", function() {
  var templates = SC.Object.create({
    parent: SC.Handlebars.compile('<h1>{{#view "TemplateTests.NoTemplateView"}}<span>It worked!</span>{{/view}}')
  });

  TemplateTests.NoTemplateView = SC.View.extend();

  var view = SC.View.create({
    templates: templates,
    templateName: 'parent'
  });

  view.createElement();
  ok(view.$().html().match(/<h1>.*<span>.*<\/span>.*<\/h1>/), "renders the passed template inside the parent template");
});

test("should pass hash arguments to the view object", function() {
  TemplateTests.bindTestObject = SC.Object.create({
    bar: 'bat'
  });

  TemplateTests.HashArgTemplateView = SC.View.extend({
  });

  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#view TemplateTests.HashArgTemplateView fooBinding="TemplateTests.bindTestObject.bar"}}{{foo}}{{/view}}')
  });

  view.createElement();

  SC.run();

  equals(view.$().text(), "bat", "prints initial bound value");

  SC.run(function() { TemplateTests.bindTestObject.set('bar', 'brains'); });

  equals(view.$().text(), "brains", "prints updated bound value");
});

test("Child views created using the view helper should have their parent view set properly", function() {
  TemplateTests = {};

  var template = '{{#view "SC.View"}}{{#view "SC.View"}}{{view "SC.View"}}{{/view}}{{/view}}';

  var view = SC.View.create({
    template: SC.Handlebars.compile(template)
  });

  view.createElement();

  var childView = view.childViews[0].childViews[0];
  equals(childView, childView.childViews[0].parentView, 'parent view is correct');
});

test("Child views created using the view helper should have their IDs registered for events", function() {
  TemplateTests = {};

  var template = '{{view "SC.View"}}{{view "SC.View" id="templateViewTest"}}';

  var view = SC.View.create({
    template: SC.Handlebars.compile(template)
  });

  view.createElement();

  var childView = view.childViews[0];
  var id = childView.$()[0].id;
  equals(SC.View.views[id], childView, 'childView without passed ID is registered with SC.View.views so that it can properly receive events from RootResponder');

  childView = view.childViews[1];
  id = childView.$()[0].id;
  equals(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equals(SC.View.views[id], childView, 'childView with passed ID is registered with SC.View.views so that it can properly receive events from RootResponder');
});

// test("Collection views that specify an example view class have their children be of that class", function() {
//   TemplateTests.ExampleViewCollection = SC.TemplateCollectionView.create({
//     itemView: SC.View.extend({
//       isCustom: YES
//     }),

//     content: ['foo']
//   });

//   var parentView = SC.View.create({
//     template: SC.Handlebars.compile('{{#collection "TemplateTests.ExampleViewCollection"}}OHAI{{/collection}}')
//   });

//   parentView.createElement();

//   ok(parentView.childViews[0].childViews[0].isCustom, "uses the example view class");
// });

test("should update boundIf blocks if the conditional changes", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#boundIf "content.myApp.isEnabled"}}{{content.wham}}{{/boundIf}}</h1>')
  });

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am",
      myApp: SC.Object.create({
        isEnabled: YES
      })
    })
  });

  view.createElement();

  equals(view.$('#first').text(), "bam", "renders block when condition is true");

  SC.run(function() { view.get('content').setPath('myApp.isEnabled', NO); });

  equals(view.$('#first').text(), "", "re-renders without block when condition is false");

  SC.run(function() { view.get('content').setPath('myApp.isEnabled', YES); });

  equals(view.$('#first').text(), "bam", "re-renders block when condition changes to true");
});

test("{{view}} id attribute should set id on layer", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('{{#view "TemplateTests.IdView" id="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = SC.View;

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates
  });

  view.createElement();

  equals(view.$('#bar').length, 1, "adds id attribute to layer");
  equals(view.$('#bar').text(), 'baz', "emits content");
});

test("{{view}} class attribute should set class on layer", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('{{#view "TemplateTests.IdView" class="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = SC.View;

  var view = SC.View.create({
    templateName: 'foo',
    templates: templates
  });

  view.createElement();

  equals(view.$('.bar').length, 1, "adds class attribute to layer");
  equals(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should be able to point to a local view", function() {
  var view = SC.View.create({
    template: SC.Handlebars.compile("{{view common}}"),

    common: SC.View.extend({
      template: SC.Handlebars.compile("common")
    })
  });

  view.createElement();

  equals(view.$().text(), "common", "tries to look up view name locally");
});

test("should be able to bind view class names to properties", function() {
  var templates = SC.Object.create({
    template: SC.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="isDone"}}foo{{/view}}')
  });

  TemplateTests.classBindingView = SC.View.extend({
    isDone: YES
  });

  var view = SC.View.create({
    templateName: 'template',
    templates: templates
  });

  view.createElement();

  equals(view.$('.is-done').length, 1, "dasherizes property and sets class name");

  SC.run(function() {
    view.childViews[0].set('isDone', NO);
  });

  equals(view.$('.is-done').length, 0, "removes class name if bound property is set to false");
});

test("should be able to bind element attributes using {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<img {{bindAttr src="content.url" alt="content.title"}}>');

  var view = SC.View.create({
    template: template,
    content: SC.Object.create({
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  view.createElement();

  equals(view.$('img').attr('src'), "http://www.sproutcore.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  SC.run(function() {
    view.setPath('content.title', "El logo de Esproutcore");
  });

  equals(view.$('img').attr('alt'), "El logo de Esproutcore", "updates alt attribute when content's title attribute changes");

  SC.run(function() {
    view.set('content', SC.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equals(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  SC.run(function() {
    view.set('content', {
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equals(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  SC.run(function() {
    view.set('content', {
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: function() {
        return "Nanananana SproutCore!";
      }
    });
  });

  equals(view.$('img').attr('alt'), "Nanananana SproutCore!", "updates alt attribute when title property is computed");
});

test("should be able to bind element attributes using {{bindAttr}} inside a block", function() {
  var template = SC.Handlebars.compile('{{#with content}}<img {{bindAttr src="url" alt="title"}}>{{/with}}');

  var view = SC.View.create({
    template: template,
    content: SC.Object.create({
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  view.createElement();

  equals(view.$('img').attr('src'), "http://www.sproutcore.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  SC.run(function() {
    view.setPath('content.title', "El logo de Esproutcore");
  });

  equals(view.$('img').attr('alt'), "El logo de Esproutcore", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<img {{bindAttr class="foo"}}>');

  var view = SC.View.create({
    template: template,
    foo: 'bar'
  });

  view.createElement();

  equals(view.$('img').attr('class'), 'bar', "renders class");

  SC.run(function() {
    view.set('foo', 'baz');
  });

  equals(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind boolean element attributes using {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<input type="check" {{bindAttr disabled="content.isDisabled" checked="content.isChecked"}} />');
  var content = SC.Object.create({
    isDisabled: false,
    isChecked: true
  });

  var view = SC.View.create({
    template: template,
    content: content
  });

  view.createElement();

  ok(!view.$('input').attr('disabled'), 'attribute does not exist upon initial render');
  ok(view.$('input').attr('checked'), 'attribute is present upon initial render');

  content.set('isDisabled', true);
  content.set('isChecked', false);

  ok(view.$('input').attr('disabled'), 'attribute exists after update');
  ok(!view.$('input').attr('checked'), 'attribute is not present after update');
});

test("should be able to add multiple classes using {{bindAttr class}}", function() {
  var template = SC.Handlebars.compile('<div {{bindAttr class="content.isAwesomeSauce content.isAlsoCool"}}></div>');
  var content = SC.Object.create({
    isAwesomeSauce: true,
    isAlsoCool: true
  });

  var view = SC.View.create({
    template: template,
    content: content
  });

  view.createElement();

  ok(view.$('div').hasClass('is-awesome-sauce'), "dasherizes first property and sets classname");
  ok(view.$('div').hasClass('is-also-cool'), "dasherizes second property and sets classname");

  content.set('isAwesomeSauce', false);

  ok(!view.$('div').hasClass('is-awesome-sauce'), "removes dasherized class when property is set to false");
});

