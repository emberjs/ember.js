var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var set = function(object, key, value) {
  Ember.run(function() { Ember.set(object, key, value); });
};

var compile = function(template) {
  return Ember.Handlebars.compile(template);
};

var buildContainer = function(namespace) {
  var container = new Ember.Container();

  container.set = Ember.set;
  container.resolver = resolverFor(namespace);
  container.optionsForType('view', { singleton: false });
  container.optionsForType('template', { instantiate: false });
  container.register('application:main', namespace, { instantiate: false });
  container.injection('router:main', 'namespace', 'application:main');

  container.register('controller:basic', Ember.Controller, { instantiate: false });
  container.register('controller:object', Ember.ObjectController, { instantiate: false });
  container.register('controller:array', Ember.ArrayController, { instantiate: false });

  container.typeInjection('route', 'router', 'router:main');

  return container;
};

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":"),
        type = nameParts[0], name = nameParts[1];

    if (type === 'template') {
      var templateName = Ember.String.decamelize(name);
      if (Ember.TEMPLATES[templateName]) {
        return Ember.TEMPLATES[templateName];
      }
    }

    var className = Ember.String.classify(name) + Ember.String.classify(type);
    var factory = Ember.get(namespace, className);

    if (factory) { return factory; }
  };
}

var view, container;

module("Handlebars {{render}} helper", {
  setup: function() {
    var namespace = Ember.Namespace.create();
    container = buildContainer(namespace);
    container.register('view:default', Ember.View.extend());
    container.register('router:main', Ember.Router.extend());
  },
  teardown: function() {
    Ember.run(function () {
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }
    });

    Ember.TEMPLATES = {};
  }
});

test("{{render}} helper should render given template", function() {
  var template = "<h1>HI</h1>{{render home}}";
  var controller = Ember.Controller.extend({container: container});
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  equal(view.$().text(), 'HIBYE');
  ok(container.lookup('router:main')._lookupActiveView('home'), 'should register home as active view');
});

test("{{render}} helper should render given template with a supplied model", function() {
  var template = "<h1>HI</h1>{{render 'post' post}}";
  var post = {
    title: "Rails is omakase"
  };

  var Controller = Ember.Controller.extend({
    container: container,
    post: post
  });

  var controller = Controller.create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });

  var PostController = Ember.ObjectController.extend();
  container.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  appendView(view);

  var postController = view.get('_childViews')[0].get('controller');

  equal(view.$().text(), 'HIRails is omakase');
  equal(postController.get('model'), post);

  set(controller, 'post', { title: "Rails is unagi" });

  equal(view.$().text(), 'HIRails is unagi');
  if (Ember.create.isSimulated) {
    equal(postController.get('model').title, "Rails is unagi");
  } else {
    deepEqual(postController.get('model'), { title: "Rails is unagi" });
  }
});

test("{{render}} helper should raise an error when a given controller name does not resolve to a controller", function() {
  var template = '<h1>HI</h1>{{render home controller="postss"}}';
  var controller = Ember.Controller.extend({container: container});
  container.register('controller:posts', Ember.ArrayController.extend());
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    appendView(view);
  }, 'The controller name you supplied \'postss\' did not resolve to a controller.');
});

test("{{render}} helper should render with given controller", function() {
  var template = '<h1>HI</h1>{{render home controller="posts"}}';
  var controller = Ember.Controller.extend({container: container});
  container.register('controller:posts', Ember.ArrayController.extend());
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('home');
  equal(container.lookup('controller:posts'), renderedView.get('controller'), 'rendered with correct controller');
});

test("{{render}} helper should render a template without a model only once", function() {
  var template = "<h1>HI</h1>{{render home}}<hr/>{{render home}}";
  var controller = Ember.Controller.extend({container: container});
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    appendView(view);
  }, /\{\{render\}\} helper once/i);
});

test("{{render}} helper should render templates with models multiple times", function() {
  var template = "<h1>HI</h1> {{render 'post' post1}} {{render 'post' post2}}";
  var post1 = {
    title: "Me first"
  };
  var post2 = {
    title: "Then me"
  };

  var Controller = Ember.Controller.extend({
    container: container,
    post1: post1,
    post2: post2
  });

  var controller = Controller.create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });

  var PostController = Ember.ObjectController.extend();
  container.register('controller:post', PostController, {singleton: false});

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  appendView(view);

  var postController1 = view.get('_childViews')[0].get('controller');
  var postController2 = view.get('_childViews')[1].get('controller');

  ok(view.$().text().match(/^HI ?Me first ?Then me$/));
  equal(postController1.get('model'), post1);
  equal(postController2.get('model'), post2);

  set(controller, 'post1', { title: "I am new" });

  ok(view.$().text().match(/^HI ?I am new ?Then me$/));
  if (Ember.create.isSimulated) {
    equal(postController1.get('model').title, "I am new");
  } else {
    deepEqual(postController1.get('model'), { title: "I am new" });
  }
});

