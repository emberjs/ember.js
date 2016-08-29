/*jshint multistr:true*/
var QUnit = require('qunitjs');
var appModule = require('./helpers/app-module');
var assertHTMLMatches = require('./helpers/assert-html-matches');

appModule("App Boot");

// Because running these tests relies on certain feature flags being
// enabled, we check to see if those flags are on before registering
// the tests. Once all feature flags are on by default we can remove
// this conditional.
if (appModule.canRunTests) {
  QUnit.test("App boots and routes to a URL", function(assert) {
    this.visit('/');
    assert.ok(this.app);
  });

  QUnit.test("nested {{component}}", function(assert) {
    this.template('index', "{{root-component}}");

    this.template('components/root-component', "\
      <h1>Hello {{#if hasExistence}}{{location}}{{/if}}</h1>\
      <div>{{component 'foo-bar'}}</div>\
    ");

    this.component('root-component', {
      location: "World",
      hasExistence: true
    });

    this.template('components/foo-bar', "\
      <p>The files are *inside* the computer?!</p>\
    ");

    return this.renderToHTML('/').then(function(html) {
      assertHTMLMatches(html, '<body><div id="EMBER_ID" class="ember-view"><div id="EMBER_ID" class="ember-view"><h1>Hello World</h1><div><div id="EMBER_ID" class="ember-view"><p>The files are *inside* the computer?!</p></div></div></div></div></body>');
    });
  });

  QUnit.test("{{link-to}}", function(assert) {
    this.template('application', "<h1>{{#link-to 'photos'}}Go to photos{{/link-to}}</h1>");
    this.routes(function() {
      this.route('photos');
    });

    return this.renderToHTML('/').then(function(html) {
      assertHTMLMatches(html, '<body><div id="EMBER_ID" class="ember-view"><h1><a id="EMBER_ID" href="/photos" class="ember-view">Go to photos</a><\/h1></div></body>');
    });
  });

  QUnit.test("non-escaped content", function(assert) {
    this.routes(function() {
      this.route('photos');
    });

    this.template('application', "<h1>{{{title}}}</h1>");
    this.controller('application', {
      title: "<b>Hello world</b>"
    });

    return this.renderToHTML('/').then(function(html) {
      assertHTMLMatches(html, '<body><div id="EMBER_ID" class="ember-view"><h1><b>Hello world</b></h1></div></body>');
    });
  });

  QUnit.test("outlets", function(assert) {
    this.routes(function() {
      this.route('photos');
    });

    this.template('application', "<p>{{outlet}}</p>");
    this.template('index', "<span>index</span>");
    this.template('photos', "<em>photos</em>");

    var promises = [];
    promises.push(this.renderToHTML('/').then(function(html) {
      assertHTMLMatches(html, '<body><div id="EMBER_ID" class="ember-view"><p><span>index</span></p></div></body>');
    }));

    promises.push(this.renderToHTML('/photos').then(function(html) {
      assertHTMLMatches(html, '<body><div id="EMBER_ID" class="ember-view"><p><em>photos</em></p></div></body>');
    }));

    return this.all(promises);
  });

  QUnit.test("lifecycle hooks disabled", function(assert) {
    assert.expect(1);

    this.template('application', "{{my-component}}{{outlet}}");

    this.component('my-component', {
      willRender: function() {
        assert.ok(true, "should trigger component willRender hook");
      },
      didRender: function() {
        assert.ok(false, "should not trigger didRender hook");
      },
      willInsertElement: function() {
        assert.ok(false, "should not trigger willInsertElement hook");
      },
      didInsertElement: function() {
        assert.ok(false, "should not trigger didInsertElement hook");
      }
    });

    return this.renderToHTML('/');
  });
}
