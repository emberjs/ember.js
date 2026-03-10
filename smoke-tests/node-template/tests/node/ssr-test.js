const SimpleDOM = require('simple-dom');
const setupAppTest = require('./helpers/setup-app');

let htmlSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

// Renders using _renderMode: 'serialize' which produces Glimmer rehydration
// markers in the HTML output (used for SSR with client-side rehydration).
function ssrVisit(App, url) {
  let doc = new SimpleDOM.Document();
  let rootElement = doc.body;

  return App.visit(url, {
    isBrowser: false,
    document: doc,
    rootElement: rootElement,
    _renderMode: 'serialize',
  }).then(function (instance) {
    try {
      return htmlSerializer.serialize(rootElement);
    } finally {
      instance.destroy();
    }
  });
}

QUnit.module('SSR - _renderMode serialize', function (hooks) {
  setupAppTest(hooks);

  QUnit.test('renders HTML with Glimmer rehydration markers', function (assert) {
    this.template('application', '<h1>Hello SSR</h1>{{outlet}}');

    let App = this.createApplication();

    return ssrVisit(App, '/').then(function (html) {
      assert.ok(html.includes('Hello SSR'), 'rendered content is present');
      // Glimmer serialization markers are HTML comments of the form <!--%...%-->
      assert.ok(/<!--%/.test(html), 'Glimmer rehydration markers are present in SSR output');
    });
  });

  QUnit.test('renders route content with rehydration markers', function (assert) {
    this.routes(function () {
      this.route('about');
    });

    this.template('application', '<div id="app">{{outlet}}</div>');
    this.template('about', '<h2>About Page</h2>');

    let App = this.createApplication();

    return ssrVisit(App, '/about').then(function (html) {
      assert.ok(html.includes('About Page'), 'route content is rendered');
      assert.ok(/<!--%/.test(html), 'Glimmer rehydration markers are present');
    });
  });

  QUnit.test('SSR output includes rehydration markers not present in FastBoot output', function (assert) {
    this.template('application', '<h1>Hello world</h1>');

    let App = this.createApplication();
    let doc = new SimpleDOM.Document();
    let rootElement = doc.body;

    let plainVisit = App.visit('/', {
      isBrowser: false,
      document: doc,
      rootElement: rootElement,
    }).then(function (instance) {
      try {
        return htmlSerializer.serialize(rootElement);
      } finally {
        instance.destroy();
      }
    });

    let ssrVisitPromise = ssrVisit(App, '/');

    return Promise.all([plainVisit, ssrVisitPromise]).then(function (results) {
      let plainHTML = results[0];
      let ssrHTML = results[1];

      assert.notOk(/<!--%/.test(plainHTML), 'plain FastBoot output has no rehydration markers');
      assert.ok(/<!--%/.test(ssrHTML), 'SSR output contains rehydration markers');
    });
  });
});
