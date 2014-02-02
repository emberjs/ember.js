// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TemplateTests module */

// Included to test bindAttr problem where setting an attr when it
// has the same value is overkill and sometimes causes the browser
// to misbehave, like in SC.TextField where listening to change
// events caused the cursor to go to the end of the input
(function() {

  jQuery.fn.caretPosition = function() {
      var ctrl = this[0];

      var CaretPos = 0;
      // IE Support
      if (document.selection) {

          ctrl.focus();
          var Sel = document.selection.createRange ();

          Sel.moveStart ('character', -ctrl.value.length);

          CaretPos = Sel.text.length;
      }
      // Firefox support
      else if (ctrl.selectionStart || ctrl.selectionStart == '0') {
          CaretPos = ctrl.selectionStart;
      }

      return (CaretPos);
  };


  jQuery.fn.setCaretPosition = function(pos) {
      var ctrl = this[0];

      if(ctrl.setSelectionRange) {
          ctrl.focus();
          ctrl.setSelectionRange(pos,pos);
      } else if (ctrl.createTextRange) {
          var range = ctrl.createTextRange();
          range.collapse(true);
          range.moveEnd('character', pos);
          range.moveStart('character', pos);
          range.select();
      }
  }

})();

/**
  This module specifically tests integration with Handlebars and SproutCore-specific
  Handlebars extensions.

  If you add additional template support to SC.TemplateView, you should create a new
  file in which to test.
*/
module("SC.TemplateView - handlebars integration");

TemplateTests = {};

