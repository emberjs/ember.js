/*globals TemplateTests:true MyApp:true App:true */

var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

var firstGrandchild = function(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
};
var nthChild = function(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
};
var firstChild = nthChild;

var originalLog, logCalls;

(function() {

  Ember.$.fn.caretPosition = function() {
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
      else if (ctrl.selectionStart || ctrl.selectionStart === '0') {
          CaretPos = ctrl.selectionStart;
      }

      return (CaretPos);
  };


  Ember.$.fn.setCaretPosition = function(pos) {
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
var originalLookup = Ember.lookup, lookup;
var TemplateTests;

/**
  This module specifically tests integration with Handlebars and Ember-specific
  Handlebars extensions.

  If you add additional template support to Ember.View, you should create a new
  file in which to test.
*/
module("Ember.View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    lookup.TemplateTests = TemplateTests = Ember.Namespace.create();
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }
    Ember.lookup = originalLookup;
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
  view = Ember.View.createWithMixins({
    templateName: 'test_template',

    _personName: "Tom DAAAALE",
    _i: 0,

    personName: Ember.computed(function() {
      this._i++;
      return this._personName + this._i;
    }),

    templates: Ember.Object.create({
      test_template: Ember.Handlebars.compile("<h1 id='twas-called'>template was called for {{view.personName}}. Yea {{view.personName}}</h1>")
    })
  });

  appendView();

  equal("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#with view.person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

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

test("htmlSafe should return an instance of Handlebars.SafeString", function() {
  var safeString = Ember.String.htmlSafe("you need to be more <b>bold</b>");

  ok(safeString instanceof Handlebars.SafeString, "should return SafeString");
});

test("should escape HTML in normal mustaches", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view.output}}'),
    output: "you need to be more <b>bold</b>"
  });

  Ember.run(function() { view.appendTo('#qunit-fixture'); });
  equal(view.$('b').length, 0, "does not create an element");
  equal(view.$().text(), 'you need to be more <b>bold</b>', "inserts entities, not elements");

  Ember.run(function() { set(view, 'output', "you are so <i>super</i>"); });
  equal(view.$().text(), 'you are so <i>super</i>', "updates with entities, not elements");
  equal(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in triple mustaches", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{{view.output}}}'),
    output: "you need to be more <b>bold</b>"
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('b').length, 1, "creates an element");

  Ember.run(function() {
    set(view, 'output', "you are so <i>super</i>");
  });

  equal(view.$('i').length, 1, "creates an element when value is updated");
});

test("should not escape HTML if string is a Handlebars.SafeString", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view.output}}'),
    output: new Handlebars.SafeString("you need to be more <b>bold</b>")
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('b').length, 1, "creates an element");

  Ember.run(function() {
    set(view, 'output', new Handlebars.SafeString("you are so <i>super</i>"));
  });

  equal(view.$('i').length, 1, "creates an element when value is updated");
});

test("child views can be inserted using the {{view}} Handlebars helper", function() {
  var templates = Ember.Object.create({
    nester: Ember.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"),
    nested: Ember.Handlebars.compile("<div id='child-view'>Goodbye {{cruel}} {{world}}</div>")
  });

  var context = {
    world: "world!"
  };

  TemplateTests.LabelView = Ember.View.extend({
    tagName: "aside",
    templateName: 'nested',
    templates: templates
  });

  view = Ember.View.create({
    templateName: 'nester',
    templates: templates,
    context: context
  });

  Ember.set(context, 'cruel', "cruel");

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("#child-view:contains('Goodbye cruel world!')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\!/), "parent view should appear before the child view");
});

test("should accept relative paths to views", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('Hey look, at {{view "view.myCool.view"}}'),

    myCool: Ember.Object.create({
      view: Ember.View.extend({
        template: Ember.Handlebars.compile("my cool view")
      })
    })
  });

  appendView();

  equal(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  var templates = Ember.Object.create({
    nester: Ember.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.BQView\"}}"),
    nested: Ember.Handlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view \"TemplateTests.OtherView\"}}{{/with}} {{world}}</div>"),
    other: Ember.Handlebars.compile("cruel")
  });

  var context = {
    world: "world!"
  };

  TemplateTests.BQView = Ember.View.extend({
    tagName: "blockquote",
    templateName: 'nested',
    templates: templates
  });

  TemplateTests.OtherView = Ember.View.extend({
    templates: templates,
    templateName: 'other'
  });

  view = Ember.View.create({
    context: context,
    templateName: 'nester',
    templates: templates
  });

  Ember.set(context, 'content', Ember.Object.create({ blah: "wot" }));

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");

  ok(view.$("blockquote").text().match(/Goodbye.*wot.*cruel.*world\!/), "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\!/), "parent view should appear before the child view");
});

test("Ember.View should bind properties in the parent context", function() {
  var context = {
    content: Ember.Object.create({
      wham: 'bam'
    }),

    blam: "shazam"
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}-{{../blam}}{{/with}}</h1>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('#first').text(), "bam-shazam", "renders parent properties");
});


