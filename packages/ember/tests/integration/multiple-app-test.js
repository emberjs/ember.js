import {
  moduleFor,
  ApplicationTestCase
} from 'internal-test-helpers';
import { Application } from 'ember-application';
import { Component } from 'ember-glimmer';
import { jQuery } from 'ember-views';
import { assign, getOwner } from 'ember-utils';

moduleFor('View Integration', class extends ApplicationTestCase {

  constructor() {
    jQuery('#qunit-fixture').html(`
      <div id="one"></div>
      <div id="two"></div>
    `);
    super();
    this.runTask(() => {
      this.createSecondApplication();
    });
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      rootElement: '#one',
      router: null
    });
  }

  createSecondApplication(options) {
    let {applicationOptions} = this;
    let secondApplicationOptions = {rootElement: '#two'};
    let myOptions = assign(applicationOptions, secondApplicationOptions, options);
    this.secondApp = Application.create(myOptions);
    this.secondResolver = myOptions.Resolver.lastInstance;
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
    resolver.add('component:special-button', Component.extend({
      actions: {
        doStuff() {
          let rootElement = getOwner(this).application.rootElement;
          actions.push(rootElement);
        }
      }
    }));

    resolver.add(
      'template:index',
      this.compile(`
        <h1>Node 1</h1>{{special-button}}
      `, {
        moduleName: 'index'
      })
    );
    resolver.add(
      'template:components/special-button',
      this.compile(`
        <button class='do-stuff' {{action 'doStuff'}}>Button</button>
      `, {
        moduleName: 'components/special-button'
      })
    );
  }

  [`@test booting multiple applications can properly handle events`](assert) {
    let actions = [];
    this.addFactoriesToResolver(actions, this.resolver);
    this.addFactoriesToResolver(actions, this.secondResolver);

    this.runTask(() => {
      this.secondApp.visit('/');
    });
    this.runTask(() => {
      this.application.visit('/');
    });

    jQuery('#two .do-stuff').click();
    jQuery('#one .do-stuff').click();

    assert.deepEqual(actions, ['#two', '#one']);
  }

});
