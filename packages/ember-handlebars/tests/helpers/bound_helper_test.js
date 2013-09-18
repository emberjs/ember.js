/*globals TemplateTests*/

var get = Ember.get, set = Ember.set;

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var registerRepeatHelper = function() {
  Ember.Handlebars.helper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count) {
        a.push(value);
    }
    return a.join('');
  });
};

module("Handlebars bound helpers", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should update bound helpers when properties change", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = Ember.View.create({
    controller: Ember.Object.create({name: "Brogrammer"}),
    template: Ember.Handlebars.compile("{{capitalize name}}")
  });

  appendView();

  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");

  Ember.run(function() {
    set(view.controller, 'name', 'wes');
  });

  equal(view.$().text(), 'WES', "helper output updated");
});

test("should allow for computed properties with dependencies", function() {
  Ember.Handlebars.helper('capitalizeName', function(value) {
    return get(value, 'name').toUpperCase();
  }, 'name');

  view = Ember.View.create({
    controller: Ember.Object.create({
      person: Ember.Object.create({
        name: 'Brogrammer'
      })
    }),
    template: Ember.Handlebars.compile("{{capitalizeName person}}")
  });

  appendView();

  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");

  Ember.run(function() {
    set(view.controller.person, 'name', 'wes');
  });

  equal(view.$().text(), 'WES', "helper output updated");
});

test("bound helpers should support options", function() {

  registerRepeatHelper();

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab'}),
    template: Ember.Handlebars.compile("{{repeat text count=3}}")
  });

  appendView();

  ok(view.$().text() === 'ababab', "helper output is correct");
});

test("bound helpers should support keywords", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = Ember.View.create({
    text: 'ab',
    template: Ember.Handlebars.compile("{{capitalize view.text}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helpers should support global paths", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  TemplateTests.text = 'ab';

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{capitalize TemplateTests.text}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helper should support this keyword", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return get(value, 'text').toUpperCase();
  });

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab'}),
    template: Ember.Handlebars.compile("{{capitalize this}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helpers should support bound options", function() {

  registerRepeatHelper();

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab', numRepeats: 3}),
    template: Ember.Handlebars.compile('{{repeat text countBinding="numRepeats"}}')
  });

  appendView();

  equal(view.$().text(), 'ababab', "helper output is correct");

  Ember.run(function() {
    view.set('controller.numRepeats', 4);
  });

  equal(view.$().text(), 'abababab', "helper correctly re-rendered after bound option was changed");

  Ember.run(function() {
    view.set('controller.numRepeats', 2);
    view.set('controller.text', "YES");
  });

  equal(view.$().text(), 'YESYES', "helper correctly re-rendered after both bound option and property changed");
});


test("bound helpers should support multiple bound properties", function() {

  Ember.Handlebars.helper('concat', function() {
    return [].slice.call(arguments, 0, -1).join('');
  });

  view = Ember.View.create({
    controller: Ember.Object.create({thing1: 'ZOID', thing2: 'BERG'}),
    template: Ember.Handlebars.compile('{{concat thing1 thing2}}')
  });

  appendView();

  equal(view.$().text(), 'ZOIDBERG', "helper output is correct");

  Ember.run(function() {
    view.set('controller.thing2', "NERD");
  });

  equal(view.$().text(), 'ZOIDNERD', "helper correctly re-rendered after second bound helper property changed");

  Ember.run(function() {
    view.controller.setProperties({
      thing1: "WOOT",
      thing2: "YEAH"
    });
  });

  equal(view.$().text(), 'WOOTYEAH', "helper correctly re-rendered after both bound helper properties changed");
});

test("bound helpers should expose property names in options.data.properties", function() {
  Ember.Handlebars.helper('echo', function() {
    var options = arguments[arguments.length - 1];
    var values = [].slice.call(arguments, 0, -1);
    var a = [];
    for(var i = 0; i < values.length; ++i) {
      var propertyName = options.data.properties[i];
      a.push(propertyName);
    }
    return a.join(' ');
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      thing1: 'ZOID',
      thing2: 'BERG',
      thing3: Ember.Object.create({
        foo: 123
      })
    }),
    template: Ember.Handlebars.compile('{{echo thing1 thing2 thing3.foo}}')
  });

  appendView();

  equal(view.$().text(), 'thing1 thing2 thing3.foo', "helper output is correct");
});

test("bound helpers can be invoked with zero args", function() {
  Ember.Handlebars.helper('troll', function(options) {
    return options.hash.text || "TROLOLOL";
  });

  view = Ember.View.create({
    controller: Ember.Object.create({trollText: "yumad"}),
    template: Ember.Handlebars.compile('{{troll}} and {{troll text="bork"}}')
  });

  appendView();

  equal(view.$().text(), 'TROLOLOL and bork', "helper output is correct");
});

test("bound helpers should not be invoked with blocks", function() {
  registerRepeatHelper();
  view = Ember.View.create({
    controller: Ember.Object.create({}),
    template: Ember.Handlebars.compile("{{#repeat}}Sorry, Charlie{{/repeat}}")
  });

  expectAssertion(function() {
    appendView();
  }, /registerBoundHelper-generated helpers do not support use with Handlebars blocks/i);
});

