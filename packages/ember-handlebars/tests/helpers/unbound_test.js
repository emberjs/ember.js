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


module("Handlebars {{#unbound boundHelper arg1 arg2... argN}} form: render unbound helper invocations", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

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

test("should unshift the `types` property so helper don't need to detect whether it's unbound or not", function () {
  var SmileyFaceView = Ember._MetamorphView.extend({
    init: function () {
      this._super();
      this.addObserver('smiley', this, this.rerender);
    },

    render: function (buffer) {
      var smiley;

      switch (get(this, 'smiley')) {
      case 'awesome':
        smiley = ':D';
        break;
      case 'wtf':
        smiley = 'ಠ_ಠ';
        break;
      default:
        smiley = ':)';
      }

      buffer.push(smiley);
    }
  });

  Ember.Handlebars.registerHelper('smiley', function (type, options) {
    var hash    = options.hash,
        context = this;

    if (options.types[0] === 'ID') {
      if (!options.data.isUnbound) {
        hash.smileyBinding = type;
      }
      hash.smiley = get(context, type);
    }
    equal(options.types.length, 1, 'options.types should be length 1 independent of whether the helper is unbound or not');

    Ember.Handlebars.helpers.view.call(context, SmileyFaceView, options);
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile("Ember is {{unbound smiley 'awesome'}}. Tom's feeling {{smiley feeling}}"),
    context: Ember.Object.create({
      feeling: 'happy'
    })
  });
  appendView(view);

  equal(view.$().text(), "Ember is :D. Tom's feeling :)");
  Ember.run(function() {
    set(view, 'context.feeling', 'wtf');
  });

  equal(view.$().text(), "Ember is :D. Tom's feeling ಠ_ಠ");
});
