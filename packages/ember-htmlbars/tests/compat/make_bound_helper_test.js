/*jshint newcap:false*/
import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import { A } from "ember-runtime/system/native_array";

// import {expectAssertion} from "ember-metal/tests/debug_helpers";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

import EmberHandlebars from "ember-htmlbars/compat";

var compile, helpers, helper;
compile = EmberHandlebars.compile;
helpers = EmberHandlebars.helpers;
helper = EmberHandlebars.helper;

var view;

var originalLookup = Ember.lookup;

function appendView() {
  run(function() { view.appendTo('#qunit-fixture'); });
}

function registerRepeatHelper() {
  helper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count) {
        a.push(value);
    }
    return a.join('');
  });
}

QUnit.module("ember-htmlbars: makeBoundHelper", {
  setup: function() {
  },
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
    });
    Ember.lookup = originalLookup;
  }
});

test("primitives should work correctly [DEPRECATED]", function() {
  expectDeprecation('Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');
  expectDeprecation('Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  view = EmberView.create({
    prims: Ember.A(["string", 12]),

    template: compile('{{#each view.prims}}{{#if this}}inside-if{{/if}}{{#with this}}inside-with{{/with}}{{/each}}')
  });

  appendView(view);

  equal(view.$().text(), 'inside-ifinside-withinside-ifinside-with');
});

test("should update bound helpers when properties change", function() {
  helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = EmberView.create({
    controller: EmberObject.create({name: "Brogrammer"}),
    template: compile("{{capitalize name}}")
  });

  appendView();

  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");

  run(function() {
    set(view.controller, 'name', 'wes');
  });

  equal(view.$().text(), 'WES', "helper output updated");
});

test("should allow for computed properties with dependencies", function() {
  helper('capitalizeName', function(value) {
    return get(value, 'name').toUpperCase();
  }, 'name');

  view = EmberView.create({
    controller: EmberObject.create({
      person: EmberObject.create({
        name: 'Brogrammer'
      })
    }),
    template: compile("{{capitalizeName person}}")
  });

  appendView();

  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");

  run(function() {
    set(view.controller.person, 'name', 'wes');
  });

  equal(view.$().text(), 'WES', "helper output updated");
});

test("bound helpers should support options", function() {

  registerRepeatHelper();

  view = EmberView.create({
    controller: EmberObject.create({text: 'ab'}),
    template: compile("{{repeat text count=3}}")
  });

  appendView();

  equal(view.$().text(), 'ababab', "helper output is correct");
});

test("bound helpers should support keywords", function() {
  helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = EmberView.create({
    text: 'ab',
    template: compile("{{capitalize view.text}}")
  });

  appendView();

  equal(view.$().text(), 'AB', "helper output is correct");
});

test("bound helpers should support global paths [DEPRECATED]", function() {
  helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  Ember.lookup = {Text: 'ab'};

  view = EmberView.create({
    template: compile("{{capitalize Text}}")
  });

  expectDeprecation(function() {
    appendView();
  }, /Global lookup of Text from a Handlebars template is deprecated/);

  equal(view.$().text(), 'AB', "helper output is correct");
});

test("bound helper should support this keyword", function() {
  helper('capitalize', function(value) {
    return get(value, 'text').toUpperCase();
  });

  view = EmberView.create({
    controller: EmberObject.create({text: 'ab'}),
    template: compile("{{capitalize this}}")
  });

  appendView();

  equal(view.$().text(), 'AB', "helper output is correct");
});

test("bound helpers should support bound options", function() {

  registerRepeatHelper();

  view = EmberView.create({
    controller: EmberObject.create({text: 'ab', numRepeats: 3}),
    template: compile('{{repeat text countBinding="numRepeats"}}')
  });

  appendView();

  equal(view.$().text(), 'ababab', "helper output is correct");

  run(function() {
    view.set('controller.numRepeats', 4);
  });

  equal(view.$().text(), 'abababab', "helper correctly re-rendered after bound option was changed");

  run(function() {
    view.set('controller.numRepeats', 2);
    view.set('controller.text', "YES");
  });

  equal(view.$().text(), 'YESYES', "helper correctly re-rendered after both bound option and property changed");
});