test("should observe dependent keys passed to registerBoundHelper", function() {
  try {
    expect(2);

    var SimplyObject = Ember.Object.create({
      firstName: 'Jim',
      lastName: 'Owen'
    });

    Ember.Handlebars.registerBoundHelper('fullName', function(value){
      return value.get('firstName') + ' ' + value.get('lastName');
    }, 'firstName', 'lastName');

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{fullName this}}'),
      context: SimplyObject
    });
    appendView(view);

    equal(view.$().text(), 'Jim Owen', 'simply render the helper');

    Ember.run(SimplyObject, SimplyObject.set, 'firstName', 'Tom');

    equal(view.$().text(), 'Tom Owen', 'simply render the helper');
  } finally {
    delete Ember.Handlebars.helpers['fullName'];
  }
});

test("shouldn't treat raw numbers as bound paths", function() {
  Ember.Handlebars.helper('sum', function(a, b) {
    return a + b;
  });

  view = Ember.View.create({
    controller: Ember.Object.create({aNumber: 1}),
    template: Ember.Handlebars.compile("{{sum aNumber 1}} {{sum 0 aNumber}} {{sum 5 6}}")
  });

  appendView();

  equal(view.$().text(), '2 1 11', "helper output is correct");

  Ember.run(view.controller, 'set', 'aNumber', 5);

  equal(view.$().text(), '6 5 11', "helper still updates as expected");
});

test("shouldn't treat quoted strings as bound paths", function() {
  var helperCount = 0;
  Ember.Handlebars.helper('concat', function(a, b, opt) {
    helperCount++;
    return a + b;
  });

  view = Ember.View.create({
    controller: Ember.Object.create({word: "jerkwater", loo: "unused"}),
    template: Ember.Handlebars.compile("{{concat word 'loo'}} {{concat '' word}} {{concat 'will' \"didi\"}}")
  });

  appendView();

  equal(view.$().text(), 'jerkwaterloo jerkwater willdidi', "helper output is correct");

  Ember.run(view.controller, 'set', 'word', 'bird');
  equal(view.$().text(), 'birdloo bird willdidi', "helper still updates as expected");

  Ember.run(view.controller, 'set', 'loo', 'soup-de-doo');
  equal(view.$().text(), 'birdloo bird willdidi', "helper still updates as expected");
  equal(helperCount, 5, "changing controller property with same name as quoted string doesn't re-render helper");
});

test("bound helpers can handle nulls in array (with primitives)", function() {
  Ember.Handlebars.helper('reverse', function(val) {
    return val ? val.split('').reverse().join('') : "NOPE";
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      things: Ember.A([ null, 0, undefined, false, "OMG" ])
    }),
    template: Ember.Handlebars.compile("{{#each things}}{{this}}|{{reverse this}} {{/each}}{{#each thing in things}}{{thing}}|{{reverse thing}} {{/each}}")
  });

  appendView();

  equal(view.$().text(), '|NOPE 0|NOPE |NOPE false|NOPE OMG|GMO |NOPE 0|NOPE |NOPE false|NOPE OMG|GMO ', "helper output is correct");

  Ember.run(function() {
    view.controller.things.pushObject('blorg');
    view.controller.things.shiftObject();
  });

  equal(view.$().text(), '0|NOPE |NOPE false|NOPE OMG|GMO blorg|grolb 0|NOPE |NOPE false|NOPE OMG|GMO blorg|grolb ', "helper output is still correct");
});

test("bound helpers can handle nulls in array (with objects)", function() {
  Ember.Handlebars.helper('print-foo', function(val) {
    return val ? Ember.get(val, 'foo') : "NOPE";
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      things: Ember.A([ null, { foo: 5 } ])
    }),
    template: Ember.Handlebars.compile("{{#each things}}{{foo}}|{{print-foo this}} {{/each}}{{#each thing in things}}{{thing.foo}}|{{print-foo thing}} {{/each}}")
  });

  appendView();

  equal(view.$().text(), '|NOPE 5|5 |NOPE 5|5 ', "helper output is correct");

  Ember.run(view.controller.things, 'pushObject', { foo: 6 });

  equal(view.$().text(), '|NOPE 5|5 6|6 |NOPE 5|5 6|6 ', "helper output is correct");
});

test("bound helpers can handle `this` keyword when it's a non-object", function() {

  Ember.Handlebars.helper("shout", function(value) {
    return value + '!';
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      things: Ember.A(['alex'])
    }),
    template: Ember.Handlebars.compile("{{#each things}}{{debugger}}{{shout this}}{{/each}}")
  });

  appendView();

  equal(view.$().text(), 'alex!', "helper output is correct");

  Ember.run(view.controller.things, 'shiftObject');
  equal(view.$().text(), '', "helper output is correct");

  Ember.run(view.controller.things, 'pushObject', 'wallace');
  equal(view.$().text(), 'wallace!', "helper output is correct");
});