test("template view should call the function of the associated template", function() {
  var view = SC.TemplateView.create({
    templateName: 'test_template',
    templates: SC.Object.create({
      test_template: SC.Handlebars.compile("<h1 id='twas-called'>template was called</h1>")
    })
  });

  view.createLayer();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("template view should call the function of the associated template with itself as the context", function() {
  var view = SC.TemplateView.create({
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

  view.createLayer();

  equals("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("template view should call the function of the associated template with itself as the context", function() {
  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile('<div id="not-escaped">{{{notEscaped}}}</div><div id="escaped">{{escaped}}</div>'),
    notEscaped: '<p>NOT_ESCAPED</p>',
    escaped: '<p>ESCAPED</p>'
  });

  view.createLayer();

  equals("&lt;p&gt;ESCAPED&lt;/p&gt;", view.$('#escaped span')[0].innerHTML, "the value was properly inserted escaped");
  equals("<p>NOT_ESCAPED</p>", view.$('#not-escaped span')[0].innerHTML, "the value was properly inserted unescaped");

  SC.run(function() {
    view.set('notEscaped', '<br>NOT_ESCAPED<br>');
    view.set('escaped', '<br>ESCAPED<br>');
  });

  equals("&lt;br&gt;ESCAPED&lt;br&gt;", view.$('#escaped span')[0].innerHTML, "the value was properly inserted escaped");
  equals("<br>NOT_ESCAPED<br>", view.$('#not-escaped span')[0].innerHTML, "the value was properly inserted unescaped");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile('{{#with person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

    person: {
      firstName: 'Señor',
      lastName: 'CFC',
      pet: {
        name: 'Fido'
      }
    }
  });

  view.createLayer();

  equals(view.$().text(), "Señor CFC (and Fido)", "prints out values from a hash");
});

TemplateTests = {};

test("child views can be inserted using the {{view}} Handlebars helper", function() {
  var templates = SC.Object.create({
    nester: SC.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"),
    nested: SC.Handlebars.compile("<div id='child-view'>Goodbye {{cruel}} {{world}}</div>")
  });

  TemplateTests.LabelView = SC.TemplateView.extend({
    tagName: "aside",
    cruel: "cruel",
    world: "world?",
    templateName: 'nested',
    templates: templates
  });

  var view = SC.TemplateView.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  view.createLayer();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("#child-view:contains('Goodbye cruel world?')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\?/), "parent view should appear before the child view");
});

test("should accept relative paths to views", function() {
  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile('Hey look, at {{view ".myCool.view"}}'),

    myCool: SC.Object.create({
      view: SC.TemplateView.create({
        template: SC.Handlebars.compile("my cool view")
      })
    })
  });

  view.createLayer();

  equals(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  var templates = SC.Object.create({
    nester: SC.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"),
    nested: SC.Handlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view \"TemplateTests.OtherView\"}}{{/with}} {{world}}</div>"),
    other: SC.Handlebars.compile("cruel")
  });

  TemplateTests.LabelView = SC.TemplateView.extend({
    tagName: "aside",
    cruel: "cruel",
    world: "world?",
    content: SC.Object.create({ blah: "wot" }),
    templateName: 'nested',
    templates: templates
  });

  TemplateTests.OtherView = SC.TemplateView.extend({
    templates: templates,
    templateName: 'other'
  });

  var view = SC.TemplateView.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  view.createLayer();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("aside:contains('Goodbye wot cruel world?')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\?/), "parent view should appear before the child view");
});

test("SC.TemplateView should update when a property changes and the bind helper is used", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{bind "wham"}}{{/with}}</h1>')
  });

  var view = SC.TemplateView.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  view.createLayer();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() { view.get('content').set('wham', 'bazam'); });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("SC.TemplateView should update when a property changes and no bind helper is used", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  var view = SC.TemplateView.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  view.createLayer();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() { view.get('content').set('wham', 'bazam'); });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("SC.TemplateView should update when the property used with the #with helper changes", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  var view = SC.TemplateView.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  view.createLayer();

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

  var view = SC.TemplateView.create({
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

  view.createLayer();

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

  var view = SC.TemplateView.create({
    templateName: 'menu',
    templates: templates,

    coffee: SC.Object.create({
      color: 'brown',
      price: '$4'
    })
  });

  view.createLayer();

  equals(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equals(view.$('#price').text(), '$4', "precond - renders price correctly");

  SC.run(function() {
    view.set('coffee', SC.Object.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$4.50", "should update price field when content changes");

  SC.run(function() {
    view.set('coffee', SC.Object.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$5.50", "should update price field when content changes");

  SC.run(function() {
    view.setPath('coffee.price', "$5");
  });

  equals(view.$('#price').text(), "$5", "should update price field when price property is changed");
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
  });

  var view = SC.TemplateView.create({
    templateName: 'menu',
    templates: templates,

    coffee: SC.Object.create({
      price: '$4'
    })
  });

  view.createLayer();

  equals(view.$('h1').text(), "$4", "precond - renders price");

  SC.run(function() { view.setPath('coffee.price', "$5"); });

  equals(view.$('h1').text(), "$5", "updates when property changes");

  SC.run(function() { view.set('coffee', { price: "$6" }); });
  equals(view.$('h1').text(), "$6", "updates when parent property changes");
});

test("Template updates correctly if a path is passed to the bind helper and the context object is an SC.ObjectController", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
  });

  var controller = SC.ObjectController.create();
  var realObject = SC.Object.create({
    price: "$4"
  });

  SC.run(function() { controller.set('content', realObject); });

  var view = SC.TemplateView.create({
    templateName: 'menu',
    templates: templates,

    coffee: controller
  });

  view.createLayer();

  equals(view.$('h1').text(), "$4", "precond - renders price");

  SC.run(function() { realObject.set('price', "$5"); });

  equals(view.$('h1').text(), "$5", "updates when property is set on real object");

  SC.run(function() {
    controller.set('price', "$6" );
  });

  equals(view.$('h1').text(), "$6", "updates when property is set on object controller");
});

test("should update the block when object passed to #if helper changes", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{/if}}</h1>')
  });

  var view = SC.TemplateView.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  view.createLayer();

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

  var view = SC.TemplateView.create({
    templateName: 'advice',
    templates: templates,

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  view.createLayer();

  equals(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      view.set('onDrugs', val);
    });

    equals(view.$('h1').text(), 'Eat your vegetables', "renders block when conditional is '%@'".fmt(val));

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

  var view = SC.TemplateView.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  view.createLayer();

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

test("views nested within an #if helper should be destroyed every time they are removed", function() {
  var view, didCreateLayerCalled = 0, willDestroyLayerCalled = 0;

  TemplateTests.someView = SC.TemplateView.extend({
    template: SC.Handlebars.compile("<h1>hello</h1>"),
    didCreateLayer: function() { didCreateLayerCalled++; },
    willDestroyLayer: function() { willDestroyLayerCalled++; }
  });

  view = SC.TemplateView.create({
    template: SC.Handlebars.compile('{{#if foo}}{{view TemplateTests.someView}}{{/if}}'),
    foo: true
  });

  view.createLayer();

  SC.run(function() { view.set('foo', false); });

  equals(didCreateLayerCalled, 1, 'didCreateLayer should have been called once');
  equals(willDestroyLayerCalled, 1, 'willDestroyLayer should have been called once');

  SC.run(function() { view.set('foo', true); });
  SC.run(function() { view.set('foo', false); });

  equals(didCreateLayerCalled, 2, 'didCreateLayer should have been called twice');
  equals(willDestroyLayerCalled, 2, 'willDestroyLayer should have been called twice');
});

test("Should insert a localized string if the {{loc}} helper is used", function() {
  SC.stringsFor('en', {
    'Brazil': 'Brasilia'
  });

  var templates = SC.Object.create({
    'loc': SC.Handlebars.compile('<h1>Country: {{loc "Brazil"}}')
  });

  var view = SC.TemplateView.create({
    templateName: 'loc',
    templates: templates,

    country: 'Brazil'
  });

  view.createLayer();
  equals(view.$('h1').text(), 'Country: Brasilia', "returns localized value");
});

test("Template views return a no-op function if their template cannot be found", function() {
  var view = SC.TemplateView.create({
    templateName: 'cantBeFound'
  });

  var template = view.get('template');

  ok(SC.typeOf(template) === 'function', 'template should be a function');
  equals(template(), '', 'should return an empty string');
});

test("Template views can belong to a pane and a parent view", function() {
  var templates = SC.Object.create({
    toDo: SC.Handlebars.compile('<h1>{{title}}</h1> (Created at {{createdAt}})')
  });

  var didCreateLayerWasCalled = NO;

  var pane = SC.MainPane.design({
    childViews: ['container'],

    container: SC.View.design({
      childViews: ['normalView', 'template'],

      normalView: SC.View,

      template: SC.TemplateView.design({
        templates: templates,

        templateName: 'toDo',
        title: 'Do dishes',
        createdAt: "Today",

        didCreateLayer: function() {
          didCreateLayerWasCalled = YES;
        }
      })
    })
  });

  pane = pane.create().append();

  equals(pane.$().children().length, 1, "pane has one child DOM element");
  equals(pane.$().children().children().length, 2, "container view has two child DOM elements");
  equals(pane.$().children().children().eq(1).text(), "Do dishes (Created at Today)", "renders template to the correct DOM element");
  ok(didCreateLayerWasCalled, "didCreateLayer gets called on a template view after it gets rendered");
  pane.remove();
});

test("Template views add a layerId to child views created using the view helper", function() {
  var templates = SC.Object.create({
    parent: SC.Handlebars.compile('<aside>{{view "TemplateTests.ChildView"}}</aside>'),
    child: SC.Handlebars.compile("I can't believe it's not butter.")
  });

  TemplateTests.ChildView = SC.TemplateView.extend({
    templates: templates,
    templateName: 'child'
  });

  var view = SC.TemplateView.create({
    templates: templates,
    templateName: 'parent'
  });

  view.createLayer();
  var childView = view.getPath('childViews.firstObject');
  equals(view.$().children().first().children().first().attr('id'), childView.get('layerId'));
});

test("Template views set the template of their children to a passed block", function() {
  var templates = SC.Object.create({
    parent: SC.Handlebars.compile('<h1>{{#view "TemplateTests.NoTemplateView"}}<span>It worked!</span>{{/view}}')
  });

  TemplateTests.NoTemplateView = SC.TemplateView.extend();

  var view = SC.TemplateView.create({
    templates: templates,
    templateName: 'parent'
  });

  view.createLayer();
  ok(view.$().html().match(/<h1>.*<span>.*<\/span>.*<\/h1>/), "renders the passed template inside the parent template");
});

test("should pass hash arguments to the view object", function() {
  TemplateTests.bindTestObject = SC.Object.create({
    bar: 'bat'
  });

  TemplateTests.HashArgTemplateView = SC.TemplateView.extend({
  });

  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile('{{#view TemplateTests.HashArgTemplateView fooBinding="TemplateTests.bindTestObject.bar"}}{{foo}}{{/view}}')
  });

  view.createLayer();

  SC.run();

  equals(view.$().text(), "bat", "prints initial bound value");

  SC.run(function() { TemplateTests.bindTestObject.set('bar', 'brains'); });

  equals(view.$().text(), "brains", "prints updated bound value");
});

