import Ember from 'ember-metal/core'; // TEMPLATES
import { get } from "ember-metal/property_get";
import { set as emberSet } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import { canDefineNonEnumerableProperties } from 'ember-metal/platform';
import { observer } from 'ember-metal/mixin';

import Container from 'container/container';
import Namespace from "ember-runtime/system/namespace";
import {
  classify,
  decamelize
} from "ember-runtime/system/string";

import EmberController from "ember-runtime/controllers/controller";
import EmberObjectController from "ember-runtime/controllers/object_controller";
import EmberArrayController from "ember-runtime/controllers/array_controller";

import EmberRouter from "ember-routing/system/router";
import HashLocation from "ember-routing/location/hash_location";

import EmberHandlebars from "ember-handlebars";
import EmberView from "ember-routing/ext/view";
import _MetamorphView from "ember-handlebars/views/metamorph_view";
import jQuery from "ember-views/system/jquery";
import ActionManager from "ember-views/system/action_manager";

import renderHelper from "ember-routing-handlebars/helpers/render";
import { actionHelper } from "ember-routing-handlebars/helpers/action";
import { outletHelper } from "ember-routing-handlebars/helpers/outlet";

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

function set(object, key, value) {
  run(function() { emberSet(object, key, value); });
}

function compile(template) {
  return EmberHandlebars.compile(template);
}

function buildContainer(namespace) {
  var container = new Container();

  container.set = emberSet;
  container.resolver = resolverFor(namespace);
  container.optionsForType('view', { singleton: false });
  container.optionsForType('template', { instantiate: false });
  container.register('application:main', namespace, { instantiate: false });
  container.injection('router:main', 'namespace', 'application:main');

  container.register('location:hash', HashLocation);

  container.register('controller:basic', EmberController, { instantiate: false });
  container.register('controller:object', EmberObjectController, { instantiate: false });
  container.register('controller:array', EmberArrayController, { instantiate: false });

  container.typeInjection('route', 'router', 'router:main');

  return container;
}

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":");
    var type = nameParts[0];
    var name = nameParts[1];

    if (type === 'template') {
      var templateName = decamelize(name);
      if (Ember.TEMPLATES[templateName]) {
        return Ember.TEMPLATES[templateName];
      }
    }

    var className = classify(name) + classify(type);
    var factory = get(namespace, className);

    if (factory) { return factory; }
  };
}

var view, container, originalRenderHelper, originalActionHelper, originalOutletHelper;

QUnit.module("Handlebars {{render}} helper", {
  setup: function() {
    originalOutletHelper = EmberHandlebars.helpers['outlet'];
    EmberHandlebars.registerHelper('outlet', outletHelper);

    originalRenderHelper = EmberHandlebars.helpers['render'];
    EmberHandlebars.registerHelper('render', renderHelper);

    originalActionHelper = EmberHandlebars.helpers['action'];
    EmberHandlebars.registerHelper('action', actionHelper);


    var namespace = Namespace.create();
    container = buildContainer(namespace);
    container.register('view:default', _MetamorphView);
    container.register('router:main', EmberRouter.extend());
  },
  teardown: function() {
    delete EmberHandlebars.helpers['render'];
    EmberHandlebars.helpers['render'] = originalRenderHelper;

    delete EmberHandlebars.helpers['action'];
    EmberHandlebars.helpers['action'] = originalActionHelper;

    delete EmberHandlebars.helpers['outlet'];
    EmberHandlebars.helpers['outlet'] = originalOutletHelper;

    run(function () {
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }
      container = view = null;
    });

    Ember.TEMPLATES = {};
  }
});

test("{{render}} helper should render given template", function() {
  var template = "<h1>HI</h1>{{render 'home'}}";
  var controller = EmberController.extend({container: container});
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  equal(view.$().text(), 'HIBYE');
  ok(container.lookup('router:main')._lookupActiveView('home'), 'should register home as active view');
});

test("{{render}} helper should have assertion if neither template nor view exists", function() {
  var template = "<h1>HI</h1>{{render 'oops'}}";
  var controller = EmberController.extend({container: container});
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  expectAssertion(function() {
    appendView(view);
  }, 'You used `{{render \'oops\'}}`, but \'oops\' can not be found as either a template or a view.');
});

