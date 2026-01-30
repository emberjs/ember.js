var QUnit = require('qunitjs');
var RSVP = require('rsvp');
var SimpleDOM = require('simple-dom');
var appModule = require('./helpers/app-module');

function assertHTMLMatches(assert, actualHTML, expectedHTML) {
  assert.ok(actualHTML.match(expectedHTML), actualHTML + " matches " + expectedHTML);
}

function handleError(assert) {
  return function(error) {
    assert.ok(false, error.stack);
  };
}

// This is based on what fastboot-server does
var HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

function fastbootVisit(App, url) {
  var doc = new SimpleDOM.Document();
  var rootElement = doc.body;
  var options = { isBrowser: false, document: doc, rootElement: rootElement };

  return App.visit(url, options).then(function(instance) {
    try {
      return {
        url: instance.getURL(),
        title: doc.title,
        body: HTMLSerializer.serialize(rootElement)
      };
    } finally {
      instance.destroy();
    }
  });
}

function assertFastbootResult(assert, expected) {
  return function(actual) {
    assert.equal(actual.url, expected.url);
    assertHTMLMatches(assert, actual.body, expected.body);
  };
}

appModule("Ember.Application - visit() Integration Tests");

QUnit.test('FastBoot: basic', function(assert) {
  this.routes(function() {
    this.route('a');
    this.route('b');
  });

  this.template('application', '<h1>Hello world</h1>\n{{outlet}}');
  this.template('a', '<h2>Welcome to {{x-foo page="A"}}</h2>');
  this.template('b', '<h2>{{x-foo page="B"}}</h2>');
  this.template('components/x-foo', 'Page {{page}}');

  var initCalled = false;
  var didInsertElementCalled = false;

  this.component('x-foo', {
    tagName: 'span',
    init: function() {
      this._super();
      initCalled = true;
    },
    didInsertElement: function() {
      didInsertElementCalled = true;
    }
  });

  var App = this.createApplication();

  return RSVP.all([
    fastbootVisit(App, '/a').then(
      assertFastbootResult(assert, {
        url: '/a',
        body: '<h1>Hello world</h1>\n<h2>Welcome to <span id=".+" class="ember-view">Page A</span></h2>'
      }),
      handleError(assert)
    ),
    fastbootVisit(App, '/b').then(
      assertFastbootResult(assert, {
        url: '/b',
        body: '<h1>Hello world</h1>\n<h2><span id=".+" class="ember-view">Page B</span></h2>'
      }),
      handleError
    )
  ]).then(function() {
    assert.ok(initCalled, 'Component#init should be called');
    assert.ok(!didInsertElementCalled, 'Component#didInsertElement should not be called');
  });
});

QUnit.test('FastBoot: redirect', function(assert) {
  this.routes(function() {
    this.route('a');
    this.route('b');
    this.route('c');
  });

  this.template('a', '<h1>Hello from A</h1>');
  this.template('b', '<h1>Hello from B</h1>');
  this.template('c', '<h1>Hello from C</h1>');

  this.route('a', {
    beforeModel: function() {
      this.replaceWith('b');
    }
  });

  this.route('b', {
    afterModel: function() {
      this.transitionTo('c');
    }
  });

  var App = this.createApplication();

  return RSVP.all([
    fastbootVisit(App, '/a').then(
      assertFastbootResult(assert, { url: '/c', body: '<h1>Hello from C</h1>' }),
      handleError(assert)
    ),
    fastbootVisit(App, '/b').then(
      assertFastbootResult(assert, { url: '/c', body: '<h1>Hello from C</h1>' }),
      handleError(assert)
    )
  ]);
});

QUnit.test('FastBoot: attributes are sanitized', function(assert) {
  this.template('application', '<a href={{test}}></a>');

  this.controller('application', {
    /*jshint scripturl:true*/
    test: 'javascript:alert("hello")'
  });

  var App = this.createApplication();

  return RSVP.all([
    fastbootVisit(App, '/').then(
      assertFastbootResult(assert, { url: '/', body: '<a href="unsafe:javascript:alert\\(&quot;hello&quot;\\)"></a>' }),
      handleError(assert)
    )
  ]);
});

