import { Controller } from 'ember-runtime';
import { moduleFor, ApplicationTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { Route } from 'ember-routing';
import { Component } from 'ember-glimmer';

moduleFor('Application test: rendering', class extends ApplicationTest {

  ['@test it can render the application template'](assert) {
    this.addTemplate('application', 'Hello world!');

    return this.visit('/').then(() => {
      this.assertText('Hello world!');
    });
  }

  ['@test it can access the model provided by the route'](assert) {
    this.add('route:application', Route.extend({
      model() {
        return ['red', 'yellow', 'blue'];
      }
    }));

    this.addTemplate('application', strip`
      <ul>
        {{#each model as |item|}}
          <li>{{item}}</li>
        {{/each}}
      </ul>
    `);

    return this.visit('/').then(() => {
      this.assertComponentElement(this.firstChild, {
        content: strip`
          <ul>
            <li>red</li>
            <li>yellow</li>
            <li>blue</li>
          </ul>
        `
      });
    });
  }

  ['@test it can render a nested route'](assert) {
    this.router.map(function() {
      this.route('lists', function() {
        this.route('colors', function() {
          this.route('favorite');
        });
      });
    });

    // The "favorite" route will inherit the model
    this.add('route:lists.colors', Route.extend({
      model() {
        return ['red', 'yellow', 'blue'];
      }
    }));

    this.addTemplate('lists.colors.favorite', strip`
      <ul>
        {{#each model as |item|}}
          <li>{{item}}</li>
        {{/each}}
      </ul>
    `);

    return this.visit('/lists/colors/favorite').then(() => {
      this.assertComponentElement(this.firstChild, {
        content: strip`
          <ul>
            <li>red</li>
            <li>yellow</li>
            <li>blue</li>
          </ul>
        `
      });
    });
  }

  ['@test it can render into named outlets'](assert) {
    this.router.map(function() {
      this.route('colors');
    });

    this.addTemplate('application', strip`
      <nav>{{outlet "nav"}}</nav>
      <main>{{outlet}}</main>
    `);

    this.addTemplate('nav', strip`
      <a href="https://emberjs.com/">Ember</a>
    `);

    this.add('route:application', Route.extend({
      renderTemplate() {
        this.render();
        this.render('nav', {
          into: 'application',
          outlet: 'nav'
        });
      }
    }));

    this.add('route:colors', Route.extend({
      model() {
        return ['red', 'yellow', 'blue'];
      }
    }));

    this.addTemplate('colors', strip`
      <ul>
        {{#each model as |item|}}
          <li>{{item}}</li>
        {{/each}}
      </ul>
    `);

    return this.visit('/colors').then(() => {
      this.assertComponentElement(this.firstChild, {
        content: strip`
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
        `
      });
    });
  }

  ['@test it can render into named outlets'](assert) {
    this.router.map(function() {
      this.route('colors');
    });

    this.addTemplate('application', strip`
      <nav>{{outlet "nav"}}</nav>
      <main>{{outlet}}</main>
    `);

    this.addTemplate('nav', strip`
      <a href="https://emberjs.com/">Ember</a>
    `);

    this.add('route:application', Route.extend({
      renderTemplate() {
        this.render();
        this.render('nav', {
          into: 'application',
          outlet: 'nav'
        });
      }
    }));

    this.add('route:colors', Route.extend({
      model() {
        return ['red', 'yellow', 'blue'];
      }
    }));

    this.addTemplate('colors', strip`
      <ul>
        {{#each model as |item|}}
          <li>{{item}}</li>
        {{/each}}
      </ul>
    `);

    return this.visit('/colors').then(() => {
      this.assertComponentElement(this.firstChild, {
        content: strip`
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
        `
      });
    });
  }

  ['@test it should update the outlets when switching between routes'](assert) {
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

    return this.visit('/b/c').then(() => {
      // this.assertComponentElement(this.firstChild, { content: 'BC' });
      this.assertText('BC');
      return this.visit('/a');
    }).then(() => {
      // this.assertComponentElement(this.firstChild, { content: 'A' });
      this.assertText('A');
      return this.visit('/b/d');
    }).then(() => {
      this.assertText('BD');
      // this.assertComponentElement(this.firstChild, { content: 'BD' });
    });
  }

  ['@test it should produce a stable DOM when the model changes'](assert) {
    this.router.map(function() {
      this.route('color', { path: '/colors/:color' });
    });

    this.add('route:color', Route.extend({
      model(params) {
        return params.color;
      }
    }));

    this.addTemplate('color', 'color: {{model}}');

    return this.visit('/colors/red').then(() => {
      this.assertComponentElement(this.firstChild, { content: 'color: red' });
      this.takeSnapshot();
      return this.visit('/colors/green');
    }).then(() => {
      this.assertComponentElement(this.firstChild, { content: 'color: green' });
      this.assertInvariants();
    });
  }

  ['@test it should have the right controller in scope for the route template']() {
    this.router.map(function() {
      this.route('a');
      this.route('b');
    });

    this.add('controller:a', Controller.extend({
      value: 'a'
    }));

    this.add('controller:b', Controller.extend({
      value: 'b'
    }));

    this.addTemplate('a', '{{value}}');
    this.addTemplate('b', '{{value}}');

    return this.visit('/a').then(() => {
      this.assertText('a');
      return this.visit('/b');
    }).then(() => this.assertText('b'));
  }

  ['@test it should update correctly when the controller changes'](assert) {
    this.router.map(function() {
      this.route('color', { path: '/colors/:color' });
    });

    this.add('route:color', Route.extend({
      model(params) {
        return { color: params.color };
      },

      renderTemplate(controller, model) {
        this.render({ controller: model.color, model });
      }
    }));

    this.add('controller:red', Controller.extend({
      color: 'red'
    }));

    this.add('controller:green', Controller.extend({
      color: 'green'
    }));

    this.addTemplate('color', 'model color: {{model.color}}, controller color: {{color}}');

    return this.visit('/colors/red').then(() => {
      this.assertComponentElement(this.firstChild, { content: 'model color: red, controller color: red' });
      this.takeSnapshot();
      return this.visit('/colors/green');
    }).then(() => {
      this.assertComponentElement(this.firstChild, { content: 'model color: green, controller color: green' });
      this.assertInvariants();
    });
  }

  ['@test it should produce a stable DOM when two routes render the same template'](assert) {
    this.router.map(function() {
      this.route('a');
      this.route('b');
    });

    this.add('route:a', Route.extend({
      model() {
        return 'A';
      },

      renderTemplate(controller, model) {
        this.render('common', { controller: 'common', model });
      }
    }));

    this.add('route:b', Route.extend({
      model() {
        return 'B';
      },

      renderTemplate(controller, model) {
        this.render('common', { controller: 'common', model });
      }
    }));

    this.add('controller:common', Controller.extend({
      prefix: 'common'
    }));

    this.addTemplate('common', '{{prefix}} {{model}}');

    return this.visit('/a').then(() => {
      this.assertComponentElement(this.firstChild, { content: 'common A' });
      this.takeSnapshot();
      return this.visit('/b');
    }).then(() => {
      this.assertComponentElement(this.firstChild, { content: 'common B' });
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
      this.assertComponentElement(this.firstChild, { content: '1<div>2</div>' });
    });
  }

  ['@test it allows a transition during route activate'](assert) {
    this.router.map(function() {
      this.route('a');
    });

    this.add('route:index', Route.extend({
      activate() {
        this.transitionTo('a');
      }
    }));

    this.addTemplate('a', 'Hello from A!');

    return this.visit('/').then(() => {
      this.assertComponentElement(this.firstChild, {
        content: `Hello from A!`
      });
    });
  }

  ['@test it emits a useful backtracking re-render assertion message'](assert) {
    this.router.map(function() {
      this.route('routeWithError');
    });

    this.add('route:routeWithError', Route.extend({
      model() {
        return { name: 'Alex' };
      }
    }));

    this.addTemplate('routeWithError', 'Hi {{model.name}} {{x-foo person=model}}');

    this.addComponent('x-foo', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          this.set('person.name', 'Ben');
        }
      }),
      template: 'Hi {{person.name}} from component'
    });

    let expectedBacktrackingMessage = /modified "model\.name" twice on \[object Object\] in a single render\. It was rendered in "template:routeWithError" and modified in "component:x-foo"/;

    return this.visit('/').then(() => {
      expectAssertion(() => {
        this.visit('/routeWithError');
      }, expectedBacktrackingMessage);
    });
  }
});