test("{{render}} helper should not have assertion if template is supplied in block-form", function() {
  var template = "<h1>HI</h1>{{#render 'good'}} {{name}}{{/render}}";
  var controller = EmberController.extend({container: container});
  container.register('controller:good', EmberController.extend({ name: 'Rob'}));
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI Rob');
});

test("{{render}} helper should not have assertion if view exists without a template", function() {
  var template = "<h1>HI</h1>{{render 'oops'}}";
  var controller = EmberController.extend({container: container});
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  container.register('view:oops', EmberView.extend());

  appendView(view);

  equal(view.$().text(), 'HI');
});

test("{{render}} helper should render given template with a supplied model", function() {
  var template = "<h1>HI</h1>{{render 'post' post}}";
  var post = {
    title: "Rails is omakase"
  };

  var Controller = EmberController.extend({
    container: container,
    post: post
  });

  var controller = Controller.create({
  });

  view = EmberView.create({
    controller: controller,
    template: compile(template)
  });

  var PostController = EmberObjectController.extend();
  container.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  appendView(view);

  var postController = view.get('_childViews')[0].get('controller');

  equal(view.$().text(), 'HIRails is omakase');
  equal(postController.get('model'), post);

  set(controller, 'post', { title: "Rails is unagi" });

  equal(view.$().text(), 'HIRails is unagi');
  if (canDefineNonEnumerableProperties) {
    deepEqual(postController.get('model'), { title: "Rails is unagi" });
  } else {
    equal(postController.get('model').title, "Rails is unagi");
  }
});

test("{{render}} helper with a supplied model should not fire observers on the controller", function () {
  var template = "<h1>HI</h1>{{render 'post' post}}";
  var post = {
    title: "Rails is omakase"
  };

  view = EmberView.create({
    controller: EmberController.create({
      container: container,
      post: post
    }),
    template: compile(template)
  });

  var PostController = EmberObjectController.extend({
    modelDidChange: observer('model', function(){
      modelDidChange++;
    })
  });

  container.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  var modelDidChange = 0;
  appendView(view);
  equal(modelDidChange, 0, "model observer did not fire");

});

test("{{render}} helper should raise an error when a given controller name does not resolve to a controller", function() {
  var template = '<h1>HI</h1>{{render "home" controller="postss"}}';
  var controller = EmberController.extend({container: container});
  container.register('controller:posts', EmberArrayController.extend());
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    appendView(view);
  }, 'The controller name you supplied \'postss\' did not resolve to a controller.');
});

test("{{render}} helper should render with given controller", function() {
  var template = '<h1>HI</h1>{{render "home" controller="posts"}}';
  var controller = EmberController.extend({container: container});
  container.register('controller:posts', EmberArrayController.extend());
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('home');
  equal(container.lookup('controller:posts'), renderedView.get('controller'), 'rendered with correct controller');
});

test("{{render}} helper should render a template without a model only once", function() {
  var template = "<h1>HI</h1>{{render 'home'}}<hr/>{{render home}}";
  var controller = EmberController.extend({container: container});
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
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

  var Controller = EmberController.extend({
    container: container,
    post1: post1,
    post2: post2
  });

  var controller = Controller.create();

  view = EmberView.create({
    controller: controller,
    template: compile(template)
  });

  var PostController = EmberObjectController.extend();
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
  if (canDefineNonEnumerableProperties) {
    deepEqual(postController1.get('model'), { title: "I am new" });
  } else {
    equal(postController1.get('model').title, "I am new");
  }
});

test("{{render}} helper should not leak controllers", function() {
  var template = "<h1>HI</h1> {{render 'post' post1}}";
  var post1 = {
    title: "Me first"
  };

  var Controller = EmberController.extend({
    container: container,
    post1: post1
  });

  var controller = Controller.create();

  view = EmberView.create({
    controller: controller,
    template: compile(template)
  });

  var PostController = EmberObjectController.extend();
  container.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  appendView(view);

  var postController1 = view.get('_childViews')[0].get('controller');

  run(view, 'destroy');

  ok(postController1.isDestroyed, 'expected postController to be destroyed');
});

