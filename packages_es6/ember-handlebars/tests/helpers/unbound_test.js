/*globals Foo */

var get = Ember.get, set = Ember.set;

var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var view;
var originalLookup = Ember.lookup, lookup;

module("Handlebars {{#unbound}} helper -- classic single-property usage", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{unbound foo}} {{unbound bar}}"),
      context: Ember.Object.create({
        foo: "BORK",
        barBinding: 'foo'
      })
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("it should render the current value of a property on the context", function() {
  equal(view.$().text(), "BORK BORK", "should render the current value of a property");
});

test("it should not re-render if the property changes", function() {
  Ember.run(function() {
    view.set('context.foo', 'OOF');
  });
  equal(view.$().text(), "BORK BORK", "should not re-render if the property changes");
});

test("it should throw the helper missing error if multiple properties are provided", function() {
  throws(function() {
      appendView(Ember.View.create({
        template: Ember.Handlebars.compile('{{unbound foo bar}}'),
        context: Ember.Object.create({
          foo: "BORK",
          bar: 'foo'
        })
      }));
    }, Ember.Error);
});

module("Handlebars {{#unbound boundHelper arg1 arg2... argN}} form: render unbound helper invocations", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    Ember.Handlebars.registerBoundHelper('surround', function(prefix, value, suffix) {
      return prefix + '-' + value + '-' + suffix;
    });

    Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
      return value.toUpperCase();
    });

    Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
      return get(value, 'firstName').toUpperCase();
    }, 'firstName');

    Ember.Handlebars.registerBoundHelper('concat', function(value) {
      return [].slice.call(arguments, 0, -1).join('');
    });

    Ember.Handlebars.registerBoundHelper('concatNames', function(value) {
      return get(value, 'firstName') + get(value, 'lastName');
    }, 'firstName', 'lastName');
  },

  teardown: function() {
    delete Ember.Handlebars.helpers['surround'];
    delete Ember.Handlebars.helpers['capitalize'];
    delete Ember.Handlebars.helpers['capitalizeName'];
    delete Ember.Handlebars.helpers['concat'];
    delete Ember.Handlebars.helpers['concatNames'];

    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});


test("should be able to render an unbound helper invocation", function() {
  try {
    Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
      var count = options.hash.count;
      var a = [];
      while(a.length < count) {
          a.push(value);
      }
      return a.join('');
    });

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{unbound repeat foo countBinding="bar"}} {{repeat foo countBinding="bar"}} {{unbound repeat foo count=2}} {{repeat foo count=4}}'),
      context: Ember.Object.create({
        foo: "X",
        numRepeatsBinding: "bar",
        bar: 5
      })
    });
    appendView(view);

    equal(view.$().text(), "XXXXX XXXXX XX XXXX", "first render is correct");

    Ember.run(function() {
      set(view, 'context.bar', 1);
    });

    equal(view.$().text(), "XXXXX X XX XXXX", "only unbound bound options changed");
  } finally {
    delete Ember.Handlebars.helpers['repeat'];
  }
});

test("should be able to render an bound helper invocation mixed with static values", function() {
  view = Ember.View.create({
      template: Ember.Handlebars.compile('{{unbound surround prefix value "bar"}} {{surround prefix value "bar"}} {{unbound surround "bar" value suffix}} {{surround "bar" value suffix}}'),
      context: Ember.Object.create({
        prefix: "before",
        value: "core",
        suffix: "after"
      })
    });
  appendView(view);

  equal(view.$().text(), "before-core-bar before-core-bar bar-core-after bar-core-after", "first render is correct");
  Ember.run(function() {
    set(view, 'context.prefix', 'beforeChanged');
    set(view, 'context.value', 'coreChanged');
    set(view, 'context.suffix', 'afterChanged');
  });
  equal(view.$().text(), "before-core-bar beforeChanged-coreChanged-bar bar-core-after bar-coreChanged-afterChanged", "only bound values change");
});

test("should be able to render unbound forms of multi-arg helpers", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{concat foo bar bing}} {{unbound concat foo bar bing}}"),
    context: Ember.Object.create({
      foo: "a",
      bar: "b",
      bing: "c"
    })
  });
  appendView(view);

  equal(view.$().text(), "abc abc", "first render is correct");

  Ember.run(function() {
    set(view, 'context.bar', 'X');
  });

  equal(view.$().text(), "aXc abc", "unbound helpers/properties stayed the same");
});


test("should be able to render an unbound helper invocation for helpers with dependent keys", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{capitalizeName person}} {{unbound capitalizeName person}} {{concatNames person}} {{unbound concatNames person}}"),
    context: Ember.Object.create({
      person: Ember.Object.create({
        firstName: 'shooby',
        lastName:  'taylor'
      })
    })
  });
  appendView(view);

  equal(view.$().text(), "SHOOBY SHOOBY shoobytaylor shoobytaylor", "first render is correct");

  Ember.run(function() {
    set(view, 'context.person.firstName', 'sally');
  });

  equal(view.$().text(), "SALLY SHOOBY sallytaylor shoobytaylor", "only bound values change");
});


test("should be able to render an unbound helper invocation in #each helper", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      [ "{{#each person in people}}",
        "{{capitalize person.firstName}} {{unbound capitalize person.firstName}}",
        "{{/each}}"].join("")),
    context: {
      people: Ember.A([
        {
          firstName: 'shooby',
          lastName:  'taylor'
        },
        {
          firstName: 'cindy',
          lastName:  'taylor'
        }
    ])}
  });
  appendView(view);

  equal(view.$().text(), "SHOOBY SHOOBYCINDY CINDY", "unbound rendered correctly");
});


test("should be able to render an unbound helper invocation with bound hash options", function() {
  try {
    Ember.Handlebars.registerBoundHelper('repeat', function(value) {
      return [].slice.call(arguments, 0, -1).join('');
    });


    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{capitalizeName person}} {{unbound capitalizeName person}} {{concatNames person}} {{unbound concatNames person}}"),
      context: Ember.Object.create({
        person: Ember.Object.create({
          firstName: 'shooby',
          lastName:  'taylor'
        })
      })
    });
    appendView(view);

    equal(view.$().text(), "SHOOBY SHOOBY shoobytaylor shoobytaylor", "first render is correct");

    Ember.run(function() {
      set(view, 'context.person.firstName', 'sally');
    });

    equal(view.$().text(), "SALLY SHOOBY sallytaylor shoobytaylor", "only bound values change");
  } finally {
    delete Ember.Handlebars.registerBoundHelper['repeat'];
  }
});

