import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import Application from '@ember/application';
import { Component } from 'ember-glimmer';
import { getOwner } from 'ember-owner';
import { assign } from '@ember/polyfills';
import { resolve } from 'rsvp';

moduleFor(
  'View Integration',
  class extends ApplicationTestCase {
    constructor() {
      document.getElementById('qunit-fixture').innerHTML = `
      <div id="one"></div>
      <div id="two"></div>
    `;
      super();
      this.runTask(() => {
        this.createSecondApplication();
      });
    }

    get applicationOptions() {
      return assign(super.applicationOptions, {
        rootElement: '#one',
        router: null,
      });
    }

    createSecondApplication(options) {
      let { applicationOptions } = this;
      let secondApplicationOptions = { rootElement: '#two' };
      let myOptions = assign(applicationOptions, secondApplicationOptions, options);
      this.secondApp = Application.create(myOptions);
      this.secondResolver = this.secondApp.__registry__.resolver;
      return this.secondApp;
    }

    teardown() {
      super.teardown();

      if (this.secondApp) {
        this.runTask(() => {
          this.secondApp.destroy();
        });
      }
    }

    addFactoriesToResolver(actions, resolver) {
      resolver.add(
        'component:special-button',
        Component.extend({
          actions: {
            doStuff() {
              let rootElement = getOwner(this).application.rootElement;
              actions.push(rootElement);
            },
          },
        })
      );

      resolver.add(
        'template:index',
        this.compile(
          `
        <h1>Node 1</h1>{{special-button}}
      `,
          {
            moduleName: 'my-app/templates/index.hbs',
          }
        )
      );
      resolver.add(
        'template:components/special-button',
        this.compile(
          `
        <button class='do-stuff' {{action 'doStuff'}}>Button</button>
      `,
          {
            moduleName: 'my-app/templates/components/special-button.hbs',
          }
        )
      );
    }

    [`@test booting multiple applications can properly handle events`](assert) {
      let actions = [];
      this.addFactoriesToResolver(actions, this.resolver);
      this.addFactoriesToResolver(actions, this.secondResolver);

      return resolve()
        .then(() => this.application.visit('/'))
        .then(() => this.secondApp.visit('/'))
        .then(() => {
          document.querySelector('#two .do-stuff').click();
          document.querySelector('#one .do-stuff').click();

          assert.deepEqual(actions, ['#two', '#one']);
        });
    }
  }
);
