// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TemplateTests */

var getPath = Ember.getPath, setPath = Ember.setPath, get = Ember.get, set = Ember.set;
var firstGrandchild = function(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
};
var nthChild = function(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
};
var firstChild = nthChild;

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
  };

})();

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var additionalTeardown;

/**
  This module specifically tests integration with Handlebars and Ember-specific
  Handlebars extensions.

  If you add additional template support to Ember.View, you should create a new
  file in which to test.
*/
module("Ember.View - handlebars integration", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },

  teardown: function() {
    if (view) view.destroy();
    window.TemplateTests = undefined;

    if (additionalTeardown) { additionalTeardown(); }
    additionalTeardown = null;
  }
});

test("template view should call the function of the associated template", function() {
  view = Ember.View.create({
    templateName: 'test_template',
    templates: Ember.Object.create({
      test_template: Ember.Handlebars.compile("<h1 id='twas-called'>template was called</h1>")
    })
  });

  appendView();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("template view should call the function of the associated template with itself as the context", function() {
  view = Ember.View.create({
    templateName: 'test_template',

    _personName: "Tom DAAAALE",
    _i: 0,

    personName: Ember.computed(function() {
      this._i++;
      return this._personName + this._i;
    }).cacheable(),

    templates: Ember.Object.create({
      test_template: Ember.Handlebars.compile("<h1 id='twas-called'>template was called for {{personName}}. Yea {{personName}}</h1>")
    })
  });

  appendView();

  equals("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#with person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

    person: {
      firstName: 'Señor',
      lastName: 'CFC',
      pet: {
        name: 'Fido'
      }
    }
  });

  appendView();

  equals(view.$().text(), "Señor CFC (and Fido)", "prints out values from a hash");
});

test("should escape HTML in normal mustaches", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{output}}'),
    output: "you need to be more <b>bold</b>"
  });

  Ember.run(function() { view.appendTo('#qunit-fixture'); });
  equals(view.$('b').length, 0, "does not create an element");
  equals(view.$().text(), 'you need to be more <b>bold</b>', "inserts entities, not elements");

  Ember.run(function() { set(view, 'output', "you are so <i>super</i>"); });
  equals(view.$().text(), 'you are so <i>super</i>', "updates with entities, not elements");
  equals(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in triple mustaches", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{{output}}}'),
    output: "you need to be more <b>bold</b>"
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('b').length, 1, "creates an element");

  Ember.run(function() {
    set(view, 'output', "you are so <i>super</i>");
  });

  equals(view.$('i').length, 1, "creates an element when value is updated");
});

TemplateTests = {};

test("child views can be inserted using the {{view}} Handlebars helper", function() {
  var templates = Ember.Object.create({
    nester: Ember.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"),
    nested: Ember.Handlebars.compile("<div id='child-view'>Goodbye {{cruel}} {{world}}</div>")
  });

  TemplateTests.LabelView = Ember.View.extend({
    tagName: "aside",
    cruel: "cruel",
    world: "world?",
    templateName: 'nested',
    templates: templates
  });

  view = Ember.View.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("#child-view:contains('Goodbye cruel world?')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\?/), "parent view should appear before the child view");
});

test("should accept relative paths to views", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('Hey look, at {{view ".myCool.view"}}'),

    myCool: Ember.Object.create({
      view: Ember.View.extend({
        template: Ember.Handlebars.compile("my cool view")
      })
    })
  });

  appendView();

  equals(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  var templates = Ember.Object.create({
    nester: Ember.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.BQView\"}}"),
    nested: Ember.Handlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view \"TemplateTests.OtherView\"}}{{/with}} {{world}}</div>"),
    other: Ember.Handlebars.compile("cruel")
  });

  TemplateTests.BQView = Ember.View.extend({
    tagName: "blockquote",
    cruel: "cruel",
    world: "world?",
    content: Ember.Object.create({ blah: "wot" }),
    templateName: 'nested',
    templates: templates
  });

  TemplateTests.OtherView = Ember.View.extend({
    templates: templates,
    templateName: 'other'
  });

  view = Ember.View.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("blockquote").text().match(/Goodbye.*wot.*cruel.*world\?/), "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\?/), "parent view should appear before the child view");
});

