import { moduleFor, ApplicationTestCase, strip } from 'internal-test-helpers';

import { ENV } from '@ember/-internals/environment';
import Controller from '@ember/controller';
import { Route } from '@ember/-internals/routing';
import { Component } from '@ember/-internals/glimmer';
import { set, tracked } from '@ember/-internals/metal';
import { backtrackingMessageFor } from '../../utils/backtracking-rerender';
import { runTask } from '../../../../../../internal-test-helpers/lib/run';

moduleFor(
  'Application test: rendering',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this._APPLICATION_TEMPLATE_WRAPPER = ENV._APPLICATION_TEMPLATE_WRAPPER;
    }

    teardown() {
      super.teardown();
      ENV._APPLICATION_TEMPLATE_WRAPPER = this._APPLICATION_TEMPLATE_WRAPPER;
    }

    ['@test it can render the application template with a wrapper']() {
      ENV._APPLICATION_TEMPLATE_WRAPPER = true;

      this.addTemplate('application', 'Hello world!');

      return this.visit('/').then(() => {
        this.assertComponentElement(this.element, { content: 'Hello world!' });
      });
    }

    ['@test it can render the application template without a wrapper']() {
      ENV._APPLICATION_TEMPLATE_WRAPPER = false;

      this.addTemplate('application', 'Hello world!');

      return this.visit('/').then(() => {
        this.assertInnerHTML('Hello world!');
      });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) it can access the model provided by the route via @model']() {
      this.add(
        'route:application',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'application',
        strip`
        <ul>
          {{#each @model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
        <ul>
          <li>red</li>
          <li>yellow</li>
          <li>blue</li>
        </ul>
      `);
      });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) it cannot access the model provided by the route via @model']() {
      this.add(
        'route:application',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'application',
        strip`
        <ul>
          {{#each @model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML('<ul><!----></ul>');
      });
    }

    ['@test it can access the model provided by the route via this.model']() {
      this.add(
        'route:application',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'application',
        strip`
        <ul>
          {{#each this.model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
        <ul>
          <li>red</li>
          <li>yellow</li>
          <li>blue</li>
        </ul>
      `);
      });
    }

    ['@test it can access the model provided by the route via implicit this fallback']() {
      this.add(
        'route:application',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'application',
        strip`
        <ul>
          {{#each model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML(strip`
        <ul>
          <li>red</li>
          <li>yellow</li>
          <li>blue</li>
        </ul>
      `);
      });
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) interior mutations on the model with set'](assert) {
      this.router.map(function() {
        this.route('color', { path: '/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model({ color }) {
            return { color };
          },
        })
      );

      this.addTemplate(
        'color',
        strip`
        [@model: {{@model.color}}]
        [this.model: {{this.model.color}}]
        [model: {{model.color}}]
        `
      );

      await this.visit('/red');

      assert.equal(this.currentURL, '/red');

      this.assertInnerHTML(strip`
        [@model: red]
        [this.model: red]
        [model: red]
      `);

      await this.visit('/yellow');

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: yellow]
        [this.model: yellow]
        [model: yellow]
      `);

      runTask(() => {
        let { model } = this.controllerFor('color');
        set(model, 'color', 'blue');
      });

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: blue]
        [this.model: blue]
        [model: blue]
      `);
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) interior mutations on the model with tracked properties'](
      assert
    ) {
      class Model {
        @tracked color;

        constructor(color) {
          this.color = color;
        }
      }

      this.router.map(function() {
        this.route('color', { path: '/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model({ color }) {
            return new Model(color);
          },
        })
      );

      this.addTemplate(
        'color',
        strip`
        [@model: {{@model.color}}]
        [this.model: {{this.model.color}}]
        [model: {{model.color}}]
        `
      );

      await this.visit('/red');

      assert.equal(this.currentURL, '/red');

      this.assertInnerHTML(strip`
        [@model: red]
        [this.model: red]
        [model: red]
      `);

      await this.visit('/yellow');

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: yellow]
        [this.model: yellow]
        [model: yellow]
      `);

      runTask(() => {
        this.controllerFor('color').model.color = 'blue';
      });

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: blue]
        [this.model: blue]
        [model: blue]
      `);
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) exterior mutations on the model with set'](assert) {
      this.router.map(function() {
        this.route('color', { path: '/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model({ color }) {
            return color;
          },
        })
      );

      this.addTemplate(
        'color',
        strip`
        [@model: {{@model}}]
        [this.model: {{this.model}}]
        [model: {{model}}]
        `
      );

      await this.visit('/red');

      assert.equal(this.currentURL, '/red');

      this.assertInnerHTML(strip`
        [@model: red]
        [this.model: red]
        [model: red]
      `);

      await this.visit('/yellow');

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: yellow]
        [this.model: yellow]
        [model: yellow]
      `);

      runTask(() => {
        let controller = this.controllerFor('color');
        set(controller, 'model', 'blue');
      });

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: yellow]
        [this.model: blue]
        [model: blue]
      `);
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) exterior mutations on the model with tracked properties'](
      assert
    ) {
      this.router.map(function() {
        this.route('color', { path: '/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model({ color }) {
            return color;
          },
        })
      );

      this.add(
        'controller:color',
        class ColorController extends Controller {
          @tracked model;
        }
      );

      this.addTemplate(
        'color',
        strip`
        [@model: {{@model}}]
        [this.model: {{this.model}}]
        [model: {{model}}]
        `
      );

      await this.visit('/red');

      assert.equal(this.currentURL, '/red');

      this.assertInnerHTML(strip`
        [@model: red]
        [this.model: red]
        [model: red]
      `);

      await this.visit('/yellow');

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: yellow]
        [this.model: yellow]
        [model: yellow]
      `);

      runTask(() => {
        this.controllerFor('color').model = 'blue';
      });

      assert.equal(this.currentURL, '/yellow');

      this.assertInnerHTML(strip`
        [@model: yellow]
        [this.model: blue]
        [model: blue]
      `);
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) it can render a nested route']() {
      this.router.map(function() {
        this.route('lists', function() {
          this.route('colors', function() {
            this.route('favorite');
          });
        });
      });

      // The "favorite" route will inherit the model
      this.add(
        'route:lists.colors',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'lists.colors.favorite',
        strip`
        <ul>
          {{#each this.model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/lists/colors/favorite').then(() => {
        this.assertInnerHTML(strip`
          <ul>
            <li>red</li>
            <li>yellow</li>
            <li>blue</li>
          </ul>
        `);
      });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) it can render a nested route']() {
      this.router.map(function() {
        this.route('lists', function() {
          this.route('colors', function() {
            this.route('favorite');
          });
        });
      });

      // The "favorite" route will inherit the model
      this.add(
        'route:lists.colors',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'lists.colors.favorite',
        strip`
        <ul>
          {{#each @model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/lists/colors/favorite').then(() => {
        this.assertInnerHTML(strip`
          <ul>
            <li>red</li>
            <li>yellow</li>
            <li>blue</li>
          </ul>
        `);
      });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) it can render into named outlets']() {
      this.router.map(function() {
        this.route('colors');
      });

      this.addTemplate(
        'application',
        strip`
        <nav>{{outlet "nav"}}</nav>
        <main>{{outlet}}</main>
        `
      );

      this.addTemplate(
        'nav',
        strip`
        <a href="https://emberjs.com/">Ember</a>
        `
      );

      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            this.render();
            this.render('nav', {
              into: 'application',
              outlet: 'nav',
            });
          },
        })
      );

      this.add(
        'route:colors',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'colors',
        strip`
        <ul>
          {{#each this.model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/colors').then(() => {
        this.assertInnerHTML(strip`
          <nav>
            <a href="https://emberjs.com/">Ember</a>
          </nav>
          <main>
            <ul>
              <li>red</li>
              <li>yellow</li>
              <li>blue</li>
            </ul>
          </main>
        `);
      });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) it can render into named outlets']() {
      this.router.map(function() {
        this.route('colors');
      });

      this.addTemplate(
        'application',
        strip`
        <nav>{{outlet "nav"}}</nav>
        <main>{{outlet}}</main>
        `
      );

      this.addTemplate(
        'nav',
        strip`
        <a href="https://emberjs.com/">Ember</a>
        `
      );

      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            this.render();
            this.render('nav', {
              into: 'application',
              outlet: 'nav',
            });
          },
        })
      );

      this.add(
        'route:colors',
        Route.extend({
          model() {
            return ['red', 'yellow', 'blue'];
          },
        })
      );

      this.addTemplate(
        'colors',
        strip`
        <ul>
          {{#each @model as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
        `
      );

      return this.visit('/colors').then(() => {
        this.assertInnerHTML(strip`
          <nav>
            <a href="https://emberjs.com/">Ember</a>
          </nav>
          <main>
            <ul>
              <li>red</li>
              <li>yellow</li>
              <li>blue</li>
            </ul>
          </main>
        `);
      });
    }

    ['@test it should update the outlets when switching between routes']() {
      this.router.map(function() {
        this.route('a');
        this.route('b', function() {
          this.route('c');
          this.route('d');
        });
      });

      this.addTemplate('a', 'A{{outlet}}');
      this.addTemplate('b', 'B{{outlet}}');
      this.addTemplate('b.c', 'C');
      this.addTemplate('b.d', 'D');

      return this.visit('/b/c')
        .then(() => {
          // this.assertComponentElement(this.firstChild, { content: 'BC' });
          this.assertText('BC');
          return this.visit('/a');
        })
        .then(() => {
          // this.assertComponentElement(this.firstChild, { content: 'A' });
          this.assertText('A');
          return this.visit('/b/d');
        })
        .then(() => {
          this.assertText('BD');
          // this.assertComponentElement(this.firstChild, { content: 'BD' });
        });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) it should produce a stable DOM when the model changes']() {
      this.router.map(function() {
        this.route('color', { path: '/colors/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model(params) {
            return params.color;
          },
        })
      );

      this.addTemplate('color', 'color: {{this.model}}');

      return this.visit('/colors/red')
        .then(() => {
          this.assertInnerHTML('color: red');
          this.takeSnapshot();
          return this.visit('/colors/green');
        })
        .then(() => {
          this.assertInnerHTML('color: green');
          this.assertInvariants();
        });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) it should produce a stable DOM when the model changes']() {
      this.router.map(function() {
        this.route('color', { path: '/colors/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model(params) {
            return params.color;
          },
        })
      );

      this.addTemplate('color', 'color: {{@model}}');

      return this.visit('/colors/red')
        .then(() => {
          this.assertInnerHTML('color: red');
          this.takeSnapshot();
          return this.visit('/colors/green');
        })
        .then(() => {
          this.assertInnerHTML('color: green');
          this.assertInvariants();
        });
    }

    ['@test it should have the right controller in scope for the route template']() {
      this.router.map(function() {
        this.route('a');
        this.route('b');
      });

      this.add(
        'controller:a',
        Controller.extend({
          value: 'a',
        })
      );

      this.add(
        'controller:b',
        Controller.extend({
          value: 'b',
        })
      );

      this.addTemplate('a', '{{value}}');
      this.addTemplate('b', '{{value}}');

      return this.visit('/a')
        .then(() => {
          this.assertText('a');
          return this.visit('/b');
        })
        .then(() => this.assertText('b'));
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) it should update correctly when the controller changes']() {
      this.router.map(function() {
        this.route('color', { path: '/colors/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model(params) {
            return { color: params.color };
          },

          renderTemplate(controller, model) {
            this.render({ controller: model.color, model });
          },
        })
      );

      this.add(
        'controller:red',
        Controller.extend({
          color: 'red',
        })
      );

      this.add(
        'controller:green',
        Controller.extend({
          color: 'green',
        })
      );

      this.addTemplate('color', 'model color: {{this.model.color}}, controller color: {{color}}');

      return this.visit('/colors/red')
        .then(() => {
          this.assertInnerHTML('model color: red, controller color: red');
          return this.visit('/colors/green');
        })
        .then(() => {
          this.assertInnerHTML('model color: green, controller color: green');
        });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) it should update correctly when the controller changes']() {
      this.router.map(function() {
        this.route('color', { path: '/colors/:color' });
      });

      this.add(
        'route:color',
        Route.extend({
          model(params) {
            return { color: params.color };
          },

          renderTemplate(controller, model) {
            this.render({ controller: model.color, model });
          },
        })
      );

      this.add(
        'controller:red',
        Controller.extend({
          color: 'red',
        })
      );

      this.add(
        'controller:green',
        Controller.extend({
          color: 'green',
        })
      );

      this.addTemplate('color', 'model color: {{@model.color}}, controller color: {{color}}');

      return this.visit('/colors/red')
        .then(() => {
          this.assertInnerHTML('model color: red, controller color: red');
          return this.visit('/colors/green');
        })
        .then(() => {
          this.assertInnerHTML('model color: green, controller color: green');
        });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) it should produce a stable DOM when two routes render the same template']() {
      this.router.map(function() {
        this.route('a');
        this.route('b');
      });

      this.add(
        'route:a',
        Route.extend({
          model() {
            return 'A';
          },

          renderTemplate(controller, model) {
            this.render('common', { controller: 'common', model });
          },
        })
      );

      this.add(
        'route:b',
        Route.extend({
          model() {
            return 'B';
          },

          renderTemplate(controller, model) {
            this.render('common', { controller: 'common', model });
          },
        })
      );

      this.add(
        'controller:common',
        Controller.extend({
          prefix: 'common',
        })
      );

      this.addTemplate('common', '{{prefix}} {{this.model}}');

      return this.visit('/a')
        .then(() => {
          this.assertInnerHTML('common A');
          this.takeSnapshot();
          return this.visit('/b');
        })
        .then(() => {
          this.assertInnerHTML('common B');
          this.assertInvariants();
        });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) it should produce a stable DOM when two routes render the same template']() {
      this.router.map(function() {
        this.route('a');
        this.route('b');
      });

      this.add(
        'route:a',
        Route.extend({
          model() {
            return 'A';
          },

          renderTemplate(controller, model) {
            this.render('common', { controller: 'common', model });
          },
        })
      );

      this.add(
        'route:b',
        Route.extend({
          model() {
            return 'B';
          },

          renderTemplate(controller, model) {
            this.render('common', { controller: 'common', model });
          },
        })
      );

      this.add(
        'controller:common',
        Controller.extend({
          prefix: 'common',
        })
      );

      this.addTemplate('common', '{{prefix}} {{@model}}');

      return this.visit('/a')
        .then(() => {
          this.assertInnerHTML('common A');
          this.takeSnapshot();
          return this.visit('/b');
        })
        .then(() => {
          this.assertInnerHTML('common B');
          this.assertInvariants();
        });
    }

    // Regression test, glimmer child outlets tried to assume the first element.
    // but the if put-args clobbered the args used by did-create-element.
    // I wish there was a way to assert that the OutletComponentManager did not
    // receive a didCreateElement.
    ['@test a child outlet is always a fragment']() {
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('index', '{{#if true}}1{{/if}}<div>2</div>');
      return this.visit('/').then(() => {
        this.assertInnerHTML('1<div>2</div>');
      });
    }

    ['@test it allows a transition during route activate']() {
      this.router.map(function() {
        this.route('a');
      });

      this.add(
        'route:index',
        Route.extend({
          activate() {
            this.transitionTo('a');
          },
        })
      );

      this.addTemplate('a', 'Hello from A!');

      return this.visit('/').then(() => {
        this.assertInnerHTML('Hello from A!');
      });
    }

    async ['@feature(!EMBER_ROUTING_MODEL_ARG) it emits a useful backtracking re-render assertion message'](
      assert
    ) {
      this.router.map(function() {
        this.route('routeWithError');
      });

      this.add(
        'controller:routeWithError',
        Controller.extend({
          toString() {
            return 'RouteWithErrorController';
          },
        })
      );

      this.add(
        'route:routeWithError',
        Route.extend({
          model() {
            return {
              name: 'Alex',
              toString() {
                return `Person (${this.name})`;
              },
            };
          },
        })
      );

      this.addTemplate('routeWithError', 'Hi {{this.model.name}} <Foo @person={{this.model}} />');

      this.addComponent('foo', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.set('person.name', 'Ben');
          },
        }),
        template: 'Hi {{this.person.name}} from component',
      });

      let expectedBacktrackingMessage = backtrackingMessageFor('name', 'Person \\(Ben\\)', {
        renderTree: ['application', 'routeWithError', 'this.model.name'],
      });

      await this.visit('/');

      return assert.rejectsAssertion(this.visit('/routeWithError'), expectedBacktrackingMessage);
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) it emits a useful backtracking re-render assertion message'](
      assert
    ) {
      this.router.map(function() {
        this.route('routeWithError');
      });

      this.add(
        'route:routeWithError',
        Route.extend({
          model() {
            return {
              name: 'Alex',
              toString() {
                return `Person (${this.name})`;
              },
            };
          },
        })
      );

      this.addTemplate('routeWithError', 'Hi {{@model.name}} <Foo @person={{@model}} />');

      let expectedBacktrackingMessage = backtrackingMessageFor('name', 'Person \\(Ben\\)', {
        renderTree: ['application', 'routeWithError', '@model.name'],
      });

      await this.visit('/');

      this.addComponent('foo', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.set('person.name', 'Ben');
          },
        }),
        template: 'Hi {{this.person.name}} from component',
      });

      return assert.rejectsAssertion(this.visit('/routeWithError'), expectedBacktrackingMessage);
    }

    ['@test route templates with {{{undefined}}} [GH#14924] [GH#16172]']() {
      this.router.map(function() {
        this.route('first');
        this.route('second');
      });

      this.addTemplate('first', 'first');
      this.addTemplate('second', '{{{undefined}}}second');

      return this.visit('/first')
        .then(() => {
          this.assertText('first');
          return this.visit('/second');
        })
        .then(() => {
          this.assertText('second');
          return this.visit('/first');
        })
        .then(() => {
          this.assertText('first');
        });
    }
  }
);
