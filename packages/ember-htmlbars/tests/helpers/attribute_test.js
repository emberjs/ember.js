import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import { compile } from "htmlbars-compiler/compiler";
import { equalInnerHTML } from "htmlbars-test-helpers";
import { defaultEnv } from "ember-htmlbars";

var view, originalSetAttribute, setAttributeCalls;
var dom = defaultEnv.dom;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  QUnit.module("ember-htmlbars: attribute", {
    teardown: function(){
      if (view) {
        run(view, view.destroy);
      }
    }
  });

  test("property is output", function() {
    view = EmberView.create({
      context: {name: 'erik'},
      template: compile("<div data-name={{name}}>Hi!</div>")
    });
    appendView(view);

    equalInnerHTML(view.element, '<div data-name="erik">Hi!</div>', "attribute is output");
  });

  test("property value is directly added to attribute", function() {
    view = EmberView.create({
      context: {name: '"" data-foo="blah"'},
      template: compile("<div data-name={{name}}>Hi!</div>")
    });
    appendView(view);

    equalInnerHTML(view.element, '<div data-name="&quot;&quot; data-foo=&quot;blah&quot;">Hi!</div>', "attribute is output");
  });

  test("path is output", function() {
    view = EmberView.create({
      context: {name: {firstName: 'erik'}},
      template: compile("<div data-name={{name.firstName}}>Hi!</div>")
    });
    appendView(view);

    equalInnerHTML(view.element, '<div data-name="erik">Hi!</div>', "attribute is output");
  });

  test("changed property updates", function() {
    var context = EmberObject.create({name: 'erik'});
    view = EmberView.create({
      context: context,
      template: compile("<div data-name={{name}}>Hi!</div>")
    });
    appendView(view);

    equalInnerHTML(view.element, '<div data-name="erik">Hi!</div>', "precond - attribute is output");

    run(context, context.set, 'name', 'mmun');

    equalInnerHTML(view.element, '<div data-name="mmun">Hi!</div>', "attribute is updated output");
  });

  test("updates are scheduled in the render queue", function() {
    expect(4);

    var context = EmberObject.create({name: 'erik'});
    view = EmberView.create({
      context: context,
      template: compile("<div data-name={{name}}>Hi!</div>")
    });
    appendView(view);

    equalInnerHTML(view.element, '<div data-name="erik">Hi!</div>', "precond - attribute is output");

    run(function() {
      run.schedule('render', function() { 
        equalInnerHTML(view.element, '<div data-name="erik">Hi!</div>', "precond - attribute is not updated sync");
      });

      context.set('name', 'mmun');

      run.schedule('render', function() {
        equalInnerHTML(view.element, '<div data-name="mmun">Hi!</div>', "attribute is updated output");
      });
    });

    equalInnerHTML(view.element, '<div data-name="mmun">Hi!</div>', "attribute is updated output");
  });

  QUnit.module('ember-htmlbars: {{attribute}} helper -- setAttribute', {
    setup: function() {
      originalSetAttribute = dom.setAttribute;
      dom.setAttribute = function(element, name, value) {
        setAttributeCalls.push([name, value]);

        originalSetAttribute.call(dom, element, name, value);
      };

      setAttributeCalls = [];
    },

    teardown: function() {
      dom.setAttribute = originalSetAttribute;

      if (view) {
        run(view, view.destroy);
      }
    }
  });

  test('calls setAttribute for new values', function() {
    var context = EmberObject.create({name: 'erik'});
    view = EmberView.create({
      context: context,
      template: compile("<div data-name={{name}}>Hi!</div>")
    });
    appendView(view);

    run(context, context.set, 'name', 'mmun');

    var expected = [
      ['data-name', 'erik'],
      ['data-name', 'mmun']
    ];

    deepEqual(setAttributeCalls, expected);
  });

  test('does not call setAttribute if the same value is set', function() {
    var context = EmberObject.create({name: 'erik'});
    view = EmberView.create({
      context: context,
      template: compile("<div data-name={{name}}>Hi!</div>")
    });
    appendView(view);

    run(function() {
      context.set('name', 'mmun');
      context.set('name', 'erik');
    });

    var expected = [
      ['data-name', 'erik']
    ];

    deepEqual(setAttributeCalls, expected);
  });
}