test("bound helpers should support unquoted values as bound options", function() {

  registerRepeatHelper();

  view = EmberView.create({
    controller: EmberObject.create({text: 'ab', numRepeats: 3}),
    template: compile('{{repeat text count=numRepeats}}')
  });

  appendView();

  equal(view.$().text(), 'ababab', "helper output is correct");

  run(function() {
    view.set('controller.numRepeats', 4);
  });

  equal(view.$().text(), 'abababab', "helper correctly re-rendered after bound option was changed");

  run(function() {
    view.set('controller.numRepeats', 2);
    view.set('controller.text', "YES");
  });

  equal(view.$().text(), 'YESYES', "helper correctly re-rendered after both bound option and property changed");
});


test("bound helpers should support multiple bound properties", function() {

  helper('combine', function() {
    return [].slice.call(arguments, 0, -1).join('');
  });

  view = EmberView.create({
    controller: EmberObject.create({thing1: 'ZOID', thing2: 'BERG'}),
    template: compile('{{combine thing1 thing2}}')
  });

  appendView();

  equal(view.$().text(), 'ZOIDBERG', "helper output is correct");

  run(function() {
    view.set('controller.thing2', "NERD");
  });

  equal(view.$().text(), 'ZOIDNERD', "helper correctly re-rendered after second bound helper property changed");

  run(function() {
    view.controller.setProperties({
      thing1: "WOOT",
      thing2: "YEAH"
    });
  });

  equal(view.$().text(), 'WOOTYEAH', "helper correctly re-rendered after both bound helper properties changed");
});

test("bound helpers should expose property names in options.data.properties", function() {
  helper('echo', function() {
    var options = arguments[arguments.length - 1];
    var values = [].slice.call(arguments, 0, -1);
    var a = [];
    for(var i = 0; i < values.length; ++i) {
      var propertyName = options.data.properties[i];
      a.push(propertyName);
    }
    return a.join(' ');
  });

  view = EmberView.create({
    controller: EmberObject.create({
      thing1: 'ZOID',
      thing2: 'BERG',
      thing3: EmberObject.create({
        foo: 123
      })
    }),
    template: compile('{{echo thing1 thing2 thing3.foo}}')
  });

  appendView();

  equal(view.$().text(), 'thing1 thing2 thing3.foo', "helper output is correct");
});

test("bound helpers can be invoked with zero args", function() {
  helper('troll', function(options) {
    return options.hash.text || "TROLOLOL";
  });

  view = EmberView.create({
    controller: EmberObject.create({trollText: "yumad"}),
    template: compile('{{troll}} and {{troll text="bork"}}')
  });

  appendView();

  equal(view.$().text(), 'TROLOLOL and bork', "helper output is correct");
});

test("bound helpers should not be invoked with blocks", function() {
  registerRepeatHelper();
  view = EmberView.create({
    controller: EmberObject.create({}),
    template: compile("{{#repeat}}Sorry, Charlie{{/repeat}}")
  });

  expectAssertion(function() {
    appendView();
  }, /registerBoundHelper-generated helpers do not support use with Handlebars blocks/i);
});

test("should observe dependent keys passed to registerBoundHelper", function() {
  try {
    expect(3);

    var simplyObject = EmberObject.create({
      firstName: 'Jim',
      lastName: 'Owen',
      birthday: EmberObject.create({
        year: '2009'
      })
    });

    helper('fullName', function(value){
      return [
        value.get('firstName'),
        value.get('lastName'),
        value.get('birthday.year') ].join(' ');
    }, 'firstName', 'lastName', 'birthday.year');

    view = EmberView.create({
      template: compile('{{fullName this}}'),
      context: simplyObject
    });
    appendView(view);

    equal(view.$().text(), 'Jim Owen 2009', 'simply render the helper');

    run(simplyObject, simplyObject.set, 'firstName', 'Tom');

    equal(view.$().text(), 'Tom Owen 2009', 'render the helper after prop change');

    run(simplyObject, simplyObject.set, 'birthday.year', '1692');

    equal(view.$().text(), 'Tom Owen 1692', 'render the helper after path change');
  } finally {
    delete helpers['fullName'];
  }
});