test("Ember.View should bind properties in the parent context", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}-{{../blam}}{{/with}}</h1>'),

    content: Ember.Object.create({
      wham: 'bam'
    }),

    blam: "shazam"
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "bam-shazam", "renders parent properties");
});


test("Ember.View should bind properties in the grandparent context", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{#with thankYou}}{{value}}-{{../wham}}-{{../../blam}}{{/with}}{{/with}}</h1>'),

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: Ember.Object.create({
        value: "ma'am"
      })
    }),

    blam: "shazam"
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "ma'am-bam-shazam", "renders grandparent properties");
});

test("Ember.View should update when a property changes and the bind helper is used", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{bind "wham"}}{{/with}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates,

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });
  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("Ember.View should update when a property changes and no bind helper is used", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates,

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("Ember.View should update when the property used with the #with helper changes", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates,

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      wham: 'bazam'
    }));
  });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("should not update when a property is removed from the view", function() {
  var templates = Ember.Object.create({
    foo: Ember.Handlebars.compile('<h1 id="first">{{#bind "content"}}{{#bind "foo"}}{{bind "baz"}}{{/bind}}{{/bind}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates,

    content: Ember.Object.create({
      foo: Ember.Object.create({
        baz: "unicorns"
      })
    })
  });

  appendView();

  equals(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = get(view, 'content');

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      foo: Ember.Object.create({
        baz: "ninjas"
      })
    }));
  });

  equals(view.$('#first').text(), 'ninjas', "updates to new content value");

  Ember.run(function() {
    setPath(oldContent, 'foo.baz', 'rockstars');
  });

  Ember.run(function() {
    setPath(oldContent, 'foo.baz', 'ewoks');
  });

  equals(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>Today\'s Menu</h1>{{#bind "coffee"}}<h2>{{color}} coffee</h2><span id="price">{{bind "price"}}</span>{{/bind}}')
  });

  Ember.run(function() {
    view = Ember.View.create({
      templateName: 'menu',
      templates: templates,

      coffee: Ember.Object.create({
        color: 'brown',
        price: '$4'
      })
    });
  });

  appendView();

  equals(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equals(view.$('#price').text(), '$4', "precond - renders price correctly");

  Ember.run(function() {
    set(view, 'coffee', Ember.Object.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$4.50", "should update price field when content changes");

  Ember.run(function() {
    set(view, 'coffee', Ember.Object.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$5.50", "should update price field when content changes");

  Ember.run(function() {
    setPath(view, 'coffee.price', "$5");
  });

  equals(view.$('#price').text(), "$5", "should update price field when price property is changed");

  view.destroy();
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'menu',
    templates: templates,

    coffee: Ember.Object.create({
      price: '$4'
    })
  });

  appendView();

  equals(view.$('h1').text(), "$4", "precond - renders price");

  Ember.run(function() {
    setPath(view, 'coffee.price', "$5");
  });

  equals(view.$('h1').text(), "$5", "updates when property changes");

  Ember.run(function() {
    set(view, 'coffee', { price: "$6" });
  });

  equals(view.$('h1').text(), "$6", "updates when parent property changes");
});

// test("Template updates correctly if a path is passed to the bind helper and the context object is an Ember.ObjectController", function() {
//   var templates;

//   templates = Ember.Object.create({
//     menu: Ember.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
//   });

//   var controller = Ember.ObjectController.create();
//   var realObject = Ember.Object.create({
//     price: "$4"
//   });

//   set(controller, 'content', realObject);

//   var view = Ember.View.create({
//     templateName: 'menu',
//     templates: templates,

//     coffee: controller
//   });

//   view.createElement();

//   equals(view.$('h1').text(), "$4", "precond - renders price");

//   set(realObject, 'price', "$5");

//   equals(view.$('h1').text(), "$5", "updates when property is set on real object");

//   Ember.run(function() {
//     set(controller, 'price', "$6" );
//   });

//   equals(view.$('h1').text(), "$6", "updates when property is set on object controller");
// });

test("should update the block when object passed to #if helper changes", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{/if}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView();

  equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "renders block if a string");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    Ember.run(function() {
      set(view, 'inception', val);
    });

    equals(view.$('h1').text(), '', Ember.String.fmt("hides block when conditional is '%@'", [String(val)]));

    Ember.run(function() {
      set(view, 'inception', true);
    });

    equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("should update the block when object passed to #unless helper changes", function() {
  var templates;

  templates = Ember.Object.create({
    advice: Ember.Handlebars.compile('<h1>{{#unless onDrugs}}{{doWellInSchool}}{{/unless}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'advice',
    templates: templates,

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  appendView();

  equals(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    Ember.run(function() {
      set(view, 'onDrugs', val);
    });

    equals(view.$('h1').text(), 'Eat your vegetables', Ember.String.fmt("renders block when conditional is '%@'; %@", [String(val), Ember.typeOf(val)]));

    Ember.run(function() {
      set(view, 'onDrugs', true);
    });

    equals(view.$('h1').text(), "", "precond - hides block when conditional is true");
  });
});

test("should update the block when object passed to #if helper changes and an inverse is supplied", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{else}}{{SAD}}{{/if}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  appendView();

  equals(view.$('h1').text(), "BOONG?", "renders alternate if false");

  Ember.run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    Ember.run(function() {
      set(view, 'inception', val);
    });

    equals(view.$('h1').text(), 'BOONG?', Ember.String.fmt("renders alternate if %@", [String(val)]));

    Ember.run(function() {
      set(view, 'inception', true);
    });

    equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

// test("Should insert a localized string if the {{loc}} helper is used", function() {
//   Ember.stringsFor('en', {
//     'Brazil': 'Brasilia'
//   });

//   templates = Ember.Object.create({
//     'loc': Ember.Handlebars.compile('<h1>Country: {{loc "Brazil"}}')
//   });

//   var view = Ember.View.create({
//     templateName: 'loc',
//     templates: templates,

//     country: 'Brazil'
//   });

//   view.createElement();
//   equals(view.$('h1').text(), 'Country: Brasilia', "returns localized value");
// });

test("Template views return a no-op function if their template cannot be found", function() {
  view = Ember.View.create({
    templateName: 'cantBeFound'
  });

  raises(function() {
    var template = get(view, 'template');

    ok(Ember.typeOf(template) === 'function', 'template should be a function');
    equals(template(), '', 'should return an empty string');
  });
});

test("Template views add an elementId to child views created using the view helper", function() {
  var templates = Ember.Object.create({
    parent: Ember.Handlebars.compile('<div>{{view "TemplateTests.ChildView"}}</div>'),
    child: Ember.Handlebars.compile("I can't believe it's not butter.")
  });

  TemplateTests.ChildView = Ember.View.extend({
    templates: templates,
    templateName: 'child'
  });

  view = Ember.View.create({
    templates: templates,
    templateName: 'parent'
  });

  appendView();
  var childView = getPath(view, 'childViews.firstObject');
  equals(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

test("Template views set the template of their children to a passed block", function() {
  var templates = Ember.Object.create({
    parent: Ember.Handlebars.compile('<h1>{{#view "TemplateTests.NoTemplateView"}}<span>It worked!</span>{{/view}}</h1>')
  });

  TemplateTests.NoTemplateView = Ember.View.extend();

  view = Ember.View.create({
    templates: templates,
    templateName: 'parent'
  });

  appendView();
  ok(view.$('h1:has(span)').length === 1, "renders the passed template inside the parent template");
});

test("should pass hash arguments to the view object", function() {
  TemplateTests.bindTestObject = Ember.Object.create({
    bar: 'bat'
  });

  TemplateTests.HashArgTemplateView = Ember.View.extend({
  });

  Ember.run(function() {
    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{#view TemplateTests.HashArgTemplateView fooBinding="TemplateTests.bindTestObject.bar"}}{{foo}}{{/view}}')
    });

    appendView();
  });

  equals(view.$().text(), "bat", "prints initial bound value");

  Ember.run(function() { 
    set(TemplateTests.bindTestObject, 'bar', 'brains'); 
  });

  equals(view.$().text(), "brains", "prints updated bound value");
});

test("Child views created using the view helper should have their parent view set properly", function() {
  TemplateTests = {};

  var template = '{{#view "Ember.View"}}{{#view "Ember.View"}}{{view "Ember.View"}}{{/view}}{{/view}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var childView = firstGrandchild(view);
  equals(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
});

test("Child views created using the view helper should have their IDs registered for events", function() {
  TemplateTests = {};

  var template = '{{view "Ember.View"}}{{view "Ember.View" id="templateViewTest"}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var childView = firstChild(view);
  var id = childView.$()[0].id;
  equals(Ember.View.views[id], childView, 'childView without passed ID is registered with Ember.View.views so that it can properly receive events from RootResponder');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equals(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equals(Ember.View.views[id], childView, 'childView with passed ID is registered with Ember.View.views so that it can properly receive events from RootResponder');
});

test("Child views created using the view helper and that have a viewName should be registered as properties on their parentView", function() {
  TemplateTests = {};

  var template = '{{#view Ember.View}}{{view Ember.View viewName="ohai"}}{{/view}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var parentView = firstChild(view),
      childView  = firstGrandchild(view);
  equals(get(parentView, 'ohai'), childView);
});

test("Collection views that specify an example view class have their children be of that class", function() {
  TemplateTests.ExampleViewCollection = Ember.CollectionView.extend({
    itemViewClass: Ember.View.extend({
      isCustom: true
    }),

    content: Ember.A(['foo'])
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.ExampleViewCollection"}}OHAI{{/collection}}')
  });

  Ember.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isCustom, "uses the example view class");

  parentView.destroy();
});

test("itemViewClass works in the #collection helper", function() {
  TemplateTests.ExampleController = Ember.ArrayProxy.create({
    content: Ember.A(['alpha'])
  });

  TemplateTests.ExampleItemView = Ember.View.extend({
    isAlsoCustom: true
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection contentBinding="TemplateTests.ExampleController" itemViewClass="TemplateTests.ExampleItemView"}}beta{{/collection}}')
  });

  Ember.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isAlsoCustom, "uses the example view class specified in the #collection helper");

  parentView.destroy();
});

test("itemViewClass works in the #collection helper relatively", function() {
  TemplateTests.ExampleController = Ember.ArrayProxy.create({
    content: Ember.A(['alpha'])
  });

  TemplateTests.ExampleItemView = Ember.View.extend({
    isAlsoCustom: true
  });

  TemplateTests.CollectionView = Ember.CollectionView.extend({
    possibleItemView: TemplateTests.ExampleItemView
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.CollectionView contentBinding="TemplateTests.ExampleController" itemViewClass="possibleItemView"}}beta{{/collection}}')
  });

  Ember.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isAlsoCustom, "uses the example view class specified in the #collection helper");

  parentView.destroy();
});

test("should update boundIf blocks if the conditional changes", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#boundIf "content.myApp.isEnabled"}}{{content.wham}}{{/boundIf}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates,

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am",
      myApp: Ember.Object.create({
        isEnabled: YES
      })
    })
  });

  appendView();

  equals(view.$('#first').text(), "bam", "renders block when condition is true");

  Ember.run(function() { 
    setPath(get(view, 'content'), 'myApp.isEnabled', NO); 
  });

  equals(view.$('#first').text(), "", "re-renders without block when condition is false");

  Ember.run(function() { 
    setPath(get(view, 'content'), 'myApp.isEnabled', YES); 
  });

  equals(view.$('#first').text(), "bam", "re-renders block when condition changes to true");
});

