const setupComponentTest = require('./helpers/setup-component');

QUnit.module('Components can be rendered without a DOM dependency', function(hooks) {
  setupComponentTest(hooks);

  QUnit.test('Simple component', function(assert) {
    let html = this.render('<h1>Hello</h1>');

    assert.ok(html.match(/<h1>Hello<\/h1>/));
  });

  QUnit.test('Component with dynamic value', function(assert) {
    this.set('location', 'World');

    let html = this.render('<h1>Hello {{location}}</h1>');

    assert.ok(html.match(/<h1>Hello World<\/h1>/));
  });

  QUnit.test('Ensure undefined attributes requiring protocol sanitization do not error', function(
    assert
  ) {
    this.owner.register(
      'component:fake-link',
      this.Ember.Component.extend({
        tagName: 'link',
        attributeBindings: ['href', 'rel'],
        rel: 'canonical',
      })
    );

    let html = this.render('{{fake-link}}');

    assert.ok(html.match(/rel="canonical"/));
  });
});
