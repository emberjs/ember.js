import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { observer } from 'ember-metal/mixin';
import EmberController from 'ember-runtime/controllers/controller';
import { compile, Component } from '../utils/helpers';
import EmberView from 'ember-views/views/view';
import { buildAppInstance } from 'ember-htmlbars/tests/utils';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { OWNER } from 'container/owner';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

function runSet(object, key, value) {
  run(() => set(object, key, value));
}

let view, appInstance;

QUnit.module('ember-htmlbars: {{render}} helper', {
  setup() {
    appInstance = buildAppInstance();
  },

  teardown() {
    runDestroy(appInstance);
    runDestroy(view);
    setTemplates({});
  }
});

QUnit.test('{{render}} helper should render given template', function() {
  let template = '<h1>HI</h1>{{render \'home\'}}';
  let controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  setTemplate('home', compile('<p>BYE</p>'));

  runAppend(view);

  equal(view.$().text(), 'HIBYE');
  // This is a poor assertion. What is really being tested is that
  // a second render with the same name will throw an assert.
  ok(appInstance.lookup('router:main')._lookupActiveComponentNode('home'), 'should register home as active view');
});

QUnit.test('{{render}} helper should render nested helpers', function() {
  let template = '<h1>HI</h1>{{render \'foo\'}}';
  let controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  setTemplate('foo', compile('<p>FOO</p>{{render \'bar\'}}'));
  setTemplate('bar', compile('<p>BAR</p>{{render \'baz\'}}'));
  setTemplate('baz', compile('<p>BAZ</p>'));

  runAppend(view);

  equal(view.$().text(), 'HIFOOBARBAZ');
});

QUnit.test('{{render}} helper should have assertion if neither template nor view exists', function() {
  let template = '<h1>HI</h1>{{render \'oops\'}}';
  let controller = EmberController.extend();

  view = EmberView.create({
    [OWNER]: appInstance,
    controller: controller.create(),
    template: compile(template)
  });

  expectAssertion(() => {
    runAppend(view);
  }, 'You used `{{render \'oops\'}}`, but \'oops\' can not be found as a template.');
});