test("boundIf should support parent access", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      '<h1 id="first">{{#with content}}{{#with thankYou}}'+
        '{{#boundIf ../show}}parent{{/boundIf}}-{{#boundIf ../../show}}grandparent{{/boundIf}}'+
      '{{/with}}{{/with}}</h1>'
    ),

    content: Ember.Object.create({
      show: true,
      thankYou: Ember.Object.create()
    }),

    show: true
  });

  appendView();

  equals(view.$('#first').text(), "parent-grandparent", "renders boundIfs using ..");
});

test("{{view}} id attribute should set id on layer", function() {
  var templates = Ember.Object.create({
    foo: Ember.Handlebars.compile('{{#view "TemplateTests.IdView" id="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = Ember.View;

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates
  });

  appendView();

  equals(view.$('#bar').length, 1, "adds id attribute to layer");
  equals(view.$('#bar').text(), 'baz', "emits content");
});

test("{{view}} class attribute should set class on layer", function() {
  var templates = Ember.Object.create({
    foo: Ember.Handlebars.compile('{{#view "TemplateTests.IdView" class="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = Ember.View;

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates
  });

  appendView();

  equals(view.$('.bar').length, 1, "adds class attribute to layer");
  equals(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should be able to point to a local view", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view common}}"),

    common: Ember.View.extend({
      template: Ember.Handlebars.compile("common")
    })
  });

  appendView();

  equals(view.$().text(), "common", "tries to look up view name locally");
});

