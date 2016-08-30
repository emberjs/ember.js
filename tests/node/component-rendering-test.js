var QUnit = require('qunitjs');
var componentModule = require('./helpers/component-module');

componentModule('Components can be rendered without a DOM dependency');

QUnit.test("Simple component", function(assert) {
  var html = this.render('<h1>Hello</h1>');

  assert.ok(html.match(/<h1>Hello<\/h1>/));
});

QUnit.test("Component with dynamic value", function(assert) {
  this.set('location', 'World');

  var html = this.render('<h1>Hello {{location}}</h1>');

  assert.ok(html.match(/<h1>Hello World<\/h1>/));
});

QUnit.test("Ensure undefined attributes requiring protocol sanitization do not error", function(assert) {
  this.owner.register('component:fake-link', this.Ember.Component.extend({
    tagName: 'link',
    attributeBindings: ['href', 'rel'],
    rel: 'canonical'
  }));

  var html = this.render('{{fake-link}}');

  assert.ok(html.match(/rel="canonical"/));
});