test("Ember.View should bind properties in the grandparent context", function() {
  var context = {
    content: Ember.Object.create({
      wham: 'bam',
      thankYou: Ember.Object.create({
        value: "ma'am"
      })
    }),

    blam: "shazam"
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{#with thankYou}}{{value}}-{{../wham}}-{{../../blam}}{{/with}}{{/with}}</h1>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('#first').text(), "ma'am-bam-shazam", "renders grandparent properties");
});

test("Ember.View should update when a property changes and the bind helper is used", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{bind "wham"}}{{/with}}</h1>')
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

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });
  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("Ember.View should update when a property changes and no bind helper is used", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>')
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

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("Ember.View should update when the property used with the #with helper changes", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>')
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

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      wham: 'bazam'
    }));
  });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("should not update when a property is removed from the view", function() {
  var templates = Ember.Object.create({
    foo: Ember.Handlebars.compile('<h1 id="first">{{#bind "view.content"}}{{#bind "foo"}}{{bind "baz"}}{{/bind}}{{/bind}}</h1>')
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

  equal(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = get(view, 'content');

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      foo: Ember.Object.create({
        baz: "ninjas"
      })
    }));
  });

  equal(view.$('#first').text(), 'ninjas', "updates to new content value");

  Ember.run(function() {
    set(oldContent, 'foo.baz', 'rockstars');
  });

  Ember.run(function() {
    set(oldContent, 'foo.baz', 'ewoks');
  });

  equal(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>Today\'s Menu</h1>{{#bind "view.coffee"}}<h2>{{color}} coffee</h2><span id="price">{{bind "price"}}</span>{{/bind}}')
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

  equal(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equal(view.$('#price').text(), '$4', "precond - renders price correctly");

  Ember.run(function() {
    set(view, 'coffee', Ember.Object.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$4.50", "should update price field when content changes");

  Ember.run(function() {
    set(view, 'coffee', Ember.Object.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$5.50", "should update price field when content changes");

  Ember.run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('#price').text(), "$5", "should update price field when price property is changed");

  Ember.run(function() {
    view.destroy();
  });
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>{{bind "view.coffee.price"}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'menu',
    templates: templates,

    coffee: Ember.Object.create({
      price: '$4'
    })
  });

  appendView();

  equal(view.$('h1').text(), "$4", "precond - renders price");

  Ember.run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property changes");

  Ember.run(function() {
    set(view, 'coffee', { price: "$6" });
  });

  equal(view.$('h1').text(), "$6", "updates when parent property changes");
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

//   equal(view.$('h1').text(), "$4", "precond - renders price");

//   set(realObject, 'price', "$5");

//   equal(view.$('h1').text(), "$5", "updates when property is set on real object");

//   Ember.run(function() {
//     set(controller, 'price', "$6" );
//   });

//   equal(view.$('h1').text(), "$6", "updates when property is set on object controller");
// });

test("should update the block when object passed to #if helper changes", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView();

  equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "renders block if a string");

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    Ember.run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', Ember.String.fmt("hides block when conditional is '%@'", [String(val)]));

    Ember.run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("should update the block when object passed to #unless helper changes", function() {
  var templates;

  templates = Ember.Object.create({
    advice: Ember.Handlebars.compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'advice',
    templates: templates,

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  appendView();

  equal(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    Ember.run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', Ember.String.fmt("renders block when conditional is '%@'; %@", [String(val), Ember.typeOf(val)]));

    Ember.run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), "", "precond - hides block when conditional is true");
  });
});

test("should update the block when object passed to #if helper changes and an inverse is supplied", function() {
  var templates;

  templates = Ember.Object.create({
    menu: Ember.Handlebars.compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'menu',
    templates: templates,

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  appendView();

  equal(view.$('h1').text(), "BOONG?", "renders alternate if false");

  Ember.run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    Ember.run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', Ember.String.fmt("renders alternate if %@", [String(val)]));

    Ember.run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
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
//   equal(view.$('h1').text(), 'Country: Brasilia', "returns localized value");
// });

test("Template views return a no-op function if their template cannot be found", function() {
  view = Ember.View.create({
    templateName: 'cantBeFound'
  });

  raises(function() {
    var template = get(view, 'template');

    ok(Ember.typeOf(template) === 'function', 'template should be a function');
    equal(template(), '', 'should return an empty string');
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
  var childView = get(view, 'childViews.firstObject');
  equal(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

test("views set the template of their children to a passed block", function() {
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

test("views render their template in the context of the parent view's context", function() {
  var templates = Ember.Object.create({
    parent: Ember.Handlebars.compile('<h1>{{#with content}}{{#view}}{{firstName}} {{lastName}}{{/view}}{{/with}}</h1>')
  });

  var context = {
    content: {
      firstName: "Lana",
      lastName: "del Heeeyyyyyy"
    }
  };

  view = Ember.View.create({
    templates: templates,
    templateName: 'parent',
    context: context
  });

  appendView();
  equal(view.$('h1').text(), "Lana del Heeeyyyyyy", "renders properties from parent context");
});

test("views make a view keyword available that allows template to reference view context", function() {
  var templates = Ember.Object.create({
    parent: Ember.Handlebars.compile('<h1>{{#with view.content}}{{#view subview}}{{view.firstName}} {{lastName}}{{/view}}{{/with}}</h1>')
  });

  view = Ember.View.create({
    templates: templates,
    templateName: 'parent',

    content: {
      subview: Ember.View.extend({
        firstName: "Brodele"
      }),
      firstName: "Lana",
      lastName: "del Heeeyyyyyy"
    }
  });

  appendView();
  equal(view.$('h1').text(), "Brodele del Heeeyyyyyy", "renders properties from parent context");
});

test("should warn if setting a template on a view with a templateName already specified", function() {
  view = Ember.View.create({
    childView: Ember.View.extend({
      templateName: 'foo'
    }),

    template: Ember.Handlebars.compile('{{#view childView}}test{{/view}}')
  });

  raises(function() {
    appendView();
  }, Error, "raises if conflicting template and templateName are provided");

  Ember.run(function() {
    view.destroy();
  });

  view = Ember.View.create({
    childView: Ember.View.extend(),
    template: Ember.Handlebars.compile('{{#view childView templateName="foo"}}test{{/view}}')
  });

  raises(function() {
    appendView();
  }, Error, "raises if conflicting template and templateName are provided via a Handlebars template");
});

test("Child views created using the view helper should have their parent view set properly", function() {
  TemplateTests = {};

  var template = '{{#view "Ember.View"}}{{#view "Ember.View"}}{{view "Ember.View"}}{{/view}}{{/view}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var childView = firstGrandchild(view);
  equal(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
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
  equal(Ember.View.views[id], childView, 'childView without passed ID is registered with Ember.View.views so that it can properly receive events from RootResponder');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equal(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equal(Ember.View.views[id], childView, 'childView with passed ID is registered with Ember.View.views so that it can properly receive events from RootResponder');
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
  equal(get(parentView, 'ohai'), childView);
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

  Ember.run(function() {
    parentView.destroy();
  });
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

  Ember.run(function() {
    parentView.destroy();
  });
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

  Ember.run(function() {
    parentView.destroy();
  });
});

test("should update boundIf blocks if the conditional changes", function() {
  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#boundIf "view.content.myApp.isEnabled"}}{{view.content.wham}}{{/boundIf}}</h1>')
  });

  view = Ember.View.create({
    templateName: 'foo',
    templates: templates,

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am",
      myApp: Ember.Object.create({
        isEnabled: true
      })
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "renders block when condition is true");

  Ember.run(function() {
    set(get(view, 'content'), 'myApp.isEnabled', false);
  });

  equal(view.$('#first').text(), "", "re-renders without block when condition is false");

  Ember.run(function() {
    set(get(view, 'content'), 'myApp.isEnabled', true);
  });

  equal(view.$('#first').text(), "bam", "re-renders block when condition changes to true");
});

test("should not update boundIf if truthiness does not change", function() {
  var renderCount = 0;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<h1 id="first">{{#boundIf "view.shouldDisplay"}}{{view view.InnerViewClass}}{{/boundIf}}</h1>'),

    shouldDisplay: true,

    InnerViewClass: Ember.View.extend({
      template: Ember.Handlebars.compile("bam"),

      render: function() {
        renderCount++;
        return this._super.apply(this, arguments);
      }
    })
  });

  appendView();

  equal(renderCount, 1, "precond - should have rendered once");
  equal(view.$('#first').text(), "bam", "renders block when condition is true");

  Ember.run(function() {
    set(view, 'shouldDisplay', 1);
  });

  equal(renderCount, 1, "should not have rerendered");
  equal(view.$('#first').text(), "bam", "renders block when condition is true");
});

test("boundIf should support parent access", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      '<h1 id="first">{{#with view.content}}{{#with thankYou}}'+
        '{{#boundIf ../view.show}}parent{{/boundIf}}-{{#boundIf ../../view.show}}grandparent{{/boundIf}}'+
      '{{/with}}{{/with}}</h1>'
    ),

    content: Ember.Object.create({
      show: true,
      thankYou: Ember.Object.create()
    }),

    show: true
  });

  appendView();

  equal(view.$('#first').text(), "parent-grandparent", "renders boundIfs using ..");
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

  equal(view.$('#bar').length, 1, "adds id attribute to layer");
  equal(view.$('#bar').text(), 'baz', "emits content");
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

  equal(view.$('.bar').length, 1, "adds class attribute to layer");
  equal(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should not allow attributeBindings to be set", function() {
  raises(function() {
    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{view "Ember.View" attributeBindings="one two"}}')
    });
    appendView();
  }, /Setting 'attributeBindings' via Handlebars is not allowed/, "should raise attributeBindings error");
});

test("{{view}} should be able to point to a local view", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view view.common}}"),

    common: Ember.View.extend({
      template: Ember.Handlebars.compile("common")
    })
  });

  appendView();

  equal(view.$().text(), "common", "tries to look up view name locally");
});

test("{{view}} should evaluate class bindings set to global paths", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create({
      isApp:       true,
      isGreat:     true,
      directClass: "app-direct",
      isEnabled:   true
    });
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view Ember.TextField class="unbound" classBinding="App.isGreat:great App.directClass App.isApp App.isEnabled:enabled:disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),     "sets unbound classes directly");
  ok(view.$('input').hasClass('great'),       "evaluates classes bound to global paths");
  ok(view.$('input').hasClass('app-direct'),  "evaluates classes bound directly to global paths");
  ok(view.$('input').hasClass('is-app'),      "evaluates classes bound directly to booleans in global paths - dasherizes and sets class when true");
  ok(view.$('input').hasClass('enabled'),     "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),   "evaluates ternary operator in classBindings");

  Ember.run(function() {
    App.set('isApp', false);
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-app'),     "evaluates classes bound directly to booleans in global paths - removes class when false");
  ok(!view.$('input').hasClass('enabled'),    "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),    "evaluates ternary operator in classBindings");

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate class bindings set in the current context", function() {
  view = Ember.View.create({
    isView:      true,
    isEditable:  true,
    directClass: "view-direct",
    isEnabled: true,
    template: Ember.Handlebars.compile('{{view Ember.TextField class="unbound" classBinding="view.isEditable:editable view.directClass view.isView view.isEnabled:enabled:disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),     "sets unbound classes directly");
  ok(view.$('input').hasClass('editable'),    "evaluates classes bound in the current context");
  ok(view.$('input').hasClass('view-direct'), "evaluates classes bound directly in the current context");
  ok(view.$('input').hasClass('is-view'),     "evaluates classes bound directly to booleans in the current context - dasherizes and sets class when true");
  ok(view.$('input').hasClass('enabled'),     "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),   "evaluates ternary operator in classBindings");

  Ember.run(function() {
    view.set('isView', false);
    view.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-view'),    "evaluates classes bound directly to booleans in the current context - removes class when false");
  ok(!view.$('input').hasClass('enabled'),    "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),    "evaluates ternary operator in classBindings");
});

test("{{view}} should evaluate class bindings set with either classBinding or classNameBindings", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create({
      isGreat: true,
      isEnabled: true
    });
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view Ember.TextField class="unbound" classBinding="App.isGreat:great App.isEnabled:enabled:disabled" classNameBindings="App.isGreat:really-great App.isEnabled:really-enabled:really-disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),          "sets unbound classes directly");
  ok(view.$('input').hasClass('great'),            "evaluates classBinding");
  ok(view.$('input').hasClass('really-great'),     "evaluates classNameBinding");
  ok(view.$('input').hasClass('enabled'),          "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('really-enabled'),   "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),        "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('really-disabled'), "evaluates ternary operator in classBindings");

  Ember.run(function() {
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('enabled'),        "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('really-enabled'), "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),        "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('really-disabled'), "evaluates ternary operator in classBindings");

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate other attribute bindings set to global paths", function() {
  Ember.run(function() {
    lookup.App = Ember.Application.create({
      name: "myApp"
    });
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view Ember.TextField valueBinding="App.name"}}')
  });

  appendView();

  equal(view.$('input').attr('value'), "myApp", "evaluates attributes bound to global paths");

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate other attributes bindings set in the current context", function() {
  view = Ember.View.create({
    name: "myView",
    template: Ember.Handlebars.compile('{{view Ember.TextField valueBinding="view.name"}}')
  });

  appendView();

  equal(view.$('input').attr('value'), "myView", "evaluates attributes bound in the current context");
});

test("{{view}} should be able to bind class names to truthy properties", function() {
  var templates = Ember.Object.create({
    template: Ember.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="view.number:is-truthy"}}foo{{/view}}')
  });

  TemplateTests.classBindingView = Ember.View.extend();

  view = Ember.View.create({
    number: 5,
    templateName: 'template',
    templates: templates
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name");

  Ember.run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "removes class name if bound property is set to falsey");
});

test("{{view}} should be able to bind class names to truthy or falsy properties", function() {
  var templates = Ember.Object.create({
    template: Ember.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="view.number:is-truthy:is-falsy"}}foo{{/view}}')
  });

  TemplateTests.classBindingView = Ember.View.extend();

  view = Ember.View.create({
    number: 5,
    templateName: 'template',
    templates: templates
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name to truthy value");
  equal(view.$('.is-falsy').length, 0, "doesn't set class name to falsy value");

  Ember.run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "doesn't set class name to truthy value");
  equal(view.$('.is-falsy').length, 1, "sets class name to falsy value");
});

test("should be able to bind element attributes using {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr src="view.content.url" alt="view.content.title"}}>');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equal(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  Ember.run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equal(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  Ember.run(function() {
    set(view, 'content', Ember.Object.createWithMixins({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: Ember.computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equal(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");
});

test("should be able to bind to view attributes with {{bindAttr}}", function() {
  view = Ember.View.create({
    value: 'Test',
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bindAttr alt="view.value"}}>')
  });

  appendView();

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  Ember.run(function() {
    view.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

test("should be able to bind to globals with {{bindAttr}}", function() {
  TemplateTests.set('value', 'Test');

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bindAttr alt="TemplateTests.value"}}>')
  });

  appendView();

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  Ember.run(function() {
    TemplateTests.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

test("should not allow XSS injection via {{bindAttr}}", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bindAttr alt="view.content.value"}}>'),
    content: {
      value: 'Trololol" onmouseover="alert(\'HAX!\');'
    }
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('alt'), 'Trololol" onmouseover="alert(\'HAX!\');');
});

test("should be able to bind use {{bindAttr}} more than once on an element", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr src="view.content.url"}} {{bindAttr alt="view.content.title"}}>');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equal(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  Ember.run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equal(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  Ember.run(function() {
    set(view, 'content', Ember.Object.createWithMixins({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: Ember.computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equal(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");

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
    view.trigger('keyUp', {});
  });

  equal(view.$().caretPosition(), 5, "The keyUp event should not result in the cursor being reset due to the bindAttr observers");

  Ember.run(function() {
    view.destroy();
  });
});

test("should be able to bind element attributes using {{bindAttr}} inside a block", function() {
  var template = Ember.Handlebars.compile('{{#with view.content}}<img {{bindAttr src="url" alt="title"}}>{{/with}}');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr class="view.foo"}}>');

  view = Ember.View.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equal(view.$('img').attr('class'), 'bar', "renders class");

  Ember.run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind class attribute via a truthy property with {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr class="view.isNumber:is-truthy"}}>');

  view = Ember.View.create({
    template: template,
    isNumber: 5
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name");

  Ember.run(function() {
    set(view, 'isNumber', 0);
  });

  equal(view.$('.is-truthy').length, 0, "removes class name if bound property is set to something non-truthy");
});

test("should be able to bind class to view attribute with {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr class="view.foo"}}>');

  view = Ember.View.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equal(view.$('img').attr('class'), 'bar', "renders class");

  Ember.run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

test("should not allow XSS injection via {{bindAttr}} with class", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img {{bindAttr class="view.foo"}}>'),
    foo: '" onmouseover="alert(\'I am in your classes hacking your app\');'
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('class'), '" onmouseover="alert(\'I am in your classes hacking your app\');');
});

test("should be able to bind class attribute using ternary operator in {{bindAttr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bindAttr class="view.content.isDisabled:disabled:enabled"}} />');
  var content = Ember.Object.create({
    isDisabled: true
  });

  view = Ember.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('img').hasClass('disabled'), 'disabled class is rendered');
  ok(!view.$('img').hasClass('enabled'), 'enabled class is not rendered');

  Ember.run(function() {
    set(content, 'isDisabled', false);
  });

  ok(!view.$('img').hasClass('disabled'), 'disabled class is not rendered');
  ok(view.$('img').hasClass('enabled'), 'enabled class is rendered');
});

test("should be able to add multiple classes using {{bindAttr class}}", function() {
  var template = Ember.Handlebars.compile('<div {{bindAttr class="view.content.isAwesomeSauce view.content.isAlsoCool view.content.isAmazing:amazing :is-super-duper view.content.isEnabled:enabled:disabled"}}></div>');
  var content = Ember.Object.create({
    isAwesomeSauce: true,
    isAlsoCool: true,
    isAmazing: true,
    isEnabled: true
  });

  view = Ember.View.create({
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

  Ember.run(function() {
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

test("should be able to bind classes to globals with {{bindAttr class}}", function() {
  TemplateTests.set('isOpen', true);

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bindAttr class="TemplateTests.isOpen"}}>')
  });

  appendView();

  ok(view.$('img').hasClass('is-open'), "sets classname to the dasherized value of the global property");

  Ember.run(function() {
    TemplateTests.set('isOpen', false);
  });

  ok(!view.$('img').hasClass('is-open'), "removes the classname when the global property has changed");
});

test("should be able to bindAttr to 'this' in an {{#each}} block", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.images}}<img {{bindAttr src="this"}}>{{/each}}'),
    images: Ember.A(['one.png', 'two.jpg', 'three.gif'])
  });

  appendView();

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));
});

test("should be able to bind classes to 'this' in an {{#each}} block with {{bindAttr class}}", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.items}}<li {{bindAttr class="this"}}>Item</li>{{/each}}'),
    items: Ember.A(['a', 'b', 'c'])
  });

  appendView();

  ok(view.$('li').eq(0).hasClass('a'), "sets classname to the value of the first item");
  ok(view.$('li').eq(1).hasClass('b'), "sets classname to the value of the second item");
  ok(view.$('li').eq(2).hasClass('c'), "sets classname to the value of the third item");
});

