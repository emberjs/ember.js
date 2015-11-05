import Ember from 'ember-metal/core'; // TEMPLATES
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { observer } from 'ember-metal/mixin';

import EmberController from 'ember-runtime/controllers/controller';

import compile from 'ember-template-compiler/system/compile';

import EmberView from 'ember-views/views/view';
import jQuery from 'ember-views/system/jquery';
import ActionManager from 'ember-views/system/action_manager';

import { buildAppInstance } from 'ember-routing-htmlbars/tests/utils';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { OWNER } from 'container/owner';

function runSet(object, key, value) {
  run(function() {
    set(object, key, value);
  });
}

var view, appInstance;

QUnit.module('ember-routing-htmlbars: {{render}} helper', {
  setup() {
    appInstance = buildAppInstance();
  },

  teardown() {
    runDestroy(appInstance);
    runDestroy(view);

    Ember.TEMPLATES = {};
  }
});

QUnit.test('{{render}} helper should render given template', function() {
  var template = '<h1>HI</h1>{{render \'home\'}}';
  var controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile('<p>BYE</p>');

  runAppend(view);

  equal(view.$().text(), 'HIBYE');
  // This is a poor assertion. What is really being tested is that
  // a second render with the same name will throw an assert.
  ok(appInstance.lookup('router:main')._lookupActiveComponentNode('home'), 'should register home as active view');
});

QUnit.test('{{render}} helper should render nested helpers', function() {
  var template = '<h1>HI</h1>{{render \'foo\'}}';
  var controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  Ember.TEMPLATES['foo'] = compile('<p>FOO</p>{{render \'bar\'}}');
  Ember.TEMPLATES['bar'] = compile('<p>BAR</p>{{render \'baz\'}}');
  Ember.TEMPLATES['baz'] = compile('<p>BAZ</p>');

  runAppend(view);

  equal(view.$().text(), 'HIFOOBARBAZ');
});

QUnit.test('{{render}} helper should have assertion if neither template nor view exists', function() {
  var template = '<h1>HI</h1>{{render \'oops\'}}';
  var controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  expectAssertion(function() {
    runAppend(view);
  }, 'You used `{{render \'oops\'}}`, but \'oops\' can not be found as either a template or a view.');
});

QUnit.test('{{render}} helper should not have assertion if template is supplied in block-form', function() {
  var template = '<h1>HI</h1>{{#render \'good\'}} {{name}}{{/render}}';
  var controller = EmberController.extend();
  appInstance.register('controller:good', EmberController.extend({ name: 'Rob' }));

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'HI Rob');
});

QUnit.test('{{render}} helper should not have assertion if view exists without a template', function() {
  var template = '<h1>HI</h1>{{render \'oops\'}}';
  var controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  appInstance.register('view:oops', EmberView.extend());

  runAppend(view);

  equal(view.$().text(), 'HI');
});

QUnit.test('{{render}} helper should render given template with a supplied model', function() {
  var template = '<h1>HI</h1>{{render \'post\' post}}';
  var post = {
    title: 'Rails is omakase'
  };

  var Controller = EmberController.extend({
    post: post
  });

  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller,
    template: compile(template)
  });

  var postController;
  var PostController = EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      postController = this;
    }
  });
  appInstance.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile('<p>{{model.title}}</p>');

  runAppend(view);

  equal(view.$().text(), 'HIRails is omakase');
  equal(postController.get('model'), post);

  runSet(controller, 'post', { title: 'Rails is unagi' });

  equal(view.$().text(), 'HIRails is unagi');
  deepEqual(postController.get('model'), { title: 'Rails is unagi' });
});

QUnit.test('{{render}} helper with a supplied model should not fire observers on the controller', function () {
  var template = '<h1>HI</h1>{{render \'post\' post}}';
  var post = {
    title: 'Rails is omakase'
  };
  let controller = EmberController.create({
    [OWNER]: appInstance,
    post: post
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  var PostController = EmberController.extend({
    modelDidChange: observer('model', function() {
      modelDidChange++;
    })
  });

  appInstance.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile('<p>{{title}}</p>');

  var modelDidChange = 0;
  runAppend(view);
  equal(modelDidChange, 0, 'model observer did not fire');
});

QUnit.test('{{render}} helper should raise an error when a given controller name does not resolve to a controller', function() {
  let template = '<h1>HI</h1>{{render "home" controller="postss"}}';
  let Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  appInstance.register('controller:posts', EmberController.extend());

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile('<p>BYE</p>');

  expectAssertion(function() {
    runAppend(view);
  }, 'The controller name you supplied \'postss\' did not resolve to a controller.');
});

QUnit.test('{{render}} helper should render with given controller', function() {
  var template = '{{render "home" controller="posts"}}';
  var Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });
  var id = 0;

  appInstance.register('controller:posts', EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      this.uniqueId = id++;
    }
  }));

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile('{{uniqueId}}');

  runAppend(view);

  var uniqueId = appInstance.lookup('controller:posts').get('uniqueId');
  equal(uniqueId, 0, 'precond - first uniqueId is used for singleton');
  equal(uniqueId, view.$().html(), 'rendered with singleton controller');
});