test("Child views created using the view helper should have their parent view set properly", function() {
  TemplateTests = {};

  var template = '{{#view "SC.TemplateView"}}{{#view "SC.TemplateView"}}{{view "SC.TemplateView"}}{{/view}}{{/view}}';

  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile(template)
  });

  view.createLayer();

  var childView = view.childViews[0].childViews[0];
  equals(childView, childView.childViews[0].parentView, 'parent view is correct');
});

test("Child views created using the view helper should have their IDs registered for events", function() {
  TemplateTests = {};

  var template = '{{view "SC.TemplateView"}}{{view "SC.TemplateView" id="templateViewTest"}}';

  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile(template)
  });

  view.createLayer();

  var childView = view.childViews[0];
  var id = childView.$()[0].id;
  equals(SC.View.views[id], childView, 'childView without passed ID is registered with SC.View.views so that it can properly receive events from RootResponder');

  childView = view.childViews[1];
  id = childView.$()[0].id;
  equals(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equals(SC.View.views[id], childView, 'childView with passed ID is registered with SC.View.views so that it can properly receive events from RootResponder');
});

test("Collection views that specify an example view class have their children be of that class", function() {
  TemplateTests.ExampleViewCollection = SC.TemplateCollectionView.create({
    itemView: SC.TemplateView.extend({
      isCustom: YES
    }),

    content: ['foo']
  });

  var parentView = SC.TemplateView.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.ExampleViewCollection"}}OHAI{{/collection}}')
  });

  parentView.createLayer();

  ok(parentView.childViews[0].childViews[0].isCustom, "uses the example view class");
});

