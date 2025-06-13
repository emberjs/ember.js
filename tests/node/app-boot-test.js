const setupAppTest = require('./helpers/setup-app');

require('./helpers/assert-html-matches').register();

QUnit.module('App Boot', function (hooks) {
  setupAppTest(hooks);

  QUnit.test('App boots and routes to a URL', function (assert) {
    this.visit('/');
    assert.ok(this.app);
  });

  QUnit.test('nested {{component}}', function (assert) {
    this.template('index', '{{root-component}}');

    this.component(
      'root-component',
      {
        location: 'World',
        hasExistence: true,
      },
      "\
    <h1>Hello {{#if this.hasExistence}}{{this.location}}{{/if}}</h1>\
    <div>{{component 'foo-bar'}}</div>\
  "
    );

    this.component(
      'foo-bar',
      undefined,
      '\
      <p>The files are *inside* the computer?!</p>\
    '
    );

    return this.renderToHTML('/').then(function (html) {
      assert.htmlMatches(
        html,
        '<body><div id="EMBER_ID" class="ember-view"><h1>Hello World</h1><div><p>The files are *inside* the computer?!</p></div></div></body>'
      );
    });
  });

  QUnit.test('<LinkTo>', function (assert) {
    this.template('application', "<h1><LinkTo @route='photos'>Go to photos</LinkTo></h1>");
    this.routes(function () {
      this.route('photos');
    });

    return this.renderToHTML('/').then(function (html) {
      assert.htmlMatches(
        html,
        '<body><h1><a id="EMBER_ID" href="/photos" class="ember-view">Go to photos</a></h1></body>'
      );
    });
  });

  QUnit.test('{{link-to}}', function (assert) {
    this.template('application', "<h1>{{#link-to route='photos'}}Go to photos{{/link-to}}</h1>");
    this.routes(function () {
      this.route('photos');
    });

    return this.renderToHTML('/').then(function (html) {
      assert.htmlMatches(
        html,
        '<body><h1><a id="EMBER_ID" href="/photos" class="ember-view">Go to photos</a></h1></body>'
      );
    });
  });

  QUnit.test('non-escaped content', function (assert) {
    this.routes(function () {
      this.route('photos');
    });

    this.template('application', '<h1>{{{this.title}}}</h1>');
    this.controller('application', {
      title: '<b>Hello world</b>',
    });

    return this.renderToHTML('/').then(function (html) {
      assert.htmlMatches(html, '<body><h1><b>Hello world</b></h1></body>');
    });
  });

  QUnit.test('outlets', function (assert) {
    this.routes(function () {
      this.route('photos');
    });

    this.template('application', '<p>{{outlet}}</p>');
    this.template('index', '<span>index</span>');
    this.template('photos', '<em>photos</em>');

    let promises = [];
    promises.push(
      this.renderToHTML('/').then(function (html) {
        assert.htmlMatches(html, '<body><p><span>index</span></p></body>');
      })
    );

    promises.push(
      this.renderToHTML('/photos').then(function (html) {
        assert.htmlMatches(html, '<body><p><em>photos</em></p></body>');
      })
    );

    return this.all(promises);
  });
});