test("shouldn't treat raw numbers as bound paths", function() {
  helper('sum', function(a, b) {
    return a + b;
  });

  view = EmberView.create({
    controller: EmberObject.create({aNumber: 1}),
    template: compile("{{sum aNumber 1}} {{sum 0 aNumber}} {{sum 5 6}}")
  });

  appendView();

  equal(view.$().text(), '2 1 11', "helper output is correct");

  run(view.controller, 'set', 'aNumber', 5);

  equal(view.$().text(), '6 5 11', "helper still updates as expected");
});

test("shouldn't treat quoted strings as bound paths", function() {
  var helperCount = 0;
  helper('combine', function(a, b, opt) {
    helperCount++;
    return a + b;
  });

  view = EmberView.create({
    controller: EmberObject.create({word: "jerkwater", loo: "unused"}),
    template: compile("{{combine word 'loo'}} {{combine '' word}} {{combine 'will' \"didi\"}}")
  });

  appendView();

  equal(view.$().text(), 'jerkwaterloo jerkwater willdidi', "helper output is correct");

  run(view.controller, 'set', 'word', 'bird');
  equal(view.$().text(), 'birdloo bird willdidi', "helper still updates as expected");

  run(view.controller, 'set', 'loo', 'soup-de-doo');
  equal(view.$().text(), 'birdloo bird willdidi', "helper still updates as expected");
  equal(helperCount, 5, "changing controller property with same name as quoted string doesn't re-render helper");
});

test("bound helpers can handle nulls in array (with primitives) [DEPRECATED]", function() {
  helper('reverse', function(val) {
    return val ? val.split('').reverse().join('') : "NOPE";
  });

  view = EmberView.create({
    controller: EmberObject.create({
      things: A([ null, 0, undefined, false, "OMG" ])
    }),
    template: compile("{{#each things}}{{this}}|{{reverse this}} {{/each}}{{#each thing in things}}{{thing}}|{{reverse thing}} {{/each}}")
  });

  expectDeprecation(function() {
    appendView();
  }, 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$().text(), '|NOPE 0|NOPE |NOPE false|NOPE OMG|GMO |NOPE 0|NOPE |NOPE false|NOPE OMG|GMO ', "helper output is correct");

  run(function() {
    view.controller.things.pushObject('blorg');
    view.controller.things.shiftObject();
  });

  equal(view.$().text(), '0|NOPE |NOPE false|NOPE OMG|GMO blorg|grolb 0|NOPE |NOPE false|NOPE OMG|GMO blorg|grolb ', "helper output is still correct");
});

test("bound helpers can handle nulls in array (with objects)", function() {
  helper('print-foo', function(val) {
    return val ? get(val, 'foo') : "NOPE";
  });

  view = EmberView.create({
    controller: EmberObject.create({
      things: A([ null, { foo: 5 } ])
    }),
    template: compile("{{#each things}}{{foo}}|{{print-foo this}} {{/each}}{{#each thing in things}}{{thing.foo}}|{{print-foo thing}} {{/each}}")
  });

  expectDeprecation(function() {
    appendView();
  }, 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$().text(), '|NOPE 5|5 |NOPE 5|5 ', "helper output is correct");

  run(view.controller.things, 'pushObject', { foo: 6 });

  equal(view.$().text(), '|NOPE 5|5 6|6 |NOPE 5|5 6|6 ', "helper output is correct");
});

test("bound helpers can handle `this` keyword when it's a non-object", function() {

  helper("shout", function(value) {
    return value + '!';
  });

  view = EmberView.create({
    context: 'alex',
    template: compile("{{shout this}}")
  });

  appendView();

  equal(view.$().text(), 'alex!', "helper output is correct");

  run(function() {
    set(view, 'context', '');
  });

  equal(view.$().text(), '!', "helper output is correct");

  run(function() {
    set(view, 'context', 'wallace');
  });

  equal(view.$().text(), 'wallace!', "helper output is correct");
});

test("should have correct argument types", function() {
  helper('getType', function(value) {
    return typeof value;
  });

  view = EmberView.create({
    controller: EmberObject.create(),
    template: compile('{{getType null}}, {{getType undefProp}}, {{getType "string"}}, {{getType 1}}, {{getType}}')
  });

  appendView();

  equal(view.$().text(), 'undefined, undefined, string, number, object', "helper output is correct");
});
