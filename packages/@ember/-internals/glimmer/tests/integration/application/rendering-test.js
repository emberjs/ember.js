import { ENV } from '@ember/-internals/environment';
import Controller from '@ember/controller';
import Service, { inject as injectService } from '@ember/service';
import { moduleFor, ApplicationTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { Route } from '@ember/-internals/routing';
import { Component, Helper } from '@ember/-internals/glimmer';

moduleFor(
  'Application test: rendering',
  class extends ApplicationTest {
    constructor() {
      super(...arguments);
      this._APPLICATION_TEMPLATE_WRAPPER = ENV._APPLICATION_TEMPLATE_WRAPPER;
      this._TEMPLATE_ONLY_GLIMMER_COMPONENTS = ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
    }

    teardown() {
      super.teardown();
      ENV._APPLICATION_TEMPLATE_WRAPPER = this._APPLICATION_TEMPLATE_WRAPPER;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = this._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
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

    ['@test it can access the model provided by the route']() {
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

    ['@test it can render a nested route']() {
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
        {{#each model as |item|}}
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

    ['@test it can render into named outlets']() {
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
        {{#each model as |item|}}
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

    ['@test it can render into named outlets']() {
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
        {{#each model as |item|}}
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

    ['@test it should produce a stable DOM when the model changes']() {
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

      this.addTemplate('color', 'color: {{model}}');

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

    ['@test it should update correctly when the controller changes']() {
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

      this.addTemplate('color', 'model color: {{model.color}}, controller color: {{color}}');

      return this.visit('/colors/red')
        .then(() => {
          this.assertInnerHTML('model color: red, controller color: red');
          return this.visit('/colors/green');
        })
        .then(() => {
          this.assertInnerHTML('model color: green, controller color: green');
        });
    }

    ['@test it should produce a stable DOM when two routes render the same template']() {
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

      this.addTemplate('common', '{{prefix}} {{model}}');

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

    ['@test it emits a useful backtracking re-render assertion message']() {
      this.router.map(function() {
        this.route('routeWithError');
      });

      this.add(
        'route:routeWithError',
        Route.extend({
          model() {
            return { name: 'Alex' };
          },
        })
      );

      this.addTemplate('routeWithError', 'Hi {{model.name}} {{x-foo person=model}}');

      this.addComponent('x-foo', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.set('person.name', 'Ben');
          },
        }),
        template: 'Hi {{person.name}} from component',
      });

      let expectedBacktrackingMessage = /modified "model\.name" twice on \[object Object\] in a single render\. It was rendered in "template:my-app\/templates\/routeWithError.hbs" and modified in "component:x-foo"/;

      return this.visit('/').then(() => {
        expectAssertion(() => {
          this.visit('/routeWithError');
        }, expectedBacktrackingMessage);
      });
    }

    ['@test hot reload (without component class)']() {
      ENV._APPLICATION_TEMPLATE_WRAPPER = false;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;

      let invalidate;

      this.add(
        'service:component-template-revisions',
        Service.extend({
          init() {
            this._super(...arguments);
            this.revisions = {};
            this.listeners = [];

            invalidate = componentName => {
              let revision = this.revisions[componentName];

              if (revision === undefined) {
                revision = 0;
              }

              this.revisions[componentName] = ++revision;

              this.listeners.forEach(callback => callback());
            };
          },

          listen(callback) {
            this.listeners.push(callback);
          },

          revisionFor(componentName) {
            return this.revisions[componentName];
          },
        })
      );

      this.add(
        'helper:revisioned-component-name',
        Helper.extend({
          revision: injectService('component-template-revisions'),

          init() {
            this._super(...arguments);
            this.revision.listen(() => this.recompute());
          },

          compute([name]) {
            let revision = this.revision.revisionFor(name);

            if (revision === undefined) {
              return name;
            } else {
              return `${name}--hot-reload-${revision}`;
            }
          },
        })
      );

      this.addTemplate('application', `{{component (revisioned-component-name "foo-bar")}}`);

      this.addComponent('foo-bar', {
        ComponentClass: null,
        template: '<h1>foo-bar</h1>',
      });

      return this.visit('/').then(() => {
        this.assertInnerHTML('<h1>foo-bar</h1>');

        this.runTask(() => {
          this.addComponent('foo-bar--hot-reload-1', {
            ComponentClass:
              this.applicationInstance.resolveRegistration('component:foo-bar') || null,
            template: '<h1>foo-bar (revision 1)</h1>',
          });

          invalidate('foo-bar');
        });

        this.assertInnerHTML('<h1>foo-bar (revision 1)</h1>');
      });
    }

    ['@test hot reload (with component class)']() {
      ENV._APPLICATION_TEMPLATE_WRAPPER = false;

      let invalidate;

      this.add(
        'service:component-template-revisions',
        Service.extend({
          init() {
            this._super(...arguments);
            this.revisions = {};
            this.listeners = [];

            invalidate = componentName => {
              let revision = this.revisions[componentName];

              if (revision === undefined) {
                revision = 0;
              }

              this.revisions[componentName] = ++revision;

              this.listeners.forEach(callback => callback());
            };
          },

          listen(callback) {
            this.listeners.push(callback);
          },

          revisionFor(componentName) {
            return this.revisions[componentName];
          },
        })
      );

      this.add(
        'helper:revisioned-component-name',
        Helper.extend({
          revision: injectService('component-template-revisions'),

          init() {
            this._super(...arguments);
            this.revision.listen(() => this.recompute());
          },

          compute([name]) {
            let revision = this.revision.revisionFor(name);

            if (revision === undefined) {
              return name;
            } else {
              return `${name}--hot-reload-${revision}`;
            }
          },
        })
      );

      this.addTemplate('application', `{{component (revisioned-component-name "foo-bar")}}`);

      this.addComponent('foo-bar', {
        ComponentClass: Component.extend({
          tagName: '',
          name: 'foo-bar',
        }),
        template: '<h1>{{this.name}}</h1>',
      });

      return this.visit('/').then(() => {
        this.assertInnerHTML('<h1>foo-bar</h1>');

        this.runTask(() => {
          this.addComponent('foo-bar--hot-reload-1', {
            ComponentClass:
              this.applicationInstance.resolveRegistration('component:foo-bar') || null,
            template: '<h1>{{this.name}} (revision 1)</h1>',
          });

          invalidate('foo-bar');
        });

        this.assertInnerHTML('<h1>foo-bar (revision 1)</h1>');
      });
    }
  }
);