test("should be able to bind view class names to properties", function() {
  var templates = Ember.Object.create({
    template: Ember.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="isDone"}}foo{{/view}}')
  });

  TemplateTests.classBindingView = Ember.View.extend({
    isDone: YES
  });

  view = Ember.View.create({
    templateName: 'template',
    templates: templates
  });

  appendView();

  equals(view.$('.is-done').length, 1, "dasherizes property and sets class name");

  Ember.run(function() {
    set(firstChild(view), 'isDone', NO);
  });

  equals(view.$('.is-done').length, 0, "removes class name if bound property is set to false");
});

test("should be able to bind element attributes using {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr src="content.url" alt="content.title"}}>');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equals(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    setPath(view, 'content.title', "El logo de Eember");
  });

  equals(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equals(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  Ember.run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equals(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: Ember.computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equals(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");
});

test("should be able to bind use {{bindAttr}} more than once on an element", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr src="content.url"}} {{bindAttr alt="content.title"}}>');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equals(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    setPath(view, 'content.title', "El logo de Eember");
  });

  equals(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equals(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  Ember.run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equals(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: Ember.computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equals(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");
  
});

test("should not reset cursor position when text field receives keyUp event", function() {
  view = Ember.TextField.create({
    value: "Broseidon, King of the Brocean"
  });

  Ember.run(function() {
    view.append();
  });

  view.$().val('Brosiedoon, King of the Brocean');
  view.$().setCaretPosition(5);

  Ember.run(function() {
    view.keyUp({});
  });

  equals(view.$().caretPosition(), 5, "The keyUp event should not result in the cursor being reset due to the bindAttr observers");

  view.destroy();
});

test("should be able to bind element attributes using {{bindAttr}} inside a block", function() {
  var template = Ember.Handlebars.compile('{{#with content}}<img {{bindAttr src="url" alt="title"}}>{{/with}}');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equals(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    setPath(view, 'content.title', "El logo de Eember");
  });

  equals(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr class="foo"}}>');

  view = Ember.View.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equals(view.$('img').attr('class'), 'bar', "renders class");

  Ember.run(function() {
    set(view, 'foo', 'baz');
  });

  equals(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind boolean element attributes using {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<input type="checkbox" {{bindAttr disabled="content.isDisabled" checked="content.isChecked"}} />');
  var content = Ember.Object.create({
    isDisabled: false,
    isChecked: true
  });

  view = Ember.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(!view.$('input').attr('disabled'), 'attribute does not exist upon initial render');
  ok(view.$('input').attr('checked'), 'attribute is present upon initial render');

  Ember.run(function() {
    set(content, 'isDisabled', true);
    set(content, 'isChecked', false);
  });

  ok(view.$('input').attr('disabled'), 'attribute exists after update');
  ok(!view.$('input').attr('checked'), 'attribute is not present after update');
});

test("should be able to add multiple classes using {{bindAttr class}}", function() {
  var template = Ember.Handlebars.compile('<div {{bindAttr class="content.isAwesomeSauce content.isAlsoCool content.isAmazing:amazing"}}></div>');
  var content = Ember.Object.create({
    isAwesomeSauce: true,
    isAlsoCool: true,
    isAmazing: true
  });

  view = Ember.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('div').hasClass('is-awesome-sauce'), "dasherizes first property and sets classname");
  ok(view.$('div').hasClass('is-also-cool'), "dasherizes second property and sets classname");
  ok(view.$('div').hasClass('amazing'), "uses alias for third property and sets classname");

  Ember.run(function() {
    set(content, 'isAwesomeSauce', false);
    set(content, 'isAmazing', false);
  });

  ok(!view.$('div').hasClass('is-awesome-sauce'), "removes dasherized class when property is set to false");
  ok(!view.$('div').hasClass('amazing'), "removes aliased class when property is set to false");
});

test("should be able to output a property without binding", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      '<div id="first">{{unbound content.anUnboundString}}</div>'+
      '{{#with content}}<div id="second">{{unbound ../anotherUnboundString}}</div>{{/with}}'
    ),

    content: Ember.Object.create({
      anUnboundString: "No spans here, son."
    }),

    anotherUnboundString: "Not here, either."
  });

  appendView();

  equals(view.$('#first').html(), "No spans here, son.");
  equals(view.$('#second').html(), "Not here, either.");
});