QUnit.test('{{render}} helper should render a template without a model only once', function() {
  var template = '<h1>HI</h1>{{render \'home\'}}<hr/>{{render \'home\'}}';
  var Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile('<p>BYE</p>');

  expectAssertion(function() {
    runAppend(view);
  }, /\{\{render\}\} helper once/i);
});

QUnit.test('{{render}} helper should render templates with models multiple times', function() {
  var template = '<h1>HI</h1> {{render \'post\' post1}} {{render \'post\' post2}}';
  var post1 = {
    title: 'Me first'
  };
  var post2 = {
    title: 'Then me'
  };

  var Controller = EmberController.extend({
    post1: post1,
    post2: post2
  });

  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller,
    template: compile(template)
  });

  var postController1, postController2;
  var PostController = EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      if (!postController1) {
        postController1 = this;
      } else if (!postController2) {
        postController2 = this;
      }
    }
  });
  appInstance.register('controller:post', PostController, { singleton: false });

  Ember.TEMPLATES['post'] = compile('<p>{{model.title}}</p>');

  runAppend(view);

  ok(view.$().text().match(/^HI ?Me first ?Then me$/));
  equal(postController1.get('model'), post1);
  equal(postController2.get('model'), post2);

  runSet(controller, 'post1', { title: 'I am new' });

  ok(view.$().text().match(/^HI ?I am new ?Then me$/));
  deepEqual(postController1.get('model'), { title: 'I am new' });
});

QUnit.test('{{render}} helper should not leak controllers', function() {
  var template = '<h1>HI</h1> {{render \'post\' post1}}';
  var post1 = {
    title: 'Me first'
  };

  var Controller = EmberController.extend({
    post1: post1
  });

  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller,
    template: compile(template)
  });

  var postController;
  var PostController = EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      postController = this;
    }
  });
  appInstance.register('controller:post', PostController);

  Ember.TEMPLATES['post'] = compile('<p>{{title}}</p>');

  runAppend(view);

  runDestroy(view);

  ok(postController.isDestroyed, 'expected postController to be destroyed');
});

QUnit.test('{{render}} helper should not treat invocations with falsy contexts as context-less', function() {
  var template = '<h1>HI</h1> {{render \'post\' zero}} {{render \'post\' nonexistent}}';

  let controller = EmberController.create({
    [OWNER]: appInstance,
    zero: false
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  var postController1, postController2;
  var PostController = EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      if (!postController1) {
        postController1 = this;
      } else if (!postController2) {
        postController2 = this;
      }
    }
  });
  appInstance.register('controller:post', PostController, { singleton: false });

  Ember.TEMPLATES['post'] = compile('<p>{{#unless model}}NOTHING{{/unless}}</p>');

  runAppend(view);

  ok(view.$().text().match(/^HI ?NOTHING ?NOTHING$/));
  equal(postController1.get('model'), 0);
  equal(postController2.get('model'), undefined);
});

QUnit.test('{{render}} helper should render templates both with and without models', function() {
  var template = '<h1>HI</h1> {{render \'post\'}} {{render \'post\' post}}';
  var post = {
    title: 'Rails is omakase'
  };

  var Controller = EmberController.extend({
    post: post
  });

  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller,
    template: compile(template)
  });

  var postController1, postController2;
  var PostController = EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      if (!postController1) {
        postController1 = this;
      } else if (!postController2) {
        postController2 = this;
      }
    }
  });
  appInstance.register('controller:post', PostController, { singleton: false });

  Ember.TEMPLATES['post'] = compile('<p>Title:{{model.title}}</p>');

  runAppend(view);

  ok(view.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));
  equal(postController1.get('model'), null);
  equal(postController2.get('model'), post);

  runSet(controller, 'post', { title: 'Rails is unagi' });

  ok(view.$().text().match(/^HI ?Title: ?Title:Rails is unagi$/));
  deepEqual(postController2.get('model'), { title: 'Rails is unagi' });
});