test("should be able to output a property without binding", function(){
  var context = {
    content: Ember.Object.create({
      anUnboundString: "No spans here, son."
    }),

    anotherUnboundString: "Not here, either."
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile(
      '<div id="first">{{unbound content.anUnboundString}}</div>'+
      '{{#with content}}<div id="second">{{unbound ../anotherUnboundString}}</div>{{/with}}'
    )
  });

  appendView();

  equal(view.$('#first').html(), "No spans here, son.");
  equal(view.$('#second').html(), "Not here, either.");
});

test("should allow standard Handlebars template usage", function() {
  view = Ember.View.create({
    context: { name: "Erik" },
    template: Handlebars.compile("Hello, {{name}}")
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Hello, Erik");
});

test("should be able to use standard Handlebars #each helper", function() {
  view = Ember.View.create({
    context: { items: ['a', 'b', 'c'] },
    template: Handlebars.compile("{{#each items}}{{this}}{{/each}}")
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().html(), "abc");
});

test("should be able to use unbound helper in #each helper", function() {
  view = Ember.View.create({
    items: Ember.A(['a', 'b', 'c', 1, 2, 3]),
    template: Ember.Handlebars.compile(
      "<ul>{{#each view.items}}<li>{{unbound this}}</li>{{/each}}</ul>")
  });

  appendView();

  equal(view.$().text(), "abc123");
  equal(view.$('li').children().length, 0, "No markers");
});

test("should be able to use unbound helper in #each helper (with objects)", function() {
  view = Ember.View.create({
    items: Ember.A([{wham: 'bam'}, {wham: 1}]),
    template: Ember.Handlebars.compile(
      "<ul>{{#each view.items}}<li>{{unbound wham}}</li>{{/each}}</ul>")
  });

  appendView();

  equal(view.$().text(), "bam1");
  equal(view.$('li').children().length, 0, "No markers");
});

test("should work with precompiled templates", function() {
  var templateString = Ember.Handlebars.precompile("{{view.value}}"),
      compiledTemplate = Ember.Handlebars.template(eval('('+templateString+')'));
  view = Ember.View.create({
    value: "rendered",
    template: compiledTemplate
  });

  appendView();

  equal(view.$().text(), "rendered", "the precompiled template was rendered");

  Ember.run(function() { view.set('value', 'updated'); });

  equal(view.$().text(), "updated", "the precompiled template was updated");
});

test("should expose a controller keyword when present on the view", function() {
  var templateString = "{{controller.foo}}{{#view}}{{controller.baz}}{{/view}}";
  view = Ember.View.create({
    controller: Ember.Object.create({
      foo: "bar",
      baz: "bang"
    }),

    template: Ember.Handlebars.compile(templateString)
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equal(view.$().text(), "barbang", "renders values from controller and parent controller");

  var controller = get(view, 'controller');

  Ember.run(function() {
    controller.set('foo', "BAR");
    controller.set('baz', "BLARGH");
  });

  equal(view.$().text(), "BARBLARGH", "updates the DOM when a bound value is updated");

  Ember.run(function() {
    view.destroy();
  });

  view = Ember.View.create({
    controller: "aString",
    template: Ember.Handlebars.compile("{{controller}}")
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "aString", "renders the controller itself if no additional path is specified");
});

test("should expose a controller keyword that can be used in conditionals", function() {
  var templateString = "{{#view}}{{#if controller}}{{controller.foo}}{{/if}}{{/view}}";
  view = Ember.View.create({
    controller: Ember.Object.create({
      foo: "bar"
    }),

    template: Ember.Handlebars.compile(templateString)
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equal(view.$().text(), "bar", "renders values from controller and parent controller");

  Ember.run(function() {
    view.set('controller', null);
  });

  equal(view.$().text(), "", "updates the DOM when the controller is changed");
});

test("should expose a controller keyword that persists through Ember.ContainerView", function() {
  var templateString = "{{view Ember.ContainerView}}";
  view = Ember.View.create({
    controller: Ember.Object.create({
      foo: "bar"
    }),

    template: Ember.Handlebars.compile(templateString)
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  var containerView = get(view, 'childViews.firstObject');
  var viewInstanceToBeInserted = Ember.View.create({
    template: Ember.Handlebars.compile('{{controller.foo}}')
  });

  Ember.run(function() {
    get(containerView, 'childViews').pushObject(viewInstanceToBeInserted);
  });

  equal(viewInstanceToBeInserted.$().text(), "bar", "renders value from parent's controller");
});

test("should expose a view keyword", function() {
  var templateString = '{{#with view.differentContent}}{{view.foo}}{{#view baz="bang"}}{{view.baz}}{{/view}}{{/with}}';
  view = Ember.View.create({
    differentContent: {
      view: {
        foo: "WRONG",
        baz: "WRONG"
      }
    },

    foo: "bar",

    template: Ember.Handlebars.compile(templateString)
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equal(view.$().text(), "barbang", "renders values from view and child view");
});

test("Ember.Button targets should respect keywords", function() {
  Ember.TESTING_DEPRECATION = true;

  try {
    var templateString = '{{#with view.anObject}}{{view Ember.Button target="controller.foo"}}{{/with}}';
    view = Ember.View.create({
      template: Ember.Handlebars.compile(templateString),
      anObject: {},
      controller: {
        foo: "bar"
      }
    });

    Ember.run(function() {
      view.appendTo('#qunit-fixture');
    });

    var button = view.get('childViews').objectAt(0);
    equal(button.get('targetObject'), "bar", "resolves the target");
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("should be able to explicitly set a view's context", function() {
  var context = Ember.Object.create({
    test: 'test'
  });

  TemplateTests.CustomContextView = Ember.View.extend({
    context: context,
    template: Ember.Handlebars.compile("{{test}}")
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view TemplateTests.CustomContextView}}")
  });

  appendView();

  equal(view.$().text(), "test");
});

module("Ember.View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = Ember.Logger.log;
    logCalls = [];
    Ember.Logger.log = function(arg) { logCalls.push(arg); };
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }

    Ember.Logger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

test("should be able to log a property", function(){
  var context = {
    value: 'one',
    valueTwo: 'two',

    content: Ember.Object.create({})
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('{{log value}}{{#with content}}{{log ../valueTwo}}{{/with}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
  equal(logCalls[1], 'two', "should call log with valueTwo");
});

test("should be able to log a view property", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{log view.value}}'),
    value: 'one'
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
});

test("should be able to log `this`", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.items}}{{log this}}{{/each}}'),
    items: Ember.A(['one', 'two'])
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with item one");
  equal(logCalls[1], 'two', "should call log with item two");
});

var MyApp;

module("Templates redrawing and bindings", {
  setup: function(){
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = Ember.Object.create({});
  },
  teardown: function(){
    Ember.run(function() {
      if (view) view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("should be able to update when bound property updates", function(){
  MyApp.set('controller', Ember.Object.create({name: 'first'}));

  var View = Ember.View.extend({
    template: Ember.Handlebars.compile('<i>{{view.value.name}}, {{view.computed}}</i>'),
    valueBinding: 'MyApp.controller',
    computed: Ember.computed(function(){
      return this.get('value.name') + ' - computed';
    }).property('value').volatile()
  });

  Ember.run(function(){
    view = View.create();
  });

  appendView();

  Ember.run(function(){
    MyApp.set('controller', Ember.Object.create({
      name: 'second'
    }));
  });

  equal(view.get('computed'), "second - computed", "view computed properties correctly update");
  equal(view.$('i').text(), 'second, second - computed', "view rerenders when bound properties change");
});

test("properties within an if statement should not fail on re-render", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  appendView();

  equal(view.$().text(), '');

  Ember.run(function(){
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  Ember.run(function(){
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

test("views within an if statement should be sane on re-render", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.display}}{{view Ember.TextField}}{{/if}}'),
    display: false
  });

  appendView();

  equal(view.$('input').length, 0);

  Ember.run(function(){
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in Ember.View.views
  ok(Ember.View.views[textfield.attr('id')]);
});

test("the {{this}} helper should not fail on removal", function(){
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.show}}{{#each view.list}}{{this}}{{/each}}{{/if}}'),
    show: true,
    list: Ember.A(['a', 'b', 'c'])
  });

  appendView();

  equal(view.$().text(), 'abc', "should start property - precond");

  Ember.run(function(){
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

test("bindings should be relative to the current context", function() {
  view = Ember.View.create({
    museumOpen: true,

    museumDetails: Ember.Object.create({
      name: "SFMoMA",
      price: 20
    }),

    museumView: Ember.View.extend({
      template: Ember.Handlebars.compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: Ember.Handlebars.compile('{{#if view.museumOpen}} {{view view.museumView nameBinding="view.museumDetails.name" dollarsBinding="view.museumDetails.price"}} {{/if}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings should respect keywords", function() {
  view = Ember.View.create({
    museumOpen: true,

    controller: {
      museumOpen: true,
      museumDetails: Ember.Object.create({
        name: "SFMoMA",
        price: 20
      })
    },

    museumView: Ember.View.extend({
      template: Ember.Handlebars.compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: Ember.Handlebars.compile('{{#if view.museumOpen}}{{view view.museumView nameBinding="controller.museumDetails.name" dollarsBinding="controller.museumDetails.price"}}{{/if}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings can be 'this', in which case they *are* the current context", function() {
  view = Ember.View.create({
    museumOpen: true,

    museumDetails: Ember.Object.create({
      name: "SFMoMA",
      price: 20,
      museumView: Ember.View.extend({
        template: Ember.Handlebars.compile('Name: {{view.museum.name}} Price: ${{view.museum.price}}')
      })
    }),


    template: Ember.Handlebars.compile('{{#if view.museumOpen}} {{#with view.museumDetails}}{{view museumView museumBinding="this"}} {{/with}}{{/if}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

// https://github.com/emberjs/ember.js/issues/120

test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  expect(0);

  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

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
  // equal(view.$().attr('href'), 'test');

  Ember.run(function() {
    parentView.destroy();
  });

  Ember.run(function() {
    lookup.App.destroy();
  });
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

    equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
  } finally {
   Ember.TEMPLATES = oldTemplates;
  }
});

test("should update bound values after the view is removed and then re-appended", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#if view.showStuff}}{{view.boundValue}}{{else}}Not true.{{/if}}"),
    showStuff: true,
    boundValue: "foo"
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "foo");
  Ember.run(function() {
    set(view, 'showStuff', false);
  });
  equal(Ember.$.trim(view.$().text()), "Not true.");

  Ember.run(function() {
    set(view, 'showStuff', true);
  });
  equal(Ember.$.trim(view.$().text()), "foo");

  Ember.run(function() {
    view.remove();
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
  equal(Ember.$.trim(view.$().text()), "bar");
});

test("should update bound values after view's parent is removed and then re-appended", function() {
  var controller = Ember.Object.create();

  var parentView = Ember.ContainerView.create({
    childViews: ['testView'],

    controller: controller,

    testView: Ember.View.create({
      template: Ember.Handlebars.compile("{{#if showStuff}}{{boundValue}}{{else}}Not true.{{/if}}")
    })
  });

  controller.setProperties({
    showStuff: true,
    boundValue: "foo"
  });

  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });
  view = parentView.get('testView');

  equal(Ember.$.trim(view.$().text()), "foo");
  Ember.run(function() {
    set(controller, 'showStuff', false);
  });
  equal(Ember.$.trim(view.$().text()), "Not true.");

  Ember.run(function() {
    set(controller, 'showStuff', true);
  });
  equal(Ember.$.trim(view.$().text()), "foo");


  Ember.run(function() {
    parentView.remove();
    set(controller, 'showStuff', false);
  });
  Ember.run(function() {
    set(controller, 'showStuff', true);
  });
  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    set(controller, 'boundValue', "bar");
  });
  equal(Ember.$.trim(view.$().text()), "bar");
});

test("should call a registered helper for mustache without parameters", function() {
  Ember.Handlebars.registerHelper('foobar', function() {
    return 'foobar';
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{foobar}}")
  });

  appendView();

  ok(view.$().text() === 'foobar', "Regular helper was invoked correctly");
});

test("should bind to the property if no registered helper found for a mustache without parameters", function() {
  view = Ember.View.createWithMixins({
    template: Ember.Handlebars.compile("{{view.foobarProperty}}"),
    foobarProperty: Ember.computed(function() {
      return 'foobarProperty';
    })
  });

  appendView();

  ok(view.$().text() === 'foobarProperty', "Property was bound to correctly");
});

test("should accept bindings as a string or an Ember.Binding", function() {
  var viewClass = Ember.View.extend({
    template: Ember.Handlebars.compile("binding: {{view.bindingTest}}, string: {{view.stringTest}}")
  });

  Ember.Handlebars.registerHelper('boogie', function(id, options) {
    options.hash = options.hash || {};
    options.hash.bindingTestBinding = Ember.Binding.oneWay('bindingContext.' + id);
    options.hash.stringTestBinding = id;
    return Ember.Handlebars.ViewHelper.helper(this, viewClass, options);
  });

  view = Ember.View.create({
    context: Ember.Object.create({
      direction: 'down'
    }),
    template: Ember.Handlebars.compile("{{boogie direction}}")
  });

  appendView();

  equal(Ember.$.trim(view.$().text()), "binding: down, string: down");
});

test("should teardown observers from bound properties on rerender", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view.foo}}"),
    foo: 'bar'
  });

  appendView();

  equal(Ember.observersFor(view, 'foo').length, 1);

  Ember.run(function() {
    view.rerender();
  });

  equal(Ember.observersFor(view, 'foo').length, 1);
});

test("should teardown observers from bindAttr on rerender", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<span {{bindAttr class="view.foo" name="view.foo"}}>wat</span>'),
    foo: 'bar'
  });

  appendView();

  equal(Ember.observersFor(view, 'foo').length, 2);

  Ember.run(function() {
    view.rerender();
  });

  equal(Ember.observersFor(view, 'foo').length, 2);
});