test("should update boundIf blocks if the conditional changes", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#boundIf "content.myApp.isEnabled"}}{{content.wham}}{{/boundIf}}</h1>')
  });

  var view = SC.TemplateView.create({
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

  view.createLayer();

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

  TemplateTests.IdView = SC.TemplateView.create();

  var view = SC.TemplateView.create({
    templateName: 'foo',
    templates: templates
  });

  view.createLayer();

  equals(view.$('#bar').length, 1, "adds id attribute to layer");
  equals(view.$('#bar').text(), 'baz', "emits content");
});

test("{{view}} class attribute should set class on layer", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('{{#view "TemplateTests.IdView" class="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = SC.TemplateView.create();

  var view = SC.TemplateView.create({
    templateName: 'foo',
    templates: templates
  });

  view.createLayer();

  equals(view.$('.bar').length, 1, "adds class attribute to layer");
  equals(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should be able to point to a local view", function() {
  var view = SC.TemplateView.create({
    template: SC.Handlebars.compile("{{view common}}"),

    common: SC.TemplateView.create({
      template: SC.Handlebars.compile("common")
    })
  });

  view.createLayer();

  equals(view.$().text(), "common", "tries to look up view name locally");
});

test("should be able to bind view class names to properties", function() {
  var templates = SC.Object.create({
    template: SC.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="isDone"}}foo{{/view}}')
  });

  TemplateTests.classBindingView = SC.TemplateView.create({
    isDone: YES
  });

  var view = SC.TemplateView.create({
    templateName: 'template',
    templates: templates
  });

  view.createLayer();

  equals(view.$('.is-done').length, 1, "dasherizes property and sets class name");

  SC.run(function() {
    TemplateTests.classBindingView.set('isDone', NO);
  });

  equals(view.$('.is-done').length, 0, "removes class name if bound property is set to false");

  // There is a bug that if the view becomes first responder, its class bindings get wiped out.
  // This test illustrates the bug, by adding the view to a pane and making it firstResponder

  var pane = SC.MainPane.design();
  pane = pane.create().append();

  SC.run(function() {
    pane.appendChild(view);
  });

  TemplateTests.classBindingView.becomeFirstResponder();

  SC.run(function() {
    TemplateTests.classBindingView.set('isDone', YES);
  });

  equals(view.$('.is-done').length, 1, "dasherizes property and sets class name after becoming first responder");
});

