// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TemplateTests */

var getPath = SC.getPath, setPath = SC.setPath, get = SC.get, set = SC.set;
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
  }

})();

var view;

var appendView = function() {
  SC.run(function() { view.appendTo('#qunit-fixture'); });
};

var additionalTeardown;

/**
  This module specifically tests integration with Handlebars and SproutCore-specific
  Handlebars extensions.

  If you add additional template support to SC.View, you should create a new
  file in which to test.
*/
module("SC.View - handlebars integration", {
  setup: function() {
    window.TemplateTests = SC.Namespace.create();
  },

  teardown: function() {
    if (view) view.destroy();
    window.TemplateTests = undefined;

    if (additionalTeardown) { additionalTeardown(); }
    additionalTeardown = null;
  }
});

test("template view should call the function of the associated template", function() {
  view = SC.View.create({
    templateName: 'test_template',
    templates: SC.Object.create({
      test_template: SC.Handlebars.compile("<h1 id='twas-called'>template was called</h1>")
    })
  });

  appendView();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("template view should call the function of the associated template with itself as the context", function() {
  view = SC.View.create({
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

  appendView();

  equals("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  view = SC.View.create({
    template: SC.Handlebars.compile('{{#with person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

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
  view = SC.View.create({
    template: SC.Handlebars.compile('{{output}}'),
    output: "you need to be more <b>bold</b>"
  });

  SC.run(function() { view.appendTo('#qunit-fixture'); });
  equals(view.$('b').length, 0, "does not create an element");
  equals(view.$().text(), 'you need to be more <b>bold</b>', "inserts entities, not elements");

  SC.run(function() { set(view, 'output', "you are so <i>super</i>"); });
  equals(view.$().text(), 'you are so <i>super</i>', "updates with entities, not elements");
  equals(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in triple mustaches", function() {
  view = SC.View.create({
    template: SC.Handlebars.compile('{{{output}}}'),
    output: "you need to be more <b>bold</b>"
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('b').length, 1, "creates an element");

  SC.run(function() {
    set(view, 'output', "you are so <i>super</i>");
  });

  equals(view.$('i').length, 1, "creates an element when value is updated");
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

  view = SC.View.create({
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
  view = SC.View.create({
    template: SC.Handlebars.compile('Hey look, at {{view ".myCool.view"}}'),

    myCool: SC.Object.create({
      view: SC.View.extend({
        template: SC.Handlebars.compile("my cool view")
      })
    })
  });

  appendView();

  equals(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  var templates = SC.Object.create({
    nester: SC.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.BQView\"}}"),
    nested: SC.Handlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view \"TemplateTests.OtherView\"}}{{/with}} {{world}}</div>"),
    other: SC.Handlebars.compile("cruel")
  });

  TemplateTests.BQView = SC.View.extend({
    tagName: "blockquote",
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

  view = SC.View.create({
    world: "world!",
    templateName: 'nester',
    templates: templates
  });

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("blockquote").text().match(/Goodbye.*wot.*cruel.*world\?/), "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\?/), "parent view should appear before the child view");
});

test("SC.View should bind properties in the parent context", function() {
  view = SC.View.create({
    template: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}-{{../blam}}{{/with}}</h1>'),

    content: SC.Object.create({
      wham: 'bam'
    }),

    blam: "shazam"
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "bam-shazam", "renders parent properties");
});


test("SC.View should bind properties in the grandparent context", function() {
  view = SC.View.create({
    template: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{#with thankYou}}{{value}}-{{../wham}}-{{../../blam}}{{/with}}{{/with}}</h1>'),

    content: SC.Object.create({
      wham: 'bam',
      thankYou: SC.Object.create({
        value: "ma'am"
      })
    }),

    blam: "shazam"
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "ma'am-bam-shazam", "renders grandparent properties");
});

test("SC.View should update when a property changes and the bind helper is used", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{bind "wham"}}{{/with}}</h1>')
  });

  view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });
  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("SC.View should update when a property changes and no bind helper is used", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("SC.View should update when the property used with the #with helper changes", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}{{/with}}</h1>')
  });

  view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equals(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  SC.run(function() {
    set(view, 'content', SC.Object.create({
      wham: 'bazam'
    }));
  });

  equals(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("should not update when a property is removed from the view", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('<h1 id="first">{{#bind "content"}}{{#bind "foo"}}{{bind "baz"}}{{/bind}}{{/bind}}</h1>')
  });

  view = SC.View.create({
    templateName: 'foo',
    templates: templates,

    content: SC.Object.create({
      foo: SC.Object.create({
        baz: "unicorns"
      })
    })
  });

  appendView();

  equals(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = get(view, 'content');

  SC.run(function() {
    set(view, 'content', SC.Object.create({
      foo: SC.Object.create({
        baz: "ninjas"
      })
    }));
  });

  equals(view.$('#first').text(), 'ninjas', "updates to new content value");

  SC.run(function() {
    setPath(oldContent, 'foo.baz', 'rockstars');
  });

  SC.run(function() {
    setPath(oldContent, 'foo.baz', 'ewoks');
  });

  equals(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>Today\'s Menu</h1>{{#bind "coffee"}}<h2>{{color}} coffee</h2><span id="price">{{bind "price"}}</span>{{/bind}}')
  });

  SC.run(function() {
    view = SC.View.create({
      templateName: 'menu',
      templates: templates,

      coffee: SC.Object.create({
        color: 'brown',
        price: '$4'
      })
    });
  });

  appendView();

  equals(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equals(view.$('#price').text(), '$4', "precond - renders price correctly");

  SC.run(function() {
    set(view, 'coffee', SC.Object.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$4.50", "should update price field when content changes");

  SC.run(function() {
    set(view, 'coffee', SC.Object.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equals(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equals(view.$('#price').text(), "$5.50", "should update price field when content changes");

  SC.run(function() {
    setPath(view, 'coffee.price', "$5");
  });

  equals(view.$('#price').text(), "$5", "should update price field when price property is changed");

  view.destroy();
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{bind "coffee.price"}}</h1>')
  });

  view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    coffee: SC.Object.create({
      price: '$4'
    })
  });

  appendView();

  equals(view.$('h1').text(), "$4", "precond - renders price");

  SC.run(function() {
    setPath(view, 'coffee.price', "$5");
  });

  equals(view.$('h1').text(), "$5", "updates when property changes");

  SC.run(function() {
    set(view, 'coffee', { price: "$6" });
  });

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

//   set(controller, 'content', realObject);

//   var view = SC.View.create({
//     templateName: 'menu',
//     templates: templates,

//     coffee: controller
//   });

//   view.createElement();

//   equals(view.$('h1').text(), "$4", "precond - renders price");

//   set(realObject, 'price', "$5");

//   equals(view.$('h1').text(), "$5", "updates when property is set on real object");

//   SC.run(function() {
//     set(controller, 'price', "$6" );
//   });

//   equals(view.$('h1').text(), "$6", "updates when property is set on object controller");
// });

test("should update the block when object passed to #if helper changes", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{/if}}</h1>')
  });

  view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView();

  equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "renders block if a string");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      set(view, 'inception', val);
    });

    equals(view.$('h1').text(), '', "hides block when conditional is '%@'".fmt(val));

    SC.run(function() {
      set(view, 'inception', true);
    });

    equals(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("should update the block when object passed to #unless helper changes", function() {
  var templates;

  templates = SC.Object.create({
    advice: SC.Handlebars.compile('<h1>{{#unless onDrugs}}{{doWellInSchool}}{{/unless}}</h1>')
  });

  view = SC.View.create({
    templateName: 'advice',
    templates: templates,

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  appendView();

  equals(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      set(view, 'onDrugs', val);
    });

    equals(view.$('h1').text(), 'Eat your vegetables', "renders block when conditional is '%@'; %@".fmt(val, SC.typeOf(val)));

    SC.run(function() {
      set(view, 'onDrugs', true);
    });

    equals(view.$('h1').text(), "", "precond - hides block when conditional is true");
  });
});

test("should update the block when object passed to #if helper changes and an inverse is supplied", function() {
  var templates;

  templates = SC.Object.create({
    menu: SC.Handlebars.compile('<h1>{{#if inception}}{{INCEPTION}}{{else}}{{SAD}}{{/if}}</h1>')
  });

  view = SC.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  appendView();

  equals(view.$('h1').text(), "BOONG?", "renders alternate if false");

  SC.run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  tests.forEach(function(val) {
    SC.run(function() {
      set(view, 'inception', val);
    });

    equals(view.$('h1').text(), 'BOONG?', "renders alternate if %@".fmt(val));

    SC.run(function() {
      set(view, 'inception', true);
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
  view = SC.View.create({
    templateName: 'cantBeFound'
  });

  raises(function() {
    var template = get(view, 'template');

    ok(SC.typeOf(template) === 'function', 'template should be a function');
    equals(template(), '', 'should return an empty string');
  });
});

test("Template views add an elementId to child views created using the view helper", function() {
  var templates = SC.Object.create({
    parent: SC.Handlebars.compile('<div>{{view "TemplateTests.ChildView"}}</div>'),
    child: SC.Handlebars.compile("I can't believe it's not butter.")
  });

  TemplateTests.ChildView = SC.View.extend({
    templates: templates,
    templateName: 'child'
  });

  view = SC.View.create({
    templates: templates,
    templateName: 'parent'
  });

  appendView();
  var childView = getPath(view, 'childViews.firstObject');
  equals(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

test("Template views set the template of their children to a passed block", function() {
  var templates = SC.Object.create({
    parent: SC.Handlebars.compile('<h1>{{#view "TemplateTests.NoTemplateView"}}<span>It worked!</span>{{/view}}</h1>')
  });

  TemplateTests.NoTemplateView = SC.View.extend();

  view = SC.View.create({
    templates: templates,
    templateName: 'parent'
  });

  appendView();
  ok(view.$('h1:has(span)').length === 1, "renders the passed template inside the parent template");
});

test("should pass hash arguments to the view object", function() {
  TemplateTests.bindTestObject = SC.Object.create({
    bar: 'bat'
  });

  TemplateTests.HashArgTemplateView = SC.View.extend({
  });

  SC.run(function() {
    view = SC.View.create({
      template: SC.Handlebars.compile('{{#view TemplateTests.HashArgTemplateView fooBinding="TemplateTests.bindTestObject.bar"}}{{foo}}{{/view}}')
    });

    appendView();
  });

  equals(view.$().text(), "bat", "prints initial bound value");

  SC.run(function() { 
    set(TemplateTests.bindTestObject, 'bar', 'brains'); 
  });

  equals(view.$().text(), "brains", "prints updated bound value");
});

test("Child views created using the view helper should have their parent view set properly", function() {
  TemplateTests = {};

  var template = '{{#view "SC.View"}}{{#view "SC.View"}}{{view "SC.View"}}{{/view}}{{/view}}';

  view = SC.View.create({
    template: SC.Handlebars.compile(template)
  });

  appendView();

  var childView = firstGrandchild(view);
  equals(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
});

test("Child views created using the view helper should have their IDs registered for events", function() {
  TemplateTests = {};

  var template = '{{view "SC.View"}}{{view "SC.View" id="templateViewTest"}}';

  view = SC.View.create({
    template: SC.Handlebars.compile(template)
  });

  appendView();

  var childView = firstChild(view);
  var id = childView.$()[0].id;
  equals(SC.View.views[id], childView, 'childView without passed ID is registered with SC.View.views so that it can properly receive events from RootResponder');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equals(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equals(SC.View.views[id], childView, 'childView with passed ID is registered with SC.View.views so that it can properly receive events from RootResponder');
});

test("Collection views that specify an example view class have their children be of that class", function() {
  TemplateTests.ExampleViewCollection = SC.CollectionView.extend({
    itemViewClass: SC.View.extend({
      isCustom: true
    }),

    content: ['foo']
  });

  var parentView = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.ExampleViewCollection"}}OHAI{{/collection}}')
  });

  SC.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isCustom, "uses the example view class");

  parentView.destroy();
});

test("itemViewClass works in the #collection helper", function() {
  TemplateTests.ExampleController = SC.ArrayProxy.create({
    content: ['alpha']
  });

  TemplateTests.ExampleItemView = SC.View.extend({
    isAlsoCustom: true
  });

  var parentView = SC.View.create({
    template: SC.Handlebars.compile('{{#collection contentBinding="TemplateTests.ExampleController" itemViewClass="TemplateTests.ExampleItemView"}}beta{{/collection}}')
  });

  SC.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isAlsoCustom, "uses the example view class specified in the #collection helper");

  parentView.destroy();
});

test("itemViewClass works in the #collection helper relatively", function() {
  TemplateTests.ExampleController = SC.ArrayProxy.create({
    content: ['alpha']
  });

  TemplateTests.ExampleItemView = SC.View.extend({
    isAlsoCustom: true
  });

  TemplateTests.CollectionView = SC.CollectionView.extend({
    possibleItemView: TemplateTests.ExampleItemView
  });

  var parentView = SC.View.create({
    template: SC.Handlebars.compile('{{#collection TemplateTests.CollectionView contentBinding="TemplateTests.ExampleController" itemViewClass="possibleItemView"}}beta{{/collection}}')
  });

  SC.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isAlsoCustom, "uses the example view class specified in the #collection helper");

  parentView.destroy();
});

test("should update boundIf blocks if the conditional changes", function() {
  var templates = SC.Object.create({
   foo: SC.Handlebars.compile('<h1 id="first">{{#boundIf "content.myApp.isEnabled"}}{{content.wham}}{{/boundIf}}</h1>')
  });

  view = SC.View.create({
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

  appendView();

  equals(view.$('#first').text(), "bam", "renders block when condition is true");

  SC.run(function() { 
    setPath(get(view, 'content'), 'myApp.isEnabled', NO); 
  });

  equals(view.$('#first').text(), "", "re-renders without block when condition is false");

  SC.run(function() { 
    setPath(get(view, 'content'), 'myApp.isEnabled', YES); 
  });

  equals(view.$('#first').text(), "bam", "re-renders block when condition changes to true");
});

test("boundIf should support parent access", function(){
  view = SC.View.create({
    template: SC.Handlebars.compile(
      '<h1 id="first">{{#with content}}{{#with thankYou}}'+
        '{{#boundIf ../show}}parent{{/boundIf}}-{{#boundIf ../../show}}grandparent{{/boundIf}}'+
      '{{/with}}{{/with}}</h1>'
    ),

    content: SC.Object.create({
      show: true,
      thankYou: SC.Object.create()
    }),

    show: true
  });

  appendView();

  equals(view.$('#first').text(), "parent-grandparent", "renders boundIfs using ..");
});

test("{{view}} id attribute should set id on layer", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('{{#view "TemplateTests.IdView" id="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = SC.View;

  view = SC.View.create({
    templateName: 'foo',
    templates: templates
  });

  appendView();

  equals(view.$('#bar').length, 1, "adds id attribute to layer");
  equals(view.$('#bar').text(), 'baz', "emits content");
});

test("{{view}} class attribute should set class on layer", function() {
  var templates = SC.Object.create({
    foo: SC.Handlebars.compile('{{#view "TemplateTests.IdView" class="bar"}}baz{{/view}}')
  });

  TemplateTests.IdView = SC.View;

  view = SC.View.create({
    templateName: 'foo',
    templates: templates
  });

  appendView();

  equals(view.$('.bar').length, 1, "adds class attribute to layer");
  equals(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should be able to point to a local view", function() {
  view = SC.View.create({
    template: SC.Handlebars.compile("{{view common}}"),

    common: SC.View.extend({
      template: SC.Handlebars.compile("common")
    })
  });

  appendView();

  equals(view.$().text(), "common", "tries to look up view name locally");
});

test("should be able to bind view class names to properties", function() {
  var templates = SC.Object.create({
    template: SC.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="isDone"}}foo{{/view}}')
  });

  TemplateTests.classBindingView = SC.View.extend({
    isDone: YES
  });

  view = SC.View.create({
    templateName: 'template',
    templates: templates
  });

  appendView();

  equals(view.$('.is-done').length, 1, "dasherizes property and sets class name");

  SC.run(function() {
    set(firstChild(view), 'isDone', NO);
  });

  equals(view.$('.is-done').length, 0, "removes class name if bound property is set to false");
});

test("should be able to bind element attributes using {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<img {{bindAttr src="content.url" alt="content.title"}}>');

  view = SC.View.create({
    template: template,
    content: SC.Object.create({
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equals(view.$('img').attr('src'), "http://www.sproutcore.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  SC.run(function() {
    setPath(view, 'content.title', "El logo de Esproutcore");
  });

  equals(view.$('img').attr('alt'), "El logo de Esproutcore", "updates alt attribute when content's title attribute changes");

  SC.run(function() {
    set(view, 'content', SC.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equals(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  SC.run(function() {
    set(view, 'content', {
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equals(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  SC.run(function() {
    set(view, 'content', SC.Object.create({
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: SC.computed(function() {
        return "Nanananana SproutCore!";
      })
    }));
  });

  equals(view.$('img').attr('alt'), "Nanananana SproutCore!", "updates alt attribute when title property is computed");
});

test("should not reset cursor position when text field receives keyUp event", function() {
  view = SC.TextField.create({
    value: "Broseidon, King of the Brocean"
  });

  SC.run(function() {
    view.append();
  });

  view.$().val('Brosiedoon, King of the Brocean');
  view.$().setCaretPosition(5);

  SC.run(function() {
    view.keyUp({});
  });

  equals(view.$().caretPosition(), 5, "The keyUp event should not result in the cursor being reset due to the bindAttr observers");

  view.destroy();
});

test("should be able to bind element attributes using {{bindAttr}} inside a block", function() {
  var template = SC.Handlebars.compile('{{#with content}}<img {{bindAttr src="url" alt="title"}}>{{/with}}');

  view = SC.View.create({
    template: template,
    content: SC.Object.create({
      url: "http://www.sproutcore.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equals(view.$('img').attr('src'), "http://www.sproutcore.com/assets/images/logo.png", "sets src attribute");
  equals(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  SC.run(function() {
    setPath(view, 'content.title', "El logo de Esproutcore");
  });

  equals(view.$('img').attr('alt'), "El logo de Esproutcore", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<img {{bindAttr class="foo"}}>');

  view = SC.View.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equals(view.$('img').attr('class'), 'bar', "renders class");

  SC.run(function() {
    set(view, 'foo', 'baz');
  });

  equals(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind boolean element attributes using {{bindAttr}}", function() {
  var template = SC.Handlebars.compile('<input type="checkbox" {{bindAttr disabled="content.isDisabled" checked="content.isChecked"}} />');
  var content = SC.Object.create({
    isDisabled: false,
    isChecked: true
  });

  view = SC.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(!view.$('input').attr('disabled'), 'attribute does not exist upon initial render');
  ok(view.$('input').attr('checked'), 'attribute is present upon initial render');

  SC.run(function() {
    set(content, 'isDisabled', true);
    set(content, 'isChecked', false);
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

  view = SC.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('div').hasClass('is-awesome-sauce'), "dasherizes first property and sets classname");
  ok(view.$('div').hasClass('is-also-cool'), "dasherizes second property and sets classname");

  SC.run(function() {
    set(content, 'isAwesomeSauce', false);
  });

  ok(!view.$('div').hasClass('is-awesome-sauce'), "removes dasherized class when property is set to false");
});

test("should be able to output a property without binding", function(){
  view = SC.View.create({
    template: SC.Handlebars.compile(
      '<div id="first">{{unbound content.anUnboundString}}</div>'+
      '{{#with content}}<div id="second">{{unbound ../anotherUnboundString}}</div>{{/with}}'
    ),

    content: SC.Object.create({
      anUnboundString: "No spans here, son."
    }),

    anotherUnboundString: "Not here, either."
  });

  appendView();

  equals(view.$('#first').html(), "No spans here, son.");
  equals(view.$('#second').html(), "Not here, either.");
});

test("should be able to log a property", function(){
  var originalLogger = SC.Logger;
  additionalTeardown = function(){ SC.Logger = originalLogger; }

  var logCalls = [];
  SC.Logger = { log: function(arg){ logCalls.push(arg); } };

  view = SC.View.create({
    template: SC.Handlebars.compile('{{log value}}{{#with content}}{{log ../valueTwo}}{{/with}}'),

    value: 'one',
    valueTwo: 'two',

    content: SC.Object.create({})
  });

  appendView();

  equals(view.$().text(), "", "shouldn't render any text");
  equals(logCalls[0], 'one', "should call log with value");
  equals(logCalls[1], 'two', "should call log with valueTwo");
});

test("should allow standard Handlebars template usage", function() {
  TemplateTests.StandardTemplate = SC.View.extend({
    name: "Erik",
    template: Handlebars.compile("Hello, {{name}}")
  });

  view = SC.View.create({
    template: SC.Handlebars.compile("{{view TemplateTests.StandardTemplate}}")
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$().text(), "Hello, Erik");
});

test("should be able to use standard Handlebars #each helper", function() {
  view = SC.View.create({
    items: ['a', 'b', 'c'],
    template: Handlebars.compile("{{#each items}}{{this}}{{/each}}")
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$().html(), "abc");
});

var view;

module("Templates redrawing and bindings", {
  setup: function(){
    MyApp = SC.Object.create({});
  },
  teardown: function(){
    if (view) view.destroy();
    window.MyApp = null;
  }
});

test("should be able to update when bound property updates", function(){
  MyApp.set('controller', SC.Object.create({name: 'first'}))
  
  var View = SC.View.extend({
    template: SC.Handlebars.compile('<i>{{value.name}}, {{computed}}</i>'),
    valueBinding: 'MyApp.controller',
    computed: function(){
      return this.getPath('value.name') + ' - computed';
    }.property('value')
  });
  
  view = View.create();
  appendView();
  
  SC.run.sync();
  
  SC.run(function(){
    MyApp.set('controller', SC.Object.create({
      name: 'second'
    }))
  })
  
  
  equals(view.get('computed'), "second - computed", "view computed properties correctly update");
  equals(view.$('i').text(), 'second, second - computed', "view rerenders when bound properties change");
  
});

test("properties within an if statement should not fail on re-render", function(){
  view = SC.View.create({
    template: SC.Handlebars.compile('{{#if value}}{{value}}{{/if}}'),
    value: null
  });

  appendView();

  equals(view.$().text(), '');

  SC.run(function(){
    view.set('value', 'test');
  });

  equals(view.$().text(), 'test');

  SC.run(function(){
    view.set('value', null);
  });

  equals(view.$().text(), '');
});

test("bindings should be relative to the current context", function() {
  view = SC.View.create({
    museumOpen: true,

    museumDetails: SC.Object.create({
      name: "SFMoMA",
      price: 20
    }),

    museumView: SC.View.extend({
      template: SC.Handlebars.compile('Name: {{name}} Price: ${{dollars}}')
    }),

    template: SC.Handlebars.compile('{{#if museumOpen}} {{view museumView nameBinding="museumDetails.name" dollarsBinding="museumDetails.price"}} {{/if}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals($.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings can be 'this', in which case they *are* the current context", function() {
  view = SC.View.create({
    museumOpen: true,

    museumDetails: SC.Object.create({
      name: "SFMoMA",
      price: 20,
      museumView: SC.View.extend({
        template: SC.Handlebars.compile('Name: {{museum.name}} Price: ${{museum.price}}')
      }),
    }),


    template: SC.Handlebars.compile('{{#if museumOpen}} {{#with museumDetails}}{{view museumView museumBinding="this"}} {{/with}}{{/if}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals($.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

// https://github.com/sproutcore/sproutcore20/issues/120

test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  App = SC.Application.create();
  App.test = SC.Object.create({ href: 'test' });
  App.Link = SC.View.extend({
    classNames: ['app-link'],
    tagName: 'a',
    attributeBindings: ['href'],
    href: '#none',

    click: function() {
      return false;
    }
  });

  var parentView = SC.View.create({
    template: SC.Handlebars.compile('{{#view App.Link hrefBinding="App.test.href"}} Test {{/view}}')
  });


  SC.run(function() {
    parentView.appendTo('#qunit-fixture');
    // App.Link.create().appendTo('#qunit-fixture');
  });
  // equals(view.$().attr('href'), 'test');

  parentView.destroy();

  App = undefined;
});
