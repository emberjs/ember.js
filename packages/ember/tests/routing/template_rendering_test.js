/* eslint-disable no-console */
import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import { A as emberA } from '@ember/array';
import { moduleFor, ApplicationTestCase, getTextOf } from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { Component } from '@ember/-internals/glimmer';
import { service } from '@ember/service';

let originalConsoleError;

moduleFor(
  'Route - template rendering',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.addTemplate('home', '<h3 class="hours">Hours</h3>');
      this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
      this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{this.name}}</p>');

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      originalConsoleError = console.error;
    }

    teardown() {
      super.teardown();
      console.error = originalConsoleError;
    }

    get currentPath() {
      let currentPath;
      expectDeprecation(() => {
        currentPath = this.applicationInstance.lookup('controller:application').get('currentPath');
      }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
      return currentPath;
    }

    async ['@test warn on URLs not included in the route set'](assert) {
      await this.visit('/');

      await assert.rejects(this.visit('/what-is-this-i-dont-even'), /\/what-is-this-i-dont-even/);
    }

    ['@test render uses templateName from route'](assert) {
      this.addTemplate('the_real_home_template', '<p>THIS IS THE REAL HOME</p>');
      this.add(
        'route:home',
        Route.extend({
          templateName: 'the_real_home_template',
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'THIS IS THE REAL HOME', 'the homepage template was rendered');
      });
    }

    ['@test Generated names can be customized when providing routes with dot notation'](assert) {
      assert.expect(4);

      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('foo', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('bar', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('bar.baz', '<p>{{this.name}}Bottom!</p>');

      this.router.map(function () {
        this.route('foo', { path: '/top' }, function () {
          this.route('bar', { path: '/middle', resetNamespace: true }, function () {
            this.route('baz', { path: '/bottom' });
          });
        });
      });

      this.add(
        'route:foo',
        Route.extend({
          setupController() {
            assert.ok(true, 'FooBarRoute was called');
            return this._super(...arguments);
          },
        })
      );

      this.add(
        'route:bar.baz',
        Route.extend({
          setupController() {
            assert.ok(true, 'BarBazRoute was called');
            return this._super(...arguments);
          },
        })
      );

      this.add(
        'controller:bar',
        Controller.extend({
          name: 'Bar',
        })
      );

      this.add(
        'controller:bar.baz',
        Controller.extend({
          name: 'BarBaz',
        })
      );

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle .bottom p')),
          'BarBazBottom!',
          'The templates were rendered into their appropriate parents'
        );
      });
    }

    ["@test Child routes render into their parent route's template by default"](assert) {
      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('top', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('middle', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('middle.bottom', '<p>Bottom!</p>');

      this.router.map(function () {
        this.route('top', function () {
          this.route('middle', { resetNamespace: true }, function () {
            this.route('bottom');
          });
        });
      });

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle .bottom p')),
          'Bottom!',
          'The templates were rendered into their appropriate parents'
        );
      });
    }

    ['@test Application template does not duplicate when re-rendered'](assert) {
      this.addTemplate('application', '<h3 class="render-once">I render once</h3>{{outlet}}');

      this.router.map(function () {
        this.route('posts');
      });

      this.add(
        'route:application',
        Route.extend({
          model() {
            return emberA();
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(getTextOf(rootElement.querySelector('h3.render-once')), 'I render once');
      });
    }

    ['@test Child routes should render inside the application template if the application template causes a redirect'](
      assert
    ) {
      this.addTemplate('application', '<h3>App</h3> {{outlet}}');
      this.addTemplate('posts', 'posts');

      this.router.map(function () {
        this.route('posts');
        this.route('photos');
      });

      this.add(
        'route:application',
        Route.extend({
          router: service(),
          afterModel() {
            this.router.transitionTo('posts');
          },
        })
      );

      return this.visit('/posts').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'App posts');
      });
    }

    async ["@test The template is not re-rendered when the route's model changes"](assert) {
      this.router.map(function () {
        this.route('page', { path: '/page/:name' });
      });

      this.add(
        'route:page',
        Route.extend({
          model(params) {
            return EmberObject.create({ name: params.name });
          },
        })
      );

      let insertionCount = 0;
      this.add(
        'component:foo-bar',
        Component.extend({
          didInsertElement() {
            insertionCount += 1;
          },
        })
      );

      this.addTemplate('page', '<p>{{@model.name}}{{foo-bar}}</p>');

      let rootElement = document.getElementById('qunit-fixture');

      await this.visit('/page/first');

      assert.ok(true, '/page/first has been handled');
      assert.equal(getTextOf(rootElement.querySelector('p')), 'first');
      assert.equal(insertionCount, 1);

      await this.visit('/page/second');

      assert.ok(true, '/page/second has been handled');
      assert.equal(getTextOf(rootElement.querySelector('p')), 'second');
      assert.equal(insertionCount, 1, 'view should have inserted only once');
      let router = this.applicationInstance.lookup('router:main');

      await run(() => router.transitionTo('page', EmberObject.create({ name: 'third' })));

      assert.equal(getTextOf(rootElement.querySelector('p')), 'third');
      assert.equal(insertionCount, 1, 'view should still have inserted only once');
    }

    ['@test {{outlet}} works when created after initial render'](assert) {
      this.addTemplate('sample', 'Hi{{#if this.showTheThing}}{{outlet}}{{/if}}Bye');
      this.addTemplate('sample.inner', 'Yay');
      this.addTemplate('sample.inner2', 'Boo');
      this.router.map(function () {
        this.route('sample', { path: '/' }, function () {
          this.route('inner', { path: '/' });
          this.route('inner2', { path: '/2' });
        });
      });

      let rootElement;
      return this.visit('/')
        .then(() => {
          rootElement = document.getElementById('qunit-fixture');
          assert.equal(rootElement.textContent.trim(), 'HiBye', 'initial render');

          run(() => this.applicationInstance.lookup('controller:sample').set('showTheThing', true));

          assert.equal(rootElement.textContent.trim(), 'HiYayBye', 'second render');
          return this.visit('/2');
        })
        .then(() => {
          assert.equal(rootElement.textContent.trim(), 'HiBooBye', 'third render');
        });
    }

    ['@test Components inside an outlet have their didInsertElement hook invoked when the route is displayed'](
      assert
    ) {
      this.addTemplate(
        'index',
        '{{#if this.showFirst}}{{my-component}}{{else}}{{other-component}}{{/if}}'
      );

      let myComponentCounter = 0;
      let otherComponentCounter = 0;
      let indexController;

      this.router.map(function () {
        this.route('index', { path: '/' });
      });

      this.add(
        'controller:index',
        Controller.extend({
          showFirst: true,
        })
      );

      this.add(
        'route:index',
        Route.extend({
          setupController(controller) {
            indexController = controller;
          },
        })
      );

      this.add(
        'component:my-component',
        Component.extend({
          didInsertElement() {
            myComponentCounter++;
          },
        })
      );

      this.add(
        'component:other-component',
        Component.extend({
          didInsertElement() {
            otherComponentCounter++;
          },
        })
      );

      return this.visit('/').then(() => {
        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          0,
          'didInsertElement not invoked on displayed component'
        );

        run(() => indexController.set('showFirst', false));

        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement not invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
      });
    }
  }
);