test("should be able to bind element attributes using {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<img {{bindAttr src="content.url" alt="content.title"}}>');

  // There was a bug where if the initial value of an attribute contained
  // double quotes ("), they would not be escaped properly.
  var view = SC.TemplateView.create({
    template: template,
    content: SC.Object.create({
      url: "http://www.sproutcore.com/img/branding/logo/png/dark.png",
      title: "The \"SproutCore\" Logo"
    })
  });

  view.createLayer();

  equals(view.$('img').attr('src'), "http://www.sproutcore.com/img/branding/logo/png/dark.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The \"SproutCore\" Logo", "sets alt attribute");

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
      url: "http://www.sproutcore.com/img/branding/logo/png/dark.png",
      title: "The SproutCore Logo"
    });
  });

  equals(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  SC.run(function() {
    view.set('content', {
      url: "http://www.sproutcore.com/img/branding/logo/png/dark.png",
      title: function() {
        return "Nanananana SproutCore!";
      }
    });
  });

  equals(view.$('img').attr('alt'), "Nanananana SproutCore!", "updates alt attribute when title property is computed");
});

test("should not reset cursor position when text field receives keyUp event", function() {
  var pane = SC.Pane.create({
    childViews: ['view'],
    view: SC.TextField.create({
      value: "Broseidon, King of the Brocean"
    })
  });

  pane.append();

  var view = pane.get('childViews')[0];

  view.$('input').val('Brosiedoon, King of the Brocean');
  view.$('input').setCaretPosition(5);

  SC.run(function() {
    view.keyUp({});
  });

  equals(view.$('input').caretPosition(), 5, "The keyUp event should not result in the cursor being reset due to the bindAttr observers");

  pane.remove().destroy();
});

test("should be able to bind element attributes using {{bindAttr}} inside a block", function() {
  var template = SC.Handlebars.compile('{{#with content}}<img {{bindAttr src="url" alt="title"}}>{{/with}}');

  var view = SC.TemplateView.create({
    template: template,
    content: SC.Object.create({
      url: "http://www.sproutcore.com/img/branding/logo/png/dark.png",
      title: "The SproutCore Logo"
    })
  });

  view.createLayer();

  equals(view.$('img').attr('src'), "http://www.sproutcore.com/img/branding/logo/png/dark.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  SC.run(function() {
    view.setPath('content.title', "El logo de Esproutcore");
  });

  equals(view.$('img').attr('alt'), "El logo de Esproutcore", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<img {{bindAttr class="foo"}}>');

  var view = SC.TemplateView.create({
    template: template,
    foo: 'bar'
  });

  view.createLayer();

  equals(view.$('img').attr('class'), 'bar', "renders class");

  SC.run(function() {
    view.set('foo', 'baz');
  });

  equals(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind boolean element attributes using {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<input type="checkbox" {{bindAttr disabled="content.isDisabled" checked="content.isChecked"}} />');
  var content = SC.Object.create({
    isDisabled: false,
    isChecked: true
  });

  var view = SC.TemplateView.create({
    template: template,
    content: content
  });

  view.createLayer();

  ok(!view.$('input').attr('disabled'), 'attribute does not exist upon initial render');
  ok(view.$('input').attr('checked'), 'attribute is present upon initial render');

  SC.run(function() {
    content.set('isDisabled', true);
    content.set('isChecked', false);
  });

  ok(view.$('input').attr('disabled'), 'attribute exists after update');
  ok(!view.$('input').attr('checked'), 'attribute is not present after update');
});

test("should be able to add multiple classes using {{bindAttr class}}", function() {
  var template = SC.Handlebars.compile('<div {{bindAttr class="content.isAwesomeSauce content.isAlsoCool"}}></div>');
  var content = SC.Object.create({
    isAwesomeSauce: true,
    isAlsoCool: true
  });

  var view = SC.TemplateView.create({
    template: template,
    content: content
  });

  view.createLayer();

  ok(view.$('div').hasClass('is-awesome-sauce'), "dasherizes first property and sets classname");
  ok(view.$('div').hasClass('is-also-cool'), "dasherizes second property and sets classname");

  SC.run(function() {
    content.set('isAwesomeSauce', false);
  });

  ok(!view.$('div').hasClass('is-awesome-sauce'), "removes dasherized class when property is set to false");
});
