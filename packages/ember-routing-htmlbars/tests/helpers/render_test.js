import Ember from 'ember-metal/core'; // TEMPLATES
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import { canDefineNonEnumerableProperties } from 'ember-metal/platform/define_property';
import { observer } from 'ember-metal/mixin';

import Namespace from "ember-runtime/system/namespace";

import EmberController from "ember-runtime/controllers/controller";
import EmberArrayController from "ember-runtime/controllers/array_controller";

import { registerHelper } from "ember-htmlbars/helpers";
import helpers from "ember-htmlbars/helpers";
import compile from "ember-template-compiler/system/compile";

import EmberView from "ember-views/views/view";
import jQuery from "ember-views/system/jquery";
import ActionManager from "ember-views/system/action_manager";

import { renderHelper } from "ember-routing-htmlbars/helpers/render";
import { actionHelper } from "ember-routing-htmlbars/helpers/action";

import { buildRegistry } from "ember-routing-htmlbars/tests/utils";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

function runSet(object, key, value) {
  run(function() {
    set(object, key, value);
  });
}

var view, container, originalRenderHelper, originalActionHelper;

QUnit.module("ember-routing-htmlbars: {{render}} helper", {
  setup() {
    originalRenderHelper = helpers['render'];
    registerHelper('render', renderHelper);

    originalActionHelper = helpers['action'];
    registerHelper('action', actionHelper);


    var namespace = Namespace.create();
    var registry = buildRegistry(namespace);
    container = registry.container();
  },

  teardown() {
    delete helpers['render'];
    helpers['render'] = originalRenderHelper;

    delete helpers['action'];
    helpers['action'] = originalActionHelper;

    runDestroy(container);
    runDestroy(view);

    Ember.TEMPLATES = {};
  }
});

QUnit.test("{{render}} helper should render given template", function() {
  var template = "<h1>HI</h1>{{render 'home'}}";
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  runAppend(view);

  equal(view.$().text(), 'HIBYE');
  ok(container.lookup('router:main')._lookupActiveView('home'), 'should register home as active view');
});

QUnit.test("{{render}} helper should have assertion if neither template nor view exists", function() {
  var template = "<h1>HI</h1>{{render 'oops'}}";
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  expectAssertion(function() {
    runAppend(view);
  }, 'You used `{{render \'oops\'}}`, but \'oops\' can not be found as either a template or a view.');
});

QUnit.test("{{render}} helper should not have assertion if template is supplied in block-form", function() {
  var template = "<h1>HI</h1>{{#render 'good'}} {{name}}{{/render}}";
  var controller = EmberController.extend({ container: container });
  container._registry.register('controller:good', EmberController.extend({ name: 'Rob' }));
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'HI Rob');
});

QUnit.test("{{render}} helper should not have assertion if view exists without a template", function() {
  var template = "<h1>HI</h1>{{render 'oops'}}";
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  container._registry.register('view:oops', EmberView.extend());

  runAppend(view);

  equal(view.$().text(), 'HI');
});

QUnit.test("{{render}} helper should render given template with a supplied model", function() {
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

  var PostController = EmberController.extend();
  container._registry.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{model.title}}</p>");

  runAppend(view);

  var postController = view.childViews[0].get('controller');

  equal(view.$().text(), 'HIRails is omakase');
  equal(postController.get('model'), post);

  runSet(controller, 'post', { title: "Rails is unagi" });

  equal(view.$().text(), 'HIRails is unagi');
  if (canDefineNonEnumerableProperties) {
    deepEqual(postController.get('model'), { title: "Rails is unagi" });
  } else {
    equal(postController.get('model').title, "Rails is unagi");
  }
});

QUnit.test("{{render}} helper with a supplied model should not fire observers on the controller", function () {
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

  var PostController = EmberController.extend({
    modelDidChange: observer('model', function() {
      modelDidChange++;
    })
  });

  container._registry.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  var modelDidChange = 0;
  runAppend(view);
  equal(modelDidChange, 0, "model observer did not fire");

});