test("{{render}} helper should not treat invocations with falsy contexts as context-less", function() {
  var template = "<h1>HI</h1> {{render 'post' zero}} {{render 'post' nonexistent}}";

  view = EmberView.create({
    controller: EmberController.createWithMixins({
      container: container,
      zero: false
    }),
    template: compile(template)
  });

  var PostController = EmberObjectController.extend();
  container.register('controller:post', PostController, {singleton: false});

  Ember.TEMPLATES['post'] = compile("<p>{{#unless model}}NOTHING{{/unless}}</p>");

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

  var Controller = EmberController.extend({
    container: container,
    post: post
  });

  var controller = Controller.create();

  view = EmberView.create({
    controller: controller,
    template: compile(template)
  });

  var PostController = EmberObjectController.extend();
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
  if (canDefineNonEnumerableProperties) {
    deepEqual(postController2.get('model'), { title: "Rails is unagi" });
  } else {
    equal(postController2.get('model').title, "Rails is unagi");
  }
});

test("{{render}} helper should link child controllers to the parent controller", function() {
  var parentTriggered = 0;

  var template = '<h1>HI</h1>{{render "posts"}}';
  var controller = EmberController.extend({
    container: container,
    actions: {
      parentPlease: function() {
        parentTriggered++;
      }
    },
    role: "Mom"
  });

  container.register('controller:posts', EmberArrayController.extend());

  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['posts'] = compile('<button id="parent-action" {{action "parentPlease"}}>Go to {{parentController.role}}</button>');

  appendView(view);

  var button = jQuery("#parent-action");
  var actionId = button.data('ember-action');
  var action = ActionManager.registeredActions[actionId];
  var handler = action.handler;

  equal(button.text(), "Go to Mom", "The parentController property is set on the child controller");

  run(null, handler, new jQuery.Event("click"));

  equal(parentTriggered, 1, "The event bubbled to the parent");
});

test("{{render}} helper should be able to render a template again when it was removed", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  var controller = EmberController.extend({container: container});
  view = EmberView.create({
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  run(function() {
    view.connectOutlet('main', EmberView.create({
      controller: controller.create(),
      template: compile("<p>1{{render 'home'}}</p>")
    }));
  });

  equal(view.$().text(), 'HI1BYE');

  run(function() {
    view.connectOutlet('main', EmberView.create({
      controller: controller.create(),
      template: compile("<p>2{{render 'home'}}</p>")
    }));
  });

  equal(view.$().text(), 'HI2BYE');
});

test("{{render}} works with dot notation", function() {
  var template = '<h1>BLOG</h1>{{render "blog.post"}}';

  var controller = EmberController.extend({container: container});
  container.register('controller:blog.post', EmberObjectController.extend());

  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['blog.post'] = compile("<p>POST</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('blog.post');
  equal(renderedView.get('viewName'), 'blogPost', 'camelizes the view name');
  equal(container.lookup('controller:blog.post'), renderedView.get('controller'), 'rendered with correct controller');
});

test("{{render}} works with slash notation", function() {
  var template = '<h1>BLOG</h1>{{render "blog/post"}}';

  var controller = EmberController.extend({container: container});
  container.register('controller:blog.post', EmberObjectController.extend());

  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['blog.post'] = compile("<p>POST</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('blog.post');
  equal(renderedView.get('viewName'), 'blogPost', 'camelizes the view name');
  equal(container.lookup('controller:blog.post'), renderedView.get('controller'), 'rendered with correct controller');
});

test("Using quoteless templateName works properly (DEPRECATED)", function(){
  var template = '<h1>HI</h1>{{render home}}';
  var controller = EmberController.extend({container: container});
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectDeprecation("Using a quoteless parameter with {{render}} is deprecated. Please update to quoted usage '{{render \"home\"}}.");
  appendView(view);

  equal(view.$('p:contains(BYE)').length, 1, "template was rendered");
});