QUnit.test('{{render}} helper should link child controllers to the parent controller', function() {
  let parentTriggered = 0;
  let template = '<h1>HI</h1>{{render "posts"}}';
  let Controller = EmberController.extend({
    actions: {
      parentPlease() {
        parentTriggered++;
      }
    },
    role: 'Mom'
  });
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  appInstance.register('controller:posts', EmberController.extend());

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  Ember.TEMPLATES['posts'] = compile('<button id="parent-action" {{action "parentPlease"}}>Go to {{parentController.role}}</button>');

  runAppend(view);

  var button = jQuery('#parent-action');
  var actionId = button.data('ember-action');
  var [ action ] = ActionManager.registeredActions[actionId];
  var handler = action.handler;

  equal(button.text(), 'Go to Mom', 'The parentController property is set on the child controller');

  run(null, handler, new jQuery.Event('click'));

  equal(parentTriggered, 1, 'The event bubbled to the parent');
});

QUnit.test('{{render}} helper should be able to render a template again when it was removed', function() {
  let CoreOutlet = appInstance._lookupFactory('view:core-outlet');
  let Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  view = CoreOutlet.create({
    [OWNER]: appInstance
  });

  Ember.TEMPLATES['home'] = compile('<p>BYE</p>');

  var liveRoutes = {
    render: {
      template: compile('<h1>HI</h1>{{outlet}}')
    },
    outlets: {}
  };

  run(function() {
    liveRoutes.outlets.main = {
      render: {
        controller,
        template: compile('<div>1{{render \'home\'}}</div>')
      }
    };
    view.setOutletState(liveRoutes);
  });
  runAppend(view);

  equal(view.$().text(), 'HI1BYE');

  run(function() {
    liveRoutes.outlets.main = {
      render: {
        controller,
        template: compile('<div>2{{render \'home\'}}</div>')
      }
    };
    view.setOutletState(liveRoutes);
  });

  equal(view.$().text(), 'HI2BYE');
});

QUnit.test('{{render}} works with dot notation', function() {
  var template = '{{render "blog.post"}}';

  var ContextController = EmberController.extend();
  var contextController = ContextController.create({
    [OWNER]: appInstance
  });

  var controller;
  var id = 0;
  var BlogPostController = EmberController.extend({
    init() {
      this._super.apply(this, arguments);
      controller = this;
      this.uniqueId = id++;
    }
  });
  appInstance.register('controller:blog.post', BlogPostController);

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: contextController,
    template: compile(template)
  });

  Ember.TEMPLATES['blog.post'] = compile('{{uniqueId}}');

  runAppend(view);

  var singletonController = appInstance.lookup('controller:blog.post');
  equal(singletonController.uniqueId, view.$().html(), 'rendered with correct singleton controller');
});

QUnit.test('throws an assertion if {{render}} is called with an unquoted template name', function() {
  var template = '<h1>HI</h1>{{render home}}';
  var Controller = EmberController.extend();
  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    controller,
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile('<p>BYE</p>');

  expectAssertion(function() {
    runAppend(view);
  }, 'The first argument of {{render}} must be quoted, e.g. {{render "sidebar"}}.');
});

QUnit.test('throws an assertion if {{render}} is called with a literal for a model', function() {
  var template = '<h1>HI</h1>{{render "home" "model"}}';
  var Controller = EmberController.extend();
  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  Ember.TEMPLATES['home'] = compile('<p>BYE</p>');

  expectAssertion(function() {
    runAppend(view);
  }, 'The second argument of {{render}} must be a path, e.g. {{render "post" post}}.');
});

QUnit.test('{{render}} helper should let view provide its own template', function() {
  var template = '{{render \'fish\'}}';
  var Controller = EmberController.extend();
  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  appInstance.register('template:fish', compile('Hello fish!'));
  appInstance.register('template:other', compile('Hello other!'));

  appInstance.register('view:fish', EmberView.extend({
    templateName: 'other'
  }));

  runAppend(view);

  equal(view.$().text(), 'Hello other!');
});

QUnit.test('{{render}} helper should not require view to provide its own template', function() {
  var template = '{{render \'fish\'}}';
  var Controller = EmberController.extend();
  var controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  appInstance.register('template:fish', compile('Hello fish!'));

  appInstance.register('view:fish', EmberView.extend());

  runAppend(view);

  equal(view.$().text(), 'Hello fish!');
});