test("should be able to log a property", function(){
  var originalLogger = Ember.Logger;
  additionalTeardown = function(){ Ember.Logger = originalLogger; };

  var logCalls = [];
  Ember.Logger = { log: function(arg){ logCalls.push(arg); } };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{log value}}{{#with content}}{{log ../valueTwo}}{{/with}}'),

    value: 'one',
    valueTwo: 'two',

    content: Ember.Object.create({})
  });

  appendView();

  equals(view.$().text(), "", "shouldn't render any text");
  equals(logCalls[0], 'one', "should call log with value");
  equals(logCalls[1], 'two', "should call log with valueTwo");
});

test("should allow standard Handlebars template usage", function() {
  TemplateTests.StandardTemplate = Ember.View.extend({
    name: "Erik",
    template: Handlebars.compile("Hello, {{name}}")
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view TemplateTests.StandardTemplate}}")
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$().text(), "Hello, Erik");
});

test("should be able to use standard Handlebars #each helper", function() {
  view = Ember.View.create({
    items: ['a', 'b', 'c'],
    template: Handlebars.compile("{{#each items}}{{this}}{{/each}}")
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$().html(), "abc");
});

module("Templates redrawing and bindings", {
  setup: function(){
    MyApp = Ember.Object.create({});
  },
  teardown: function(){
    if (view) view.destroy();
    window.MyApp = null;
  }
});

test("should be able to update when bound property updates", function(){
  MyApp.set('controller', Ember.Object.create({name: 'first'}));
  
  var View = Ember.View.extend({
    template: Ember.Handlebars.compile('<i>{{value.name}}, {{computed}}</i>'),
    valueBinding: 'MyApp.controller',
    computed: Ember.computed(function(){
      return this.getPath('value.name') + ' - computed';
    }).property('value')
  });
  
  view = View.create();
  appendView();
  
  Ember.run.sync();
  
  Ember.run(function(){
    MyApp.set('controller', Ember.Object.create({
      name: 'second'
    }));
  });
  
  equals(view.get('computed'), "second - computed", "view computed properties correctly update");
  equals(view.$('i').text(), 'second, second - computed', "view rerenders when bound properties change");
});

test("properties within an if statement should not fail on re-render", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if value}}{{value}}{{/if}}'),
    value: null
  });

  appendView();

  equals(view.$().text(), '');

  Ember.run(function(){
    view.set('value', 'test');
  });

  equals(view.$().text(), 'test');

  Ember.run(function(){
    view.set('value', null);
  });

  equals(view.$().text(), '');
});