QUnit.test('{{render}} helper should render given template with a supplied model', function() {
  let template = '<h1>HI</h1>{{render \'post\' post}}';
  let component;
  let post = {
    title: 'Rails is omakase'
  };

  expectDeprecation(() => {
    component = Component.create({
      [OWNER]: appInstance,
      post: post,
      layout: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let postController;
  let PostController = EmberController.extend({
    init() {
      this._super(...arguments);
      postController = this;
    }
  });
  appInstance.register('controller:post', PostController);

  setTemplate('post', compile('<p>{{model.title}}</p>'));

  runAppend(component);

  equal(component.$().text(), 'HIRails is omakase');
  equal(postController.get('model'), post);

  runSet(component, 'post', { title: 'Rails is unagi' });

  equal(component.$().text(), 'HIRails is unagi');
  deepEqual(postController.get('model'), { title: 'Rails is unagi' });
});

QUnit.test('{{render}} helper with a supplied model should not fire observers on the controller', function () {
  let template = '<h1>HI</h1>{{render \'post\' post}}';
  let post = {
    title: 'Rails is omakase'
  };
  let controller = EmberController.create({
    [OWNER]: appInstance,
    post: post
  });

  expectDeprecation(() => {
    view = EmberView.create({
      [OWNER]: appInstance,
      controller,
      template: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let PostController = EmberController.extend({
    modelDidChange: observer('model', () => modelDidChange++)
  });

  appInstance.register('controller:post', PostController);

  setTemplate('post', compile('<p>{{title}}</p>'));

  let modelDidChange = 0;
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

  setTemplate('home', compile('<p>BYE</p>'));

  expectAssertion(() => {
    runAppend(view);
  }, 'The controller name you supplied \'postss\' did not resolve to a controller.');
});

QUnit.test('{{render}} helper should render with given controller', function() {
  let template = '{{render "home" controller="posts"}}';
  let Controller = EmberController.extend();
  let model = {};
  let controller = Controller.create({
    [OWNER]: appInstance
  });
  let id = 0;

  appInstance.register('controller:posts', EmberController.extend({
    init() {
      this._super(...arguments);
      this.uniqueId = id++;
      this.set('model', model);
    }
  }));

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  setTemplate('home', compile('{{uniqueId}}'));

  runAppend(view);

  let renderedController = appInstance.lookup('controller:posts');
  let uniqueId = renderedController.get('uniqueId');
  let renderedModel = renderedController.get('model');
  equal(uniqueId, 0, 'precond - first uniqueId is used for singleton');
  equal(uniqueId, view.$().html(), 'rendered with singleton controller');
  equal(renderedModel, model, 'rendered with model on controller');
});

QUnit.test('{{render}} helper should rerender with given controller', function() {
  let template = '{{render "home" controller="posts"}}';
  let Controller = EmberController.extend();
  let model = {};
  let controller = Controller.create({
    [OWNER]: appInstance
  });
  let id = 0;

  appInstance.register('controller:posts', EmberController.extend({
    init() {
      this._super(...arguments);
      this.uniqueId = id++;
      this.set('model', model);
    }
  }));

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  setTemplate('home', compile('{{uniqueId}}'));

  runAppend(view);
  run(() => {
    view.rerender();
  });

  let renderedController = appInstance.lookup('controller:posts');
  let uniqueId = renderedController.get('uniqueId');
  let renderedModel = renderedController.get('model');

  equal(uniqueId, 0, 'precond - first uniqueId is used for singleton');
  equal(uniqueId, view.$().html(), 'rendered with singleton controller');
  equal(renderedModel, model, 'rendered with model on controller');
});

QUnit.test('{{render}} helper should render a template without a model only once', function() {
  let template = '<h1>HI</h1>{{render \'home\'}}<hr/>{{render \'home\'}}';
  let Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  setTemplate('home', compile('<p>BYE</p>'));

  expectAssertion(() => {
    runAppend(view);
  }, /\{\{render\}\} helper once/i);
});

QUnit.test('{{render}} helper should render templates with models multiple times', function() {
  let template = '<h1>HI</h1> {{render \'post\' post1}} {{render \'post\' post2}}';
  let post1 = {
    title: 'Me first'
  };
  let post2 = {
    title: 'Then me'
  };
  let component;

  expectDeprecation(() => {
    component = Component.create({
      [OWNER]: appInstance,
      post1,
      post2,
      layout: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let postController1, postController2;
  let PostController = EmberController.extend({
    init() {
      this._super(...arguments);
      if (!postController1) {
        postController1 = this;
      } else if (!postController2) {
        postController2 = this;
      }
    }
  });
  appInstance.register('controller:post', PostController, { singleton: false });

  setTemplate('post', compile('<p>{{model.title}}</p>'));

  runAppend(component);

  ok(component.$().text().match(/^HI ?Me first ?Then me$/));
  equal(postController1.get('model'), post1);
  equal(postController2.get('model'), post2);

  runSet(component, 'post1', { title: 'I am new' });

  ok(component.$().text().match(/^HI ?I am new ?Then me$/));
  deepEqual(postController1.get('model'), { title: 'I am new' });
});

QUnit.test('{{render}} helper should not leak controllers', function() {
  let template = '<h1>HI</h1> {{render \'post\' post1}}';
  let post1 = {
    title: 'Me first'
  };

  let Controller = EmberController.extend({
    post1: post1
  });

  let controller = Controller.create({
    [OWNER]: appInstance
  });

  expectDeprecation(() => {
    view = EmberView.create({
      [OWNER]: appInstance,
      controller: controller,
      template: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let postController;
  let PostController = EmberController.extend({
    init() {
      this._super(...arguments);
      postController = this;
    }
  });
  appInstance.register('controller:post', PostController);

  setTemplate('post', compile('<p>{{title}}</p>'));

  runAppend(view);

  runDestroy(view);

  ok(postController.isDestroyed, 'expected postController to be destroyed');
});

QUnit.test('{{render}} helper should not treat invocations with falsy contexts as context-less', function() {
  let template = '<h1>HI</h1> {{render \'post\' zero}} {{render \'post\' nonexistent}}';
  let component;

  expectDeprecation(() => {
    component = Component.create({
      [OWNER]: appInstance,
      zero: false,
      layout: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let postController1, postController2;
  let PostController = EmberController.extend({
    init() {
      this._super(...arguments);
      if (!postController1) {
        postController1 = this;
      } else if (!postController2) {
        postController2 = this;
      }
    }
  });
  appInstance.register('controller:post', PostController, { singleton: false });

  setTemplate('post', compile('<p>{{#unless model}}NOTHING{{/unless}}</p>'));

  runAppend(component);

  ok(component.$().text().match(/^HI ?NOTHING ?NOTHING$/));
  equal(postController1.get('model'), 0);
  equal(postController2.get('model'), undefined);
});

QUnit.test('{{render}} helper should render templates both with and without models', function() {
  let template = '<h1>HI</h1> {{render \'post\'}} {{render \'post\' post}}';
  let post = {
    title: 'Rails is omakase'
  };
  let component;

  expectDeprecation(() => {
    component = Component.create({
      [OWNER]: appInstance,
      post,
      template: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let postController1, postController2;
  let PostController = EmberController.extend({
    init() {
      this._super(...arguments);
      if (!postController1) {
        postController1 = this;
      } else if (!postController2) {
        postController2 = this;
      }
    }
  });
  appInstance.register('controller:post', PostController, { singleton: false });

  setTemplate('post', compile('<p>Title:{{model.title}}</p>'));

  runAppend(component);

  ok(component.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));
  equal(postController1.get('model'), null);
  equal(postController2.get('model'), post);

  runSet(component, 'post', { title: 'Rails is unagi' });

  ok(component.$().text().match(/^HI ?Title: ?Title:Rails is unagi$/));
  deepEqual(postController2.get('model'), { title: 'Rails is unagi' });
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

  setTemplate('home', compile('<p>BYE</p>'));

  let liveRoutes = {
    render: {
      template: compile('<h1>HI</h1>{{outlet}}')
    },
    outlets: {}
  };

  run(() => {
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

  run(() => {
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
  let template = '{{render "blog.post"}}';

  let ContextController = EmberController.extend();
  let contextController = ContextController.create({
    [OWNER]: appInstance
  });

  let controller;
  let id = 0;
  let BlogPostController = EmberController.extend({
    init() {
      this._super(...arguments);
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

  setTemplate('blog.post', compile('{{uniqueId}}'));

  runAppend(view);

  let singletonController = appInstance.lookup('controller:blog.post');
  equal(singletonController.uniqueId, view.$().html(), 'rendered with correct singleton controller');
});

QUnit.test('throws an assertion if {{render}} is called with an unquoted template name', function() {
  let template = '<h1>HI</h1>{{render home}}';
  let Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    controller,
    template: compile(template)
  });

  setTemplate('home', compile('<p>BYE</p>'));

  expectAssertion(() => {
    runAppend(view);
  }, 'The first argument of {{render}} must be quoted, e.g. {{render "sidebar"}}.');
});

QUnit.test('throws an assertion if {{render}} is called with a literal for a model', function() {
  let template = '<h1>HI</h1>{{render "home" "model"}}';
  let Controller = EmberController.extend();
  let controller = Controller.create({
    [OWNER]: appInstance
  });

  view = EmberView.create({
    [OWNER]: appInstance,
    controller,
    template: compile(template)
  });

  setTemplate('home', compile('<p>BYE</p>'));

  expectAssertion(() => {
    runAppend(view);
  }, 'The second argument of {{render}} must be a path, e.g. {{render "post" post}}.');
});

QUnit.test('{{render}} helper should not require view to provide its own template', function() {
  let template = '{{render \'fish\'}}';
  let Controller = EmberController.extend();
  let controller = Controller.create({
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

QUnit.test('{{render}} helper should set router as target when parentController is not found', function() {
  expect(3);

  let template = `{{render 'post' post1}}`;

  expectDeprecation(() => {
    view = EmberView.create({
      [OWNER]: appInstance,
      template: compile(template)
    });
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  let postController;
  let PostController = EmberController.extend({
    init() {
      this._super(...arguments);
      postController = this;
    }
  });

  let routerStub = {
    send(actionName) {
      equal(actionName, 'someAction');
      ok(true, 'routerStub#send called');
    }
  };
  appInstance.register('router:main', routerStub, { instantiate: false });
  appInstance.register('controller:post', PostController);
  appInstance.register('template:post', compile('post template'));

  runAppend(view);

  postController.send('someAction');
});
