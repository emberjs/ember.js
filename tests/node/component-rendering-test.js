/*globals global,__dirname*/

var QUnit = require('qunitjs');
var SimpleDOM = require('simple-dom');
var path = require('path');

var distPath = path.join(__dirname, '../../dist');
var emberPath = path.join(distPath, 'ember.debug.js');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var Ember, DOMHelper, run;

var precompile = require(templateCompilerPath).precompile;
var compile = function(templateString, options) {
  var templateSpec = precompile(templateString, options);
  var template = new Function('return ' + templateSpec)();

  return Ember.HTMLBars.template(template);
};

QUnit.module("Components can be rendered without a DOM dependency", {
  beforeEach: function() {
    Ember = require(emberPath);
    DOMHelper = Ember.HTMLBars.DOMHelper;
    run = Ember.run;
  },

  afterEach: function() {
    // delete global.Ember;

    // // clear the previously cached version of this module
    // delete require.cache[emberPath + '.js'];
    // delete require.cache[templateCompilerPath + '.js'];
  }
});

QUnit.test("Simple component", function(assert) {
  var component = buildComponent("<h1>Hello</h1>");
  var html = renderComponent(component);

  assert.ok(html.match(/<h1>Hello<\/h1>/));
});

QUnit.test("Component with dynamic value", function(assert) {
  var component = buildComponent('<h1>Hello {{location}}</h1>', {
    location: "World"
  });

  var html = renderComponent(component);

  assert.ok(html.match(/<h1>Hello World<\/h1>/));
});

QUnit.test("Ensure undefined attributes requiring protocol sanitization do not error", function(assert) {
  var component = buildComponent('', {
    tagName: 'link',
    attributeBindings: ['href', 'rel'],
    rel: 'canonical'
  });

  var html = renderComponent(component);
  assert.ok(html.match(/rel="canonical"/));
});

function buildComponent(template, props) {
  var Component = Ember.Component.extend({
    renderer: new Ember._Renderer(new DOMHelper(new SimpleDOM.Document())),
    layout: compile(template)
  }, props || {});

  return Component.create({
    _domHelper: new DOMHelper(new SimpleDOM.Document()),
  });
}

function renderComponent(component) {
  var element;

  run(function() {
    element = component.renderToElement();
  });

  var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
  return serializer.serialize(element);
}