test("{{render}} helper should not treat invocations with falsy contexts as context-less", function() {
  var template = "<h1>HI</h1> {{render 'post' zero}} {{render 'post' nonexistent}}";

  view = Ember.View.create({
    controller: Ember.Controller.createWithMixins({
      container: container,
      zero: false
    }),
    template: Ember.Handlebars.compile(template)
  });

  var PostController = Ember.ObjectController.extend();
  container.register('controller:post', PostController, {singleton: false});

  Ember.TEMPLATES['post'] = compile("<p>{{#unless content}}NOTHING{{/unless}}</p>");

  appendView(view);

  var postController1 = view.get('_childViews')[0].get('controller');
  var postController2 = view.get('_childViews')[1].get('controller');

  ok(view.$().text().match(/^HI ?NOTHING ?NOTHING$/));
  equal(postController1.get('model'), 0);
  equal(postController2.get('model'), undefined);
});

test("{{render}} helper should render templates both with and without models", function() {
  var template = "<h1>HI</h1> {{render 'post'}} {{render 'post' post}}";
  var post = {
    title: "Rails is omakase"
  };

  var Controller = Ember.Controller.extend({
    container: container,
    post: post
  });

  var controller = Controller.create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });

  var PostController = Ember.ObjectController.extend();
  container.register('controller:post', PostController, {singleton: false});

  Ember.TEMPLATES['post'] = compile("<p>Title:{{title}}</p>");

  appendView(view);

  var postController1 = view.get('_childViews')[0].get('controller');
  var postController2 = view.get('_childViews')[1].get('controller');

  ok(view.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));
  equal(postController1.get('model'), null);
  equal(postController2.get('model'), post);

  set(controller, 'post', { title: "Rails is unagi" });

  ok(view.$().text().match(/^HI ?Title: ?Title:Rails is unagi$/));
  if (Ember.create.isSimulated) {
    equal(postController2.get('model').title, "Rails is unagi");
  } else {
    deepEqual(postController2.get('model'), { title: "Rails is unagi" });
  }
});

test("{{render}} helper should link child controllers to the parent controller", function() {
  var parentTriggered = 0;

  var template = '<h1>HI</h1>{{render "posts"}}';
  var controller = Ember.Controller.extend({
    container: container,
    actions: {
      parentPlease: function() {
        parentTriggered++;
      }
    }
  });

  container.register('controller:posts', Ember.ArrayController.extend());

  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['posts'] = compile('<button id="parent-action" {{action "parentPlease"}}>Go to Parent</button>');

  appendView(view);

  var actionId = Ember.$("#parent-action").data('ember-action'),
      action = Ember.Handlebars.ActionHelper.registeredActions[actionId],
      handler = action.handler;

  Ember.run(null, handler, new Ember.$.Event("click"));

  equal(parentTriggered, 1, "The event bubbled to the parent");
});

test("{{render}} helper should be able to render a template again when it was removed", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  var controller = Ember.Controller.extend({container: container});
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      controller: controller.create(),
      template: compile("<p>1{{render home}}</p>")
    }));
  });

  equal(view.$().text(), 'HI1BYE');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      controller: controller.create(),
      template: compile("<p>2{{render home}}</p>")
    }));
  });

  equal(view.$().text(), 'HI2BYE');
});

test("{{render}} works with dot notation", function() {
  var template = '<h1>BLOG</h1>{{render blog.post}}';

  var controller = Ember.Controller.extend({container: container});
  container.register('controller:blog.post', Ember.ObjectController.extend());

  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['blog/post'] = compile("<p>POST</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('blog.post');
  equal(renderedView.get('viewName'), 'blogPost', 'camelizes the view name');
  equal(container.lookup('controller:blog.post'), renderedView.get('controller'), 'rendered with correct controller');
});

test("{{render}} works with slash notation", function() {
  var template = '<h1>BLOG</h1>{{render "blog/post"}}';

  var controller = Ember.Controller.extend({container: container});
  container.register('controller:blog.post', Ember.ObjectController.extend());

  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['blog/post'] = compile("<p>POST</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('blog.post');
  equal(renderedView.get('viewName'), 'blogPost', 'camelizes the view name');
  equal(container.lookup('controller:blog.post'), renderedView.get('controller'), 'rendered with correct controller');
});