QUnit.test('FastBoot: route error', function(assert) {
  this.routes(function() {
    this.route('a');
    this.route('b');
  });

  this.template('a', '<h1>Hello from A</h1>');
  this.template('b', '<h1>Hello from B</h1>');

  this.route('a', {
    beforeModel: function() {
      throw new Error('Error from A');
    }
  });

  this.route('b', {
    afterModel: function() {
      throw new Error('Error from B');
    }
  });

  var App = this.createApplication();

  return RSVP.all([
    fastbootVisit(App, '/a')
      .then(
        function(instance) {
          assert.ok(false, 'It should not render');
          instance.destroy();
        },
        function(error) {
          assert.equal(error.message, 'Error from A');
        }
      ),
      fastbootVisit(App, '/b').then(
        function(instance) {
          assert.ok(false, 'It should not render');
          instance.destroy();
        },
        function(error) {
          assert.equal(error.message, 'Error from B');
        }
      )
  ]);
});

QUnit.test('FastBoot: route error template', function(assert) {
  this.routes(function() {
    this.route('a');
  });

  this.template('error', '<p>Error template rendered!</p>');
  this.template('a', '<h1>Hello from A</h1>');

  this.route('a', {
    model: function() {
      throw new Error('Error from A');
    }
  });

  var App = this.createApplication();

  return RSVP.all([
    fastbootVisit(App, '/a')
      .then(
        assertFastbootResult(assert, { url: '/a', body: '<p>Error template rendered!</p>' }),
        handleError(assert)
      ),
  ]);
});

QUnit.test('Resource-discovery setup', function(assert) {
  this.service('network', {
    init: function() {
      this.set('requests', []);
    },

    fetch: function(url) {
      this.get('requests').push(url);
      return RSVP.resolve();
    }
  });

  this.routes(function() {
    this.route('a');
    this.route('b');
    this.route('c');
    this.route('d');
    this.route('e');
  });

  this.route('a', {
    model: function() {
      return this.network.fetch('/a');
    },
    afterModel: function() {
      this.replaceWith('b');
    }
  });

  this.route('b', {
    model: function() {
      return this.network.fetch('/b');
    },
    afterModel: function() {
      this.replaceWith('c');
    }
  });

  this.route('c', {
    model: function() {
      return this.network.fetch('/c');
    }
  });

  this.route('d', {
    model: function() {
      return this.network.fetch('/d');
    },
    afterModel: function() {
      this.replaceWith('e');
    }
  });

  this.route('e', {
    model: function() {
      return this.network.fetch('/e');
    }
  });

  this.template('a', '{{x-foo}}');
  this.template('b', '{{x-foo}}');
  this.template('c', '{{x-foo}}');
  this.template('d', '{{x-foo}}');
  this.template('e', '{{x-foo}}');

  var xFooInstances = 0;

  this.component('x-foo', {
    init: function() {
      this._super();
      xFooInstances++;
    }
  });

  var App = this.createApplication();

  App.inject('route', 'network', 'service:network');

  function assertResources(url, resources) {
    return App.visit(url, { isBrowser: false, shouldRender: false }).then(
      function(instance) {
        try {
          var viewRegistry = instance.lookup('-view-registry:main');
          assert.strictEqual(Object.keys(viewRegistry).length, 0, 'did not create any views');

          var networkService = instance.lookup('service:network');
          assert.deepEqual(networkService.get('requests'), resources);
        } finally {
          instance.destroy();
        }
      },
      handleError(assert)
    );
  }

  return RSVP.all([
    assertResources('/a', ['/a', '/b', '/c']),
    assertResources('/b', ['/b', '/c']),
    assertResources('/c', ['/c']),
    assertResources('/d', ['/d', '/e']),
    assertResources('/e', ['/e'])
  ]).then(function() {
    assert.strictEqual(xFooInstances, 0, 'it should not create any x-foo components');
  });
});

QUnit.test('FastBoot: tagless components can render', function(assert) {
  this.template('application', "<div class='my-context'>{{my-component}}</div>");
  this.component('my-component', { tagName: '' });
  this.template('components/my-component', '<h1>hello world</h1>');

  var App = this.createApplication();

  return RSVP.all([
    fastbootVisit(App, '/').then(
      assertFastbootResult(assert, { url: '/', body: /<div class="my-context"><h1>hello world<\/h1><\/div>/ }),
      handleError(assert)
    )
  ]);
});