QUnit.test("{{render}} helper should raise an error when a given controller name does not resolve to a controller", function() {
  var template = '<h1>HI</h1>{{render "home" controller="postss"}}';
  var controller = EmberController.extend({ container: container });
  container._registry.register('controller:posts', EmberArrayController.extend());
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    runAppend(view);
  }, 'The controller name you supplied \'postss\' did not resolve to a controller.');
});

QUnit.test("{{render}} helper should render with given controller", function() {
  var template = '<h1>HI</h1>{{render "home" controller="posts"}}';
  var controller = EmberController.extend({ container: container });
  container._registry.register('controller:posts', EmberArrayController.extend());
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  runAppend(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('home');
  equal(container.lookup('controller:posts'), renderedView.get('controller'), 'rendered with correct controller');
});

QUnit.test("{{render}} helper should render a template without a model only once", function() {
  var template = "<h1>HI</h1>{{render 'home'}}<hr/>{{render 'home'}}";
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    runAppend(view);
  }, /\{\{render\}\} helper once/i);
});

QUnit.test("{{render}} helper should render templates with models multiple times", function() {
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

  var PostController = EmberController.extend();
  container._registry.register('controller:post', PostController, { singleton: false });

  Ember.TEMPLATES['post'] = compile("<p>{{model.title}}</p>");

  runAppend(view);

  var postController1 = view.childViews[0].get('controller');
  var postController2 = view.childViews[1].get('controller');

  ok(view.$().text().match(/^HI ?Me first ?Then me$/));
  equal(postController1.get('model'), post1);
  equal(postController2.get('model'), post2);

  runSet(controller, 'post1', { title: "I am new" });

  ok(view.$().text().match(/^HI ?I am new ?Then me$/));
  if (canDefineNonEnumerableProperties) {
    deepEqual(postController1.get('model'), { title: "I am new" });
  } else {
    equal(postController1.get('model').title, "I am new");
  }
});

QUnit.test("{{render}} helper should not leak controllers", function() {
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

  var PostController = EmberController.extend();
  container._registry.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile("<p>{{title}}</p>");

  runAppend(view);

  var postController1 = view.childViews[0].get('controller');

  runDestroy(view);

  ok(postController1.isDestroyed, 'expected postController to be destroyed');
});

QUnit.test("{{render}} helper should not treat invocations with falsy contexts as context-less", function() {
  var template = "<h1>HI</h1> {{render 'post' zero}} {{render 'post' nonexistent}}";

  view = EmberView.create({
    controller: EmberController.createWithMixins({
      container: container,
      zero: false
    }),
    template: compile(template)
  });

  var PostController = EmberController.extend();
  container._registry.register('controller:post', PostController, { singleton: false });

  Ember.TEMPLATES['post'] = compile("<p>{{#unless model}}NOTHING{{/unless}}</p>");

  runAppend(view);

  var postController1 = view.childViews[0].get('controller');
  var postController2 = view.childViews[1].get('controller');

  ok(view.$().text().match(/^HI ?NOTHING ?NOTHING$/));
  equal(postController1.get('model'), 0);
  equal(postController2.get('model'), undefined);
});

QUnit.test("{{render}} helper should render templates both with and without models", function() {
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

  var PostController = EmberController.extend();
  container._registry.register('controller:post', PostController, { singleton: false });

  Ember.TEMPLATES['post'] = compile("<p>Title:{{model.title}}</p>");

  runAppend(view);

  var postController1 = view.childViews[0].get('controller');
  var postController2 = view.childViews[1].get('controller');

  ok(view.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));
  equal(postController1.get('model'), null);
  equal(postController2.get('model'), post);

  runSet(controller, 'post', { title: "Rails is unagi" });

  ok(view.$().text().match(/^HI ?Title: ?Title:Rails is unagi$/));
  if (canDefineNonEnumerableProperties) {
    deepEqual(postController2.get('model'), { title: "Rails is unagi" });
  } else {
    equal(postController2.get('model').title, "Rails is unagi");
  }
});

