/*jshint multistr:true*/
var appModule = require('./helpers/app-module');

function assertHTMLMatches(assert, actualHTML, expectedHTML) {
  assert.ok(actualHTML.match(expectedHTML), actualHTML + " matches " + expectedHTML);
}

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
      assertHTMLMatches(assert, html, /<h1>Hello World<\/h1>\s+<div><div id="(.*)" class="ember-view">\s+<p>The files are \*inside\* the computer\?\!<\/p>\s+<\/div><\/div>/);
    });
  });

  QUnit.test("{{link-to}}", function(assert) {
    this.template('application', "<h1>{{#link-to 'photos'}}Go to photos{{/link-to}}</h1>");
    this.routes(function() {
      this.route('photos');
    });

    return this.renderToHTML('/').then(function(html) {
      assertHTMLMatches(assert, html, /<div id="ember\d+" class="ember-view"><h1><a id="ember\d+" href="\/photos" class="ember-view">Go to photos<\/a><\/h1><\/div>/);
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
      assertHTMLMatches(assert, html, /<div id="ember\d+" class="ember-view"><h1><b>Hello world<\/b><\/h1><\/div>/);
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
      assertHTMLMatches(assert, html, /<div id="ember(.*)" class="ember-view"><p><span>index<\/span><\/p><\/div>/);
    }));

    promises.push(this.renderToHTML('/photos').then(function(html) {
      assertHTMLMatches(assert, html, /<div id="ember(.*)" class="ember-view"><p><em>photos<\/em><\/p><\/div>/);
    }));

    return this.all(promises);
  });

  QUnit.test("lifecycle hooks disabled", function(assert) {
    expect(2);

    this.template('application', "{{my-component}}{{outlet}}");

    this.component('my-component', {
      willRender: function() {
        ok(true, "should trigger component willRender hook");
      },
      didRender: function() {
        ok(false, "should not trigger didRender hook");
      },
      willInsertElement: function() {
        ok(false, "should not trigger willInsertElement hook");
      },
      didInsertElement: function() {
        ok(false, "should not trigger didInsertElement hook");
      }
    });

    this.view('index', {
      _willRender: function() {
        ok(true, "should trigger view _willRender hook");
      },
      didRender: function() {
        ok(false, "should not trigger didRender hook");
      },
      willInsertElement: function() {
        ok(false, "should not trigger willInsertElement hook");
      },
      didCreateElement: function() {
        ok(false, "should not trigger didCreateElement hook");
      },
      didInsertElement: function() {
        ok(false, "should not trigger didInsertElement hook");
      }
    });

    return this.renderToHTML('/');
  });
}
