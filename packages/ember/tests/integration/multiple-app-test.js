import { moduleFor, ApplicationTestCase, runTask } from 'internal-test-helpers';
import compile from 'internal-test-helpers/lib/compile';
import Application from '@ember/application';
import { Component } from '@ember/-internals/glimmer';
import { getOwner } from '@ember/-internals/owner';
import { resolve } from 'rsvp';
import { action } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  'View Integration',
  class extends ApplicationTestCase {
    constructor() {
      document.getElementById('qunit-fixture').innerHTML = `
      <div id="one"></div>
      <div id="two"></div>
    `;
      super();
      runTask(() => {
        this.createSecondApplication();
      });
    }

    get applicationOptions() {
      return Object.assign(super.applicationOptions, {
        rootElement: '#one',
        router: null,
      });
    }

    createSecondApplication(options) {
      let { applicationOptions } = this;
      let secondApplicationOptions = { rootElement: '#two' };
      let myOptions = Object.assign(applicationOptions, secondApplicationOptions, options);
      this.secondApp = Application.create(myOptions);
      this.secondResolver = this.secondApp.__registry__.resolver;
      return this.secondApp;
    }

    teardown() {
      super.teardown();

      if (this.secondApp) {
        runTask(() => {
          this.secondApp.destroy();
        });
      }
    }

    addFactoriesToResolver(actions, resolver) {
      resolver.add(
        'component:special-button',
        setComponentTemplate(
          precompileTemplate(
            `<button class='do-stuff' {{on "click" this.doStuff}}>Button</button>`
          ),
          class extends Component {
            @action
            doStuff() {
              let rootElement = getOwner(this).application.rootElement;
              actions.push(rootElement);
            }
          }
        )
      );

      resolver.add(
        'template:index',
        compile(
          `
        <h1>Node 1</h1>{{special-button}}
      `
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
