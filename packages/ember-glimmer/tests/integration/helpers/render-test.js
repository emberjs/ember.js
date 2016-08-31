import { observer } from 'ember-metal/mixin';
import Controller from 'ember-runtime/controllers/controller';
import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';
import EmberRouter from 'ember-routing/system/router';


moduleFor('Helpers test: {{render}}', class extends RenderingTest {
  ['@test should render given template']() {
    this.owner.register('controller:home', Controller.extend());
    this.registerTemplate('home', '<p>BYE</p>');

    this.render(`<h1>HI</h1>{{render 'home'}}`);

    this.assertText('HIBYE');
  }

  ['@test should render nested helpers']() {
    this.owner.register('controller:home', Controller.extend());
    this.owner.register('controller:foo', Controller.extend());
    this.owner.register('controller:bar', Controller.extend());
    this.owner.register('controller:baz', Controller.extend());

    this.registerTemplate('home', '<p>BYE</p>');
    this.registerTemplate('foo', `<p>FOO</p>{{render 'bar'}}`);
    this.registerTemplate('bar', `<p>BAR</p>{{render 'baz'}}`);
    this.registerTemplate('baz', `<p>BAZ</p>`);

    this.render('<h1>HI</h1>{{render \'foo\'}}');
    this.assertText('HIFOOBARBAZ');
  }

  ['@test should have assertion if the template does not exist']() {
    this.owner.register('controller:oops', Controller.extend());

    expectAssertion(() => {
      this.render(`<h1>HI</h1>{{render 'oops'}}`);
    }, 'You used `{{render \'oops\'}}`, but \'oops\' can not be found as a template.');
  }

  ['@test should render given template with the singleton controller as its context']() {
    this.owner.register('controller:post', Controller.extend({
      init() {
        this.set('title', `It's Simple Made Easy`);
      }
    }));
    this.registerTemplate('post', '<p>{{title}}</p>');

    this.render(`<h1>HI</h1>{{render 'post'}}`);

    this.assertText(`HIIt's Simple Made Easy`);

    this.runTask(() => this.rerender());

    this.assertText(`HIIt's Simple Made Easy`);

    let controller = this.owner.lookup('controller:post');

    this.runTask(() => set(controller, 'title', `Rails is omakase`));

    this.assertText(`HIRails is omakase`);

    this.runTask(() => set(controller, 'title', `It's Simple Made Easy`));

    this.assertText(`HIIt's Simple Made Easy`);
  }


  ['@test should render given template with a supplied model']() {
    this.owner.register('controller:post', Controller.extend());
    this.registerTemplate('post', '<p>{{model.title}}</p>');

    expectDeprecation(() => {
      this.render(`<h1>HI</h1>{{render 'post' post}}`, {
        post: {
          title: `It's Simple Made Easy`
        }
      });
    }, /Please refactor [\w\{\}"` ]+ to a component/);

    this.assertText(`HIIt's Simple Made Easy`);

    this.runTask(() => this.rerender());

    this.assertText(`HIIt's Simple Made Easy`);

    this.runTask(() => set(this.context, 'post.title', `Rails is omakase`));

    this.assertText(`HIRails is omakase`);

    this.runTask(() => set(this.context, 'post', { title: `It's Simple Made Easy` }));

    this.assertText(`HIIt's Simple Made Easy`);
  }

  ['@test with a supplied model should not fire observers on the controller']() {
    this.owner.register('controller:post', Controller.extend());
    this.registerTemplate('post', '<p>{{model.title}}</p>');

    let postDidChange = 0;
    expectDeprecation(() => {
      this.render(`<h1>HI</h1>{{render 'post' post}}`, {
        postDidChange: observer('post', function() {
          postDidChange++;
        }),
        post: {
          title: `It's Simple Made Easy`
        }
      });
    }, /Please refactor [\w\{\}"` ]+ to a component/);

    this.assertText(`HIIt's Simple Made Easy`);

    this.runTask(() => this.rerender());

    this.assertText(`HIIt's Simple Made Easy`);
  }

  ['@test should raise an error when a given controller name does not resolve to a controller']() {
    this.registerTemplate('home', '<p>BYE</p>');
    this.owner.register('controller:posts', Controller.extend());
    expectAssertion(() => {
      this.render(`<h1>HI</h1>{{render "home" controller="postss"}}`);
    }, /The controller name you supplied \'postss\' did not resolve to a controller./);
  }

  ['@test should render with given controller'](assert) {
    this.registerTemplate('home', '{{uniqueId}}');

    let id = 0;
    let model = {};

    this.owner.register('controller:posts', Controller.extend({
      init() {
        this._super(...arguments);
        this.uniqueId = id++;
        this.set('model', model);
      }
    }));

    this.render('{{render "home" controller="posts"}}');
    let renderedController = this.owner.lookup('controller:posts');
    let uniqueId = renderedController.get('uniqueId');
    let renderedModel = renderedController.get('model');

    assert.equal(uniqueId, 0);
    assert.equal(renderedModel, model);
    this.assertText('0');

    this.runTask(() => this.rerender());

    assert.equal(uniqueId, 0);
    assert.equal(renderedModel, model);
    this.assertText('0');
  }

  ['@test should render templates with models multiple times'](assert) {
    this.owner.register('controller:post', Controller.extend());

    this.registerTemplate('post', '<p>{{model.title}}</p>');
    expectDeprecation(() => {
      this.render(`<h1>HI</h1> {{render 'post' post1}} {{render 'post' post2}}`, {
        post1: {
          title: 'Me First'
        },
        post2: {
          title: 'Then me'
        }
      });
    }, /Please refactor [\w\{\}"` ]+ to a component/);

    this.assertText('HI Me First Then me');

    this.runTask(() => this.rerender());

    this.assertText('HI Me First Then me');

    this.runTask(() => set(this.context, 'post1.title', 'I am new'));

    this.assertText('HI I am new Then me');

    this.runTask(() => set(this.context, 'post1', { title: 'Me First' }));

    this.assertText('HI Me First Then me');
  }

  ['@test should not treat invocations with falsy contexts as context-less'](assert) {
    this.registerTemplate('post', '<p>{{#unless model.zero}}NOTHING{{/unless}}</p>');
    this.owner.register('controller:post', Controller.extend());

    expectDeprecation(() => {
      this.render(`<h1>HI</h1> {{render 'post' zero}} {{render 'post' nonexistent}}`, {
        model: {
          zero: false
        }
      });
    }, /Please refactor [\w\{\}"` ]+ to a component/);

    assert.ok(this.$().text().match(/^HI ?NOTHING ?NOTHING$/));
  }

  ['@test should render templates both with and without models'](assert) {
    this.registerTemplate('post', `<p>Title:{{model.title}}</p>`);
    this.owner.register('controller:post', Controller.extend());

    let post = {
      title: 'Rails is omakase'
    };
    expectDeprecation(() => {
      this.render(`<h1>HI</h1> {{render 'post'}} {{render 'post' post}}`, {
        post
      });
    }, /Please refactor [\w\{\}"` ]+ to a component/);

    assert.ok(this.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));

    this.runTask(() => this.rerender());

    assert.ok(this.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));

    this.runTask(() => set(this.context, 'post.title', 'Simple Made Easy'));

    assert.ok(this.$().text().match(/^HI ?Title: ?Title:Simple Made Easy$/));

    this.runTask(() => set(this.context, 'post',  { title: 'Rails is omakase' }));

    assert.ok(this.$().text().match(/^HI ?Title: ?Title:Rails is omakase$/));
  }

  ['@test works with dot notation']() {
    this.registerTemplate('blog.post', '{{uniqueId}}');

    let id = 0;
    this.owner.register('controller:blog.post', Controller.extend({
      init() {
        this._super(...arguments);
        this.uniqueId = id++;
      }
    }));

    this.render('{{render "blog.post"}}');

    this.assertText(`0`);
  }

  ['@test throws an assertion if called with an unquoted template name']() {
    this.registerTemplate('home', '<p>BYE</p>');

    expectAssertion(() => {
      this.render('<h1>HI</h1>{{render home}}');
    }, 'The first argument of {{render}} must be quoted, e.g. {{render "sidebar"}}.');
  }

  ['@test throws an assertion if called with a literal for a model']() {
    this.registerTemplate('home', '<p>BYE</p>');
    expectAssertion(() => {
      this.render('<h1>HI</h1>{{render "home" "model"}}', {
        model: {
          title: 'Simple Made Easy'
        }
      });
    }, 'The second argument of {{render}} must be a path, e.g. {{render "post" post}}.');
  }

  ['@skip should render a template without a model only once']() {
    this.owner.register('controller:home', Controller.extend());
    this.owner.register('router:main', EmberRouter.extend());
    this.registerTemplate('home', '<p>BYE</p>');

    expectAssertion(() => {
      this.render(`<h1>HI</h1>{{render 'home'}}<hr/>{{render 'home'}}`);
    }, /\{\{render\}\} helper once/i);
  }

  ['@test should set router as target when action not found on parentController is not found'](assert) {
    let postController;
    this.registerTemplate('post', 'post template');
    this.owner.register('controller:post', Controller.extend({
      init() {
        this._super(...arguments);
        postController = this;
      }
    }));

    let routerStub = {
      send(actionName) {
        assert.equal(actionName, 'someAction');
        assert.ok(true, 'routerStub#send called');
      }
    };

    this.owner.register('router:main', routerStub, { instantiate: false });

    expectDeprecation(() => {
      this.render(`{{render 'post' post1}}`);
    }, /Please refactor [\w\{\}"` ]+ to a component/);

    postController.send('someAction');
  }
});
