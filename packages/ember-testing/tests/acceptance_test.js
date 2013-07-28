var App, find, click, fillIn, currentRoute, visit, originalAdapter;

module("ember-testing Acceptance", {
  setup: function() {
    Ember.$('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
    Ember.$('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#ember-testing'
      });

      App.Router.map(function() {
        this.route('posts');
        this.route('comments');
      });

      App.PostsRoute = Ember.Route.extend({
        renderTemplate: function() {
          currentRoute = 'posts';
          this._super();
        }
      });

      App.PostsView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("<a class=\"dummy-link\"></a><div id=\"comments-link\">{{#linkTo 'comments'}}Comments{{/linkTo}}</div>"),
        classNames: ['posts-view']
      });

      App.CommentsRoute = Ember.Route.extend({
        renderTemplate: function() {
          currentRoute = 'comments';
          this._super();
        }
      });

      App.CommentsView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("{{input type=text}}")
      });

      App.setupForTesting();
    });

    Ember.run(function() {
      App.advanceReadiness();
    });

    App.injectTestHelpers();

    find = window.find;
    click = window.click;
    fillIn = window.fillIn;
    visit = window.visit;

    originalAdapter = Ember.Test.adapter;
  },

  teardown: function() {
    App.removeTestHelpers();
    Ember.$('#ember-testing-container, #ember-testing').remove();
    Ember.run(App, App.destroy);
    App = null;
    Ember.Test.adapter = originalAdapter;
  }
});

test("helpers can be chained with then", function() {
  expect(5);
  Ember.Test.adapter = Ember.Test.QUnitAdapter.create({
    exception: function(error) {
      equal(error.message, "Element .does-not-exist not found.", "Exception successfully caught and passed to Ember.Test.adapter.exception");
    }
  });

  currentRoute = 'index';

  visit('/posts').then(function() {
    equal(currentRoute, 'posts', "Successfully visited posts route");
    return click('a:contains("Comments")');
  }).then(function() {
    equal(currentRoute, 'comments', "visit chained with click");
    return fillIn('.ember-text-field', "yeah");
  }).then(function() {
    equal(Ember.$('.ember-text-field').val(), 'yeah', "chained with fillIn");
    return fillIn('.ember-text-field', '#ember-testing-container', "context working");
  }).then(function() {
    equal(Ember.$('.ember-text-field').val(), 'context working', "chained with fillIn");
    click(".does-not-exist");
  }).then(function() {
    // This redundant `then` is needed in this test
    // so we can assert that thrown exceptions
    // do not fire multiple times
  });

});



test("helpers can be chained to each other", function() {
  expect(4);

  currentRoute = 'index';

  visit('/posts').click('a:first', '#comments-link')
  .fillIn('.ember-text-field', "hello")
  .then(function() {
    equal(currentRoute, 'comments', "Successfully visited posts route");
    equal(Ember.$('.ember-text-field').val(), 'hello', "Fillin successfully works");
    find('.ember-text-field').one('keypress', function(e) {
      equal(e.keyCode, 13, "keyevent chained with correct keyCode.");
    });
  })
  .keyEvent('.ember-text-field', 'keypress', 13)
  .visit('/posts')
  .then(function() {
    equal(currentRoute, 'posts', "Thens can also be chained to helpers");
  });
});