test("views within an if statement should be sane on re-render", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if display}}{{view Ember.Button}}{{/if}}'),
    display: false
  });

  appendView();

  equals(view.$('button').length, 0);

  Ember.run(function(){
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var button = view.$('button');
  equals(button.length, 1);

  // Make sure the view is still registered in Ember.View.views
  ok(Ember.View.views[button.attr('id')]);
});

test("the {{this}} helper should not fail on removal", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if show}}{{#each list}}{{this}}{{/each}}{{/if}}'),
    show: true,
    list: Ember.A(['a', 'b', 'c'])
  });

  appendView();

  equals(view.$().text(), 'abc', "should start property - precond");

  Ember.run(function(){
    view.set('show', false);
  });

  equals(view.$().text(), '');
});

test("bindings should be relative to the current context", function() {
  view = Ember.View.create({
    museumOpen: true,

    museumDetails: Ember.Object.create({
      name: "SFMoMA",
      price: 20
    }),

    museumView: Ember.View.extend({
      template: Ember.Handlebars.compile('Name: {{name}} Price: ${{dollars}}')
    }),

    template: Ember.Handlebars.compile('{{#if museumOpen}} {{view museumView nameBinding="museumDetails.name" dollarsBinding="museumDetails.price"}} {{/if}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals($.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings can be 'this', in which case they *are* the current context", function() {
  view = Ember.View.create({
    museumOpen: true,

    museumDetails: Ember.Object.create({
      name: "SFMoMA",
      price: 20,
      museumView: Ember.View.extend({
        template: Ember.Handlebars.compile('Name: {{museum.name}} Price: ${{museum.price}}')
      })
    }),


    template: Ember.Handlebars.compile('{{#if museumOpen}} {{#with museumDetails}}{{view museumView museumBinding="this"}} {{/with}}{{/if}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals($.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

// https://github.com/emberjs/ember.js/issues/120

test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  App = Ember.Application.create();
  App.test = Ember.Object.create({ href: 'test' });
  App.Link = Ember.View.extend({
    classNames: ['app-link'],
    tagName: 'a',
    attributeBindings: ['href'],
    href: '#none',

    click: function() {
      return false;
    }
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view App.Link hrefBinding="App.test.href"}} Test {{/view}}')
  });


  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
    // App.Link.create().appendTo('#qunit-fixture');
  });
  // equals(view.$().attr('href'), 'test');

  parentView.destroy();

  App = undefined;
});

test("should render other templates using the {{template}} helper", function() {
  // save a reference to the current global templates hash so we can restore it
  // after the test.
  var oldTemplates = Ember.TEMPLATES;

  try {
    Ember.TEMPLATES = {
      sub_template: Ember.Handlebars.compile("sub-template")
    };

    view = Ember.View.create({
      template: Ember.Handlebars.compile('This {{template "sub_template"}} is pretty great.')
    });

    Ember.run(function() {
      view.appendTo('#qunit-fixture');
    });

    equals($.trim(view.$().text()), "This sub-template is pretty great.");
  } finally {
   Ember.TEMPLATES = oldTemplates;
  }
});

test("should update bound values after the view is removed and then re-appended", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#if showStuff}}{{boundValue}}{{else}}Not true.{{/if}}"),
    showStuff: true,
    boundValue: "foo"
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal($.trim(view.$().text()), "foo");
  Ember.run(function() {
    set(view, 'showStuff', false);
  });
  equal($.trim(view.$().text()), "Not true.");

  Ember.run(function() {
    set(view, 'showStuff', true);
  });
  equal($.trim(view.$().text()), "foo");

  view.remove();
  Ember.run(function() {
    set(view, 'showStuff', false);
  });
  Ember.run(function() {
    set(view, 'showStuff', true);
  });
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    set(view, 'boundValue', "bar");
  });
  equal($.trim(view.$().text()), "bar");
});

test("should update bound values after view's parent is removed and then re-appended", function() {
  var parentView = SC.ContainerView.create({
    childViews: ['testView'],
    testView: SC.View.create({
      template: SC.Handlebars.compile("{{#if showStuff}}{{boundValue}}{{else}}Not true.{{/if}}"),
      showStuff: true,
      boundValue: "foo"
    })
  });

  SC.run(function() {
    parentView.appendTo('#qunit-fixture');
  });
  view = parentView.get('testView');

  equal($.trim(view.$().text()), "foo");
  SC.run(function() {
    set(view, 'showStuff', false);
  });
  equal($.trim(view.$().text()), "Not true.");

  SC.run(function() {
    set(view, 'showStuff', true);
  });
  equal($.trim(view.$().text()), "foo");

  parentView.remove();
  SC.run(function() {
    set(view, 'showStuff', false);
  });
  SC.run(function() {
    set(view, 'showStuff', true);
  });
  SC.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  SC.run(function() {
    set(view, 'boundValue', "bar");
  });
  equal($.trim(view.$().text()), "bar");
});