QUnit.test("{{render}} helper should link child controllers to the parent controller", function() {
  var parentTriggered = 0;

  var template = '<h1>HI</h1>{{render "posts"}}';
  var controller = EmberController.extend({
    container: container,
    actions: {
      parentPlease() {
        parentTriggered++;
      }
    },
    role: "Mom"
  });

  container._registry.register('controller:posts', EmberArrayController.extend());

  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['posts'] = compile('<button id="parent-action" {{action "parentPlease"}}>Go to {{parentController.role}}</button>');

  runAppend(view);

  var button = jQuery("#parent-action");
  var actionId = button.data('ember-action');
  var action = ActionManager.registeredActions[actionId];
  var handler = action.handler;

  equal(button.text(), "Go to Mom", "The parentController property is set on the child controller");

  run(null, handler, new jQuery.Event("click"));

  equal(parentTriggered, 1, "The event bubbled to the parent");
});

QUnit.test("{{render}} helper should be able to render a template again when it was removed", function() {
  var controller = EmberController.extend({ container: container });
  var CoreOutlet = container.lookupFactory('view:core-outlet');
  view = CoreOutlet.create();
  runAppend(view);

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  var liveRoutes = {
    render: {
      template: compile("<h1>HI</h1>{{outlet}}")
    },
    outlets: {}
  };

  run(function() {
    liveRoutes.outlets.main = {
      render: {
        controller: controller.create(),
        template: compile("<div>1{{render 'home'}}</div>")
      }
    };
    view.setOutletState(liveRoutes);
  });

  equal(view.$().text(), 'HI1BYE');

  run(function() {
    liveRoutes.outlets.main = {
      render: {
        controller: controller.create(),
        template: compile("<div>2{{render 'home'}}</div>")
      }
    };
    view.setOutletState(liveRoutes);
  });

  equal(view.$().text(), 'HI2BYE');
});

QUnit.test("{{render}} works with dot notation", function() {
  var template = '<h1>BLOG</h1>{{render "blog.post"}}';

  var controller = EmberController.extend({ container: container });
  container._registry.register('controller:blog.post', EmberController.extend());

  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['blog.post'] = compile("<p>POST</p>");

  runAppend(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('blog.post');
  equal(renderedView.get('viewName'), 'blogPost', 'camelizes the view name');
  equal(container.lookup('controller:blog.post'), renderedView.get('controller'), 'rendered with correct controller');
});

QUnit.test("{{render}} works with slash notation", function() {
  var template = '<h1>BLOG</h1>{{render "blog/post"}}';

  var controller = EmberController.extend({ container: container });
  container._registry.register('controller:blog.post', EmberController.extend());

  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['blog.post'] = compile("<p>POST</p>");

  runAppend(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('blog.post');
  equal(renderedView.get('viewName'), 'blogPost', 'camelizes the view name');
  equal(container.lookup('controller:blog.post'), renderedView.get('controller'), 'rendered with correct controller');
});

QUnit.test("throws an assertion if {{render}} is called with an unquoted template name", function() {
  var template = '<h1>HI</h1>{{render home}}';
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    runAppend(view);
  }, "The first argument of {{render}} must be quoted, e.g. {{render \"sidebar\"}}.");
});

QUnit.test("throws an assertion if {{render}} is called with a literal for a model", function() {
  var template = '<h1>HI</h1>{{render "home" "model"}}';
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  expectAssertion(function() {
    runAppend(view);
  }, "The second argument of {{render}} must be a path, e.g. {{render \"post\" post}}.");
});

QUnit.test("{{render}} helper should let view provide its own template", function() {
  var template = "{{render 'fish'}}";
  var controller = EmberController.extend({ container: container });
  view = EmberView.create({
    controller: controller.create(),
    template: compile(template)
  });

  container._registry.register('template:fish', compile('Hello fish!'));
  container._registry.register('template:other', compile('Hello other!'));

  container._registry.register('view:fish', EmberView.extend({
    templateName: 'other'
  }));

  runAppend(view);

  equal(view.$().text(), 'Hello other!');
});
