import Ember from 'ember-metal/core'; // TEMPLATES
import Logger from 'ember-metal/logger';
import Controller from 'ember-runtime/controllers/controller';
import { set } from 'ember-metal/property_set';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import isEnabled from 'ember-metal/features';
import alias from 'ember-metal/alias';
import Application from 'ember-application/system/application';
import Component from 'ember-views/components/component';
import ComponentLookup from 'ember-views/component_lookup';
import jQuery from 'ember-views/system/jquery';
import EmberObject from 'ember-runtime/system/object';
import inject from 'ember-runtime/inject';
import { A as emberA } from 'ember-runtime/system/native_array';
import NoneLocation from 'ember-routing/location/none_location';
import { OWNER } from 'container/owner';

import { compile } from 'ember-template-compiler';
import EmberView from 'ember-views/views/view';

var Router, App, AppView, router, appInstance;

function bootApplication() {
  router = appInstance.lookup('router:main');
  run(App, 'advanceReadiness');
}

// IE includes the host name
function normalizeUrl(url) {
  return url.replace(/https?:\/\/[^\/]+/, '');
}

function shouldNotBeActive(selector) {
  checkActive(selector, false);
}

function shouldBeActive(selector) {
  checkActive(selector, true);
}

function checkActive(selector, active) {
  var classList = jQuery(selector, '#qunit-fixture')[0].className;
  equal(classList.indexOf('active') > -1, active, selector + ' active should be ' + active.toString());
}

var updateCount, replaceCount;

function sharedSetup() {
  App = Application.create({
    name: 'App',
    rootElement: '#qunit-fixture'
  });

  App.deferReadiness();

  updateCount = replaceCount = 0;
  App.Router.reopen({
    location: NoneLocation.create({
      setURL(path) {
        updateCount++;
        set(this, 'path', path);
      },

      replaceURL(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router = App.Router;
  appInstance = App.__deprecatedInstance__;
}

function sharedTeardown() {
  run(function() { App.destroy(); });
  Ember.TEMPLATES = {};
}

QUnit.module('The {{link-to}} helper', {
  setup() {
    run(function() {
      sharedSetup();

      Ember.TEMPLATES.app = compile('{{outlet}}');
      Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\'}}About{{/link-to}}{{#link-to \'index\' id=\'self-link\'}}Self{{/link-to}}');
      Ember.TEMPLATES.about = compile('<h3>About</h3>{{#link-to \'index\' id=\'home-link\'}}Home{{/link-to}}{{#link-to \'about\' id=\'self-link\'}}Self{{/link-to}}');
      Ember.TEMPLATES.item = compile('<h3>Item</h3><p>{{model.name}}</p>{{#link-to \'index\' id=\'home-link\'}}Home{{/link-to}}');

      AppView = EmberView.extend({
        templateName: 'app'
      });

      appInstance.register('view:app', AppView);

      appInstance.unregister('router:main');
      appInstance.register('router:main', Router);
    });
  },

  teardown: sharedTeardown
});

// These two tests are designed to simulate the context of an ember-qunit/ember-test-helpers component integration test,
// so the container is available but it does not boot the entire app
QUnit.test('Using {{link-to}} does not cause an exception if it is rendered before the router has started routing', function(assert) {
  Router.map(function() {
    this.route('about');
  });

  appInstance.register('component-lookup:main', ComponentLookup);

  let component = Component.extend({
    [OWNER]: appInstance,
    layout: compile('{{#link-to "about"}}Go to About{{/link-to}}')
  }).create();

  let router = appInstance.lookup('router:main');
  router.setupRouter();

  run(function() {
    component.appendTo('#qunit-fixture');
  });

  assert.strictEqual(component.$('a').length, 1, 'the link is rendered');
});

QUnit.test('Using {{link-to}} does not cause an exception if it is rendered without a router.js instance', function(assert) {
  appInstance.register('component-lookup:main', ComponentLookup);

  let component = Component.extend({
    [OWNER]: appInstance,
    layout: compile('{{#link-to "nonexistent"}}Does not work.{{/link-to}}')
  }).create();

  run(function() {
    component.appendTo('#qunit-fixture');
  });

  assert.strictEqual(component.$('a').length, 1, 'the link is rendered');
});

QUnit.test('The {{link-to}} helper moves into the named route', function() {
  Router.map(function(match) {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#about-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 1, 'The about template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#home-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

QUnit.test('The {{link-to}} helper supports URL replacement', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\' replace=true}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  equal(updateCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

QUnit.test('The {{link-to}} helper supports URL replacement via replace=boundTruthyThing', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\' replace=boundTruthyThing}}About{{/link-to}}');

  App.IndexController = Controller.extend({
    boundTruthyThing: true
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  equal(updateCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

QUnit.test('The {{link-to}} helper supports setting replace=boundFalseyThing', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\' replace=boundFalseyThing}}About{{/link-to}}');

  App.IndexController = Controller.extend({
    boundFalseyThing: false
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  equal(updateCount, 1, 'setURL should be called');
  equal(replaceCount, 0, 'replaceURL should not be called');
});

QUnit.test('the {{link-to}} helper doesn\'t add an href when the tagName isn\'t \'a\'', function() {
  Ember.TEMPLATES.index = compile('{{#link-to \'about\' id=\'about-link\' tagName=\'div\'}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('#about-link').attr('href'), undefined, 'there is no href attribute');
});


QUnit.test('the {{link-to}} applies a \'disabled\' class when disabled', function () {
  Ember.TEMPLATES.index = compile(`
    {{#link-to "about" id="about-link-static" disabledWhen="shouldDisable"}}About{{/link-to}}
    {{#link-to "about" id="about-link-dynamic" disabledWhen=dynamicDisabledWhen}}About{{/link-to}}
  `);

  App.IndexController = Controller.extend({
    shouldDisable: true,
    dynamicDisabledWhen: 'shouldDisable'
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('#about-link-static.disabled', '#qunit-fixture').length, 1, 'The static link is disabled when its disabledWhen is true');
  equal(jQuery('#about-link-dynamic.disabled', '#qunit-fixture').length, 1, 'The dynamic link is disabled when its disabledWhen is true');
});

QUnit.test('the {{link-to}} doesn\'t apply a \'disabled\' class if disabledWhen is not provided', function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link"}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  ok(!jQuery('#about-link', '#qunit-fixture').hasClass('disabled'), 'The link is not disabled if disabledWhen not provided');
});

QUnit.test('the {{link-to}} helper supports a custom disabledClass', function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen=true disabledClass="do-not-want"}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('#about-link.do-not-want', '#qunit-fixture').length, 1, 'The link can apply a custom disabled class');
});

QUnit.test('the {{link-to}} helper supports a custom disabledClass set via bound param', function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen=true disabledClass=disabledClass}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    disabledClass: 'do-not-want'
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('#about-link.do-not-want', '#qunit-fixture').length, 1, 'The link can apply a custom disabled class via bound param');
});

QUnit.test('the {{link-to}} helper does not respond to clicks when disabled', function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen=true}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 0, 'Transitioning did not occur');
});

QUnit.test('the {{link-to}} helper does not respond to clicks when disabled via a bound param', function () {
  Ember.TEMPLATES.index = compile('{{#link-to "about" id="about-link" disabledWhen=disabledWhen}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    disabledWhen: true
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 0, 'Transitioning did not occur');
});

QUnit.test('The {{link-to}} helper supports a custom activeClass', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\'}}About{{/link-to}}{{#link-to \'index\' id=\'self-link\' activeClass=\'zomg-active\'}}Self{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(jQuery('#self-link.zomg-active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#about-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

QUnit.test('The {{link-to}} helper supports a custom activeClass from a bound param', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\'}}About{{/link-to}}{{#link-to \'index\' id=\'self-link\' activeClass=activeClass}}Self{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    activeClass: 'zomg-active'
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(jQuery('#self-link.zomg-active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#about-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

QUnit.test('The {{link-to}} helper supports \'classNameBindings\' with custom values [GH #11699]', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'about\' id=\'about-link\' classNameBindings=\'foo:foo-is-true:foo-is-false\'}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    foo: false
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('#about-link.foo-is-false', '#qunit-fixture').length, 1, 'The about-link was rendered with the falsy class');

  var controller = appInstance.lookup('controller:index');
  run(function() {
    controller.set('foo', true);
  });

  equal(jQuery('#about-link.foo-is-true', '#qunit-fixture').length, 1, 'The about-link was rendered with the truthy class after toggling the property');
});

QUnit.test('The {{link-to}} helper supports leaving off .index for nested routes', function() {
  Router.map(function() {
    this.route('about', function() {
      this.route('item');
    });
  });

  Ember.TEMPLATES.about = compile('<h1>About</h1>{{outlet}}');
  Ember.TEMPLATES['about/index'] = compile('<div id=\'index\'>Index</div>');
  Ember.TEMPLATES['about/item'] = compile('<div id=\'item\'>{{#link-to \'about\'}}About{{/link-to}}</div>');

  bootApplication();

  run(router, 'handleURL', '/about/item');

  equal(normalizeUrl(jQuery('#item a', '#qunit-fixture').attr('href')), '/about');
});

QUnit.test('The {{link-to}} helper supports currentWhen (DEPRECATED)', function() {
  expectDeprecation('Usage of `currentWhen` is deprecated, use `current-when` instead.');

  Router.map(function(match) {
    this.route('index', { path: '/' }, function() {
      this.route('about');
    });

    this.route('item');
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{outlet}}');
  Ember.TEMPLATES['index/about'] = compile('{{#link-to \'item\' id=\'other-link\' currentWhen=\'index\'}}ITEM{{/link-to}}');

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  equal(jQuery('#other-link.active', '#qunit-fixture').length, 1, 'The link is active since current-when is a parent route');
});

QUnit.test('The {{link-to}} helper supports custom, nested, current-when', function() {
  Router.map(function(match) {
    this.route('index', { path: '/' }, function() {
      this.route('about');
    });

    this.route('item');
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{outlet}}');
  Ember.TEMPLATES['index/about'] = compile('{{#link-to \'item\' id=\'other-link\' current-when=\'index\'}}ITEM{{/link-to}}');

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  equal(jQuery('#other-link.active', '#qunit-fixture').length, 1, 'The link is active since current-when is a parent route');
});

QUnit.test('The {{link-to}} helper does not disregard current-when when it is given explicitly for a route', function() {
  Router.map(function(match) {
    this.route('index', { path: '/' }, function() {
      this.route('about');
    });

    this.route('items', function() {
      this.route('item');
    });
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{outlet}}');
  Ember.TEMPLATES['index/about'] = compile('{{#link-to \'items\' id=\'other-link\' current-when=\'index\'}}ITEM{{/link-to}}');

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  equal(jQuery('#other-link.active', '#qunit-fixture').length, 1, 'The link is active when current-when is given for explicitly for a route');
});

QUnit.test('The {{link-to}} helper does not disregard current-when when it is set via a bound param', function() {
  Router.map(function(match) {
    this.route('index', { path: '/' }, function() {
      this.route('about');
    });

    this.route('items', function() {
      this.route('item');
    });
  });

  App.IndexAboutController = Controller.extend({
    currentWhen: 'index'
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{outlet}}');
  Ember.TEMPLATES['index/about'] = compile('{{#link-to \'items\' id=\'other-link\' current-when=currentWhen}}ITEM{{/link-to}}');

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  equal(jQuery('#other-link.active', '#qunit-fixture').length, 1, 'The link is active when current-when is given for explicitly for a route');
});

QUnit.test('The {{link-to}} helper supports multiple current-when routes', function() {
  Router.map(function(match) {
    this.route('index', { path: '/' }, function() {
      this.route('about');
    });
    this.route('item');
    this.route('foo');
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{outlet}}');
  Ember.TEMPLATES['index/about'] = compile('{{#link-to \'item\' id=\'link1\' current-when=\'item index\'}}ITEM{{/link-to}}');
  Ember.TEMPLATES['item'] = compile('{{#link-to \'item\' id=\'link2\' current-when=\'item index\'}}ITEM{{/link-to}}');
  Ember.TEMPLATES['foo'] = compile('{{#link-to \'item\' id=\'link3\' current-when=\'item index\'}}ITEM{{/link-to}}');

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  equal(jQuery('#link1.active', '#qunit-fixture').length, 1, 'The link is active since current-when contains the parent route');

  run(function() {
    router.handleURL('/item');
  });

  equal(jQuery('#link2.active', '#qunit-fixture').length, 1, 'The link is active since you are on the active route');

  run(function() {
    router.handleURL('/foo');
  });

  equal(jQuery('#link3.active', '#qunit-fixture').length, 0, 'The link is not active since current-when does not contain the active route');
});

QUnit.test('The {{link-to}} helper defaults to bubbling', function() {
  Ember.TEMPLATES.about = compile('<div {{action \'hide\'}}>{{#link-to \'about.contact\' id=\'about-contact\'}}About{{/link-to}}</div>{{outlet}}');
  Ember.TEMPLATES['about/contact'] = compile('<h1 id=\'contact\'>Contact</h1>');

  Router.map(function() {
    this.route('about', function() {
      this.route('contact');
    });
  });

  var hidden = 0;

  App.AboutRoute = Route.extend({
    actions: {
      hide() {
        hidden++;
      }
    }
  });

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  run(function() {
    jQuery('#about-contact', '#qunit-fixture').click();
  });

  equal(jQuery('#contact', '#qunit-fixture').text(), 'Contact', 'precond - the link worked');

  equal(hidden, 1, 'The link bubbles');
});

QUnit.test('The {{link-to}} helper supports bubbles=false', function() {
  Ember.TEMPLATES.about = compile('<div {{action \'hide\'}}>{{#link-to \'about.contact\' id=\'about-contact\' bubbles=false}}About{{/link-to}}</div>{{outlet}}');
  Ember.TEMPLATES['about/contact'] = compile('<h1 id=\'contact\'>Contact</h1>');

  Router.map(function() {
    this.route('about', function() {
      this.route('contact');
    });
  });

  var hidden = 0;

  App.AboutRoute = Route.extend({
    actions: {
      hide() {
        hidden++;
      }
    }
  });

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  run(function() {
    jQuery('#about-contact', '#qunit-fixture').click();
  });

  equal(jQuery('#contact', '#qunit-fixture').text(), 'Contact', 'precond - the link worked');

  equal(hidden, 0, 'The link didn\'t bubble');
});

QUnit.test('The {{link-to}} helper supports bubbles=boundFalseyThing', function() {
  Ember.TEMPLATES.about = compile('<div {{action \'hide\'}}>{{#link-to \'about.contact\' id=\'about-contact\' bubbles=boundFalseyThing}}About{{/link-to}}</div>{{outlet}}');
  Ember.TEMPLATES['about/contact'] = compile('<h1 id=\'contact\'>Contact</h1>');

  App.AboutController = Controller.extend({
    boundFalseyThing: false
  });

  Router.map(function() {
    this.route('about', function() {
      this.route('contact');
    });
  });

  var hidden = 0;

  App.AboutRoute = Route.extend({
    actions: {
      hide() {
        hidden++;
      }
    }
  });

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  run(function() {
    jQuery('#about-contact', '#qunit-fixture').click();
  });

  equal(jQuery('#contact', '#qunit-fixture').text(), 'Contact', 'precond - the link worked');

  equal(hidden, 0, 'The link didn\'t bubble');
});

QUnit.test('The {{link-to}} helper moves into the named route with context', function() {
  Router.map(function(match) {
    this.route('about');
    this.route('item', { path: '/item/:id' });
  });

  Ember.TEMPLATES.about = compile('<h3>List</h3><ul>{{#each model as |person|}}<li>{{#link-to \'item\' person}}{{person.name}}{{/link-to}}</li>{{/each}}</ul>{{#link-to \'index\' id=\'home-link\'}}Home{{/link-to}}');

  App.AboutRoute = Route.extend({
    model() {
      return emberA([
        { id: 'yehuda', name: 'Yehuda Katz' },
        { id: 'tom', name: 'Tom Dale' },
        { id: 'erik', name: 'Erik Brynroflsson' }
      ]);
    }
  });

  App.ItemRoute = Route.extend({
    serialize(object) {
      return { id: object.id };
    }
  });

  bootApplication();

  run(function() {
    router.handleURL('/about');
  });

  equal(jQuery('h3:contains(List)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(normalizeUrl(jQuery('#home-link').attr('href')), '/', 'The home link points back at /');

  run(function() {
    jQuery('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(Item)', '#qunit-fixture').length, 1, 'The item template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Yehuda Katz', 'The name is correct');

  run(function() { jQuery('#home-link').click(); });
  run(function() { jQuery('#about-link').click(); });

  equal(normalizeUrl(jQuery('li a:contains(Yehuda)').attr('href')), '/item/yehuda');
  equal(normalizeUrl(jQuery('li a:contains(Tom)').attr('href')), '/item/tom');
  equal(normalizeUrl(jQuery('li a:contains(Erik)').attr('href')), '/item/erik');

  run(function() {
    jQuery('li a:contains(Erik)', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(Item)', '#qunit-fixture').length, 1, 'The item template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Erik Brynroflsson', 'The name is correct');
});

QUnit.test('The {{link-to}} helper binds some anchor html tag common attributes', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'index\' id=\'self-link\' title=\'title-attr\' rel=\'rel-attr\' tabindex=\'-1\'}}Self{{/link-to}}');
  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  var link = jQuery('#self-link', '#qunit-fixture');
  equal(link.attr('title'), 'title-attr', 'The self-link contains title attribute');
  equal(link.attr('rel'), 'rel-attr', 'The self-link contains rel attribute');
  equal(link.attr('tabindex'), '-1', 'The self-link contains tabindex attribute');
});

QUnit.test('The {{link-to}} helper supports `target` attribute', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'index\' id=\'self-link\' target=\'_blank\'}}Self{{/link-to}}');
  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  var link = jQuery('#self-link', '#qunit-fixture');
  equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
});

QUnit.test('The {{link-to}} helper supports `target` attribute specified as a bound param', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'index\' id=\'self-link\' target=boundLinkTarget}}Self{{/link-to}}');

  App.IndexController = Controller.extend({
    boundLinkTarget: '_blank'
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  var link = jQuery('#self-link', '#qunit-fixture');
  equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
});

QUnit.test('The {{link-to}} helper does not call preventDefault if `target` attribute is provided', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'index\' id=\'self-link\' target=\'_blank\'}}Self{{/link-to}}');
  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  var event = jQuery.Event('click');
  jQuery('#self-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault when target attribute is specified');
});

QUnit.test('The {{link-to}} helper should preventDefault when `target = _self`', function() {
  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{#link-to \'index\' id=\'self-link\' target=\'_self\'}}Self{{/link-to}}');
  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  var event = jQuery.Event('click');
  jQuery('#self-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, 'should preventDefault when target attribute is `_self`');
});

QUnit.test('The {{link-to}} helper should not transition if target is not equal to _self or empty', function() {
  Ember.TEMPLATES.index = compile('{{#link-to \'about\' id=\'about-link\' replace=true target=\'_blank\'}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  run(function() {
    jQuery('#about-link', '#qunit-fixture').click();
  });

  notEqual(appInstance.lookup('controller:application').get('currentRouteName'), 'about', 'link-to should not transition if target is not equal to _self or empty');
});

QUnit.test('The {{link-to}} helper accepts string/numeric arguments', function() {
  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
    this.route('post', { path: '/post/:post_id' });
    this.route('repo', { path: '/repo/:owner/:name' });
  });

  App.FilterController = Controller.extend({
    filter: 'unpopular',
    repo: EmberObject.create({ owner: 'ember', name: 'ember.js' }),
    post_id: 123
  });
  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>{{#link-to "filter" "unpopular" id="link"}}Unpopular{{/link-to}}{{#link-to "filter" filter id="path-link"}}Unpopular{{/link-to}}{{#link-to "post" post_id id="post-path-link"}}Post{{/link-to}}{{#link-to "post" 123 id="post-number-link"}}Post{{/link-to}}{{#link-to "repo" repo id="repo-object-link"}}Repo{{/link-to}}');

  Ember.TEMPLATES.index = compile(' ');

  bootApplication();

  run(function() { router.handleURL('/filters/popular'); });

  equal(normalizeUrl(jQuery('#link', '#qunit-fixture').attr('href')), '/filters/unpopular');
  equal(normalizeUrl(jQuery('#path-link', '#qunit-fixture').attr('href')), '/filters/unpopular');
  equal(normalizeUrl(jQuery('#post-path-link', '#qunit-fixture').attr('href')), '/post/123');
  equal(normalizeUrl(jQuery('#post-number-link', '#qunit-fixture').attr('href')), '/post/123');
  equal(normalizeUrl(jQuery('#repo-object-link', '#qunit-fixture').attr('href')), '/repo/ember/ember.js');
});

QUnit.test('Issue 4201 - Shorthand for route.index shouldn\'t throw errors about context arguments', function() {
  expect(2);
  Router.map(function() {
    this.route('lobby', function() {
      this.route('index', { path: ':lobby_id' });
      this.route('list');
    });
  });

  App.LobbyIndexRoute = Route.extend({
    model(params) {
      equal(params.lobby_id, 'foobar');
      return params.lobby_id;
    }
  });

  Ember.TEMPLATES['lobby/index'] = compile('{{#link-to \'lobby\' \'foobar\' id=\'lobby-link\'}}Lobby{{/link-to}}');
  Ember.TEMPLATES.index = compile('');
  Ember.TEMPLATES['lobby/list'] = compile('{{#link-to \'lobby\' \'foobar\' id=\'lobby-link\'}}Lobby{{/link-to}}');
  bootApplication();
  run(router, 'handleURL', '/lobby/list');
  run(jQuery('#lobby-link'), 'click');
  shouldBeActive('#lobby-link');
});

QUnit.test('The {{link-to}} helper unwraps controllers', function() {
  expect(5);

  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
  });

  var indexObject = { filter: 'popular' };

  App.FilterRoute = Route.extend({
    model(params) {
      return indexObject;
    },

    serialize(passedObject) {
      equal(passedObject, indexObject, 'The unwrapped object is passed');
      return { filter: 'popular' };
    }
  });

  App.IndexRoute = Route.extend({
    model() {
      return indexObject;
    }
  });

  Ember.TEMPLATES.filter = compile('<p>{{model.filter}}</p>');
  Ember.TEMPLATES.index = compile('{{#link-to "filter" this id="link"}}Filter{{/link-to}}');

  expectDeprecation(function() {
    bootApplication();
  }, /Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated./);

  run(function() { router.handleURL('/'); });

  jQuery('#link', '#qunit-fixture').trigger('click');
});

QUnit.test('The {{link-to}} helper doesn\'t change view context', function() {
  App.IndexView = EmberView.extend({
    elementId: 'index',
    name: 'test',
    isTrue: true
  });

  Ember.TEMPLATES.index = compile('{{view.name}}-{{#link-to \'index\' id=\'self-link\'}}Link: {{view.name}}-{{#if view.isTrue}}{{view.name}}{{/if}}{{/link-to}}');

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  equal(jQuery('#index', '#qunit-fixture').text(), 'test-Link: test-test', 'accesses correct view');
});

QUnit.test('Quoteless route param performs property lookup', function() {
  Ember.TEMPLATES.index = compile('{{#link-to \'index\' id=\'string-link\'}}string{{/link-to}}{{#link-to foo id=\'path-link\'}}path{{/link-to}}{{#link-to view.foo id=\'view-link\'}}{{view.foo}}{{/link-to}}');

  function assertEquality(href) {
    equal(normalizeUrl(jQuery('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(jQuery('#path-link', '#qunit-fixture').attr('href')), href);
    equal(normalizeUrl(jQuery('#view-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexView = EmberView.extend({
    foo: 'index',
    elementId: 'index-view'
  });

  App.IndexController = Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  assertEquality('/');

  var controller = appInstance.lookup('controller:index');
  var view = EmberView.views['index-view'];
  run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

QUnit.test('link-to with null/undefined dynamic parameters are put in a loading state', function() {
  expect(19);

  var oldWarn = Logger.warn;
  var warnCalled = false;
  Logger.warn = function() { warnCalled = true; };
  Ember.TEMPLATES.index = compile('{{#link-to destinationRoute routeContext loadingClass=\'i-am-loading\' id=\'context-link\'}}string{{/link-to}}{{#link-to secondRoute loadingClass=loadingClass id=\'static-link\'}}string{{/link-to}}');

  var thing = EmberObject.create({ id: 123 });

  App.IndexController = Controller.extend({
    destinationRoute: null,
    routeContext: null,
    loadingClass: 'i-am-loading'
  });

  App.AboutRoute = Route.extend({
    activate() {
      ok(true, 'About was entered');
    }
  });

  App.Router.map(function() {
    this.route('thing', { path: '/thing/:thing_id' });
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  function assertLinkStatus($link, url) {
    if (url) {
      equal(normalizeUrl($link.attr('href')), url, 'loaded link-to has expected href');
      ok(!$link.hasClass('i-am-loading'), 'loaded linkComponent has no loadingClass');
    } else {
      equal(normalizeUrl($link.attr('href')), '#', 'unloaded link-to has href=\'#\'');
      ok($link.hasClass('i-am-loading'), 'loading linkComponent has loadingClass');
    }
  }

  var $contextLink = jQuery('#context-link', '#qunit-fixture');
  var $staticLink = jQuery('#static-link', '#qunit-fixture');
  var controller = appInstance.lookup('controller:index');

  assertLinkStatus($contextLink);
  assertLinkStatus($staticLink);

  run(function() {
    warnCalled = false;
    $contextLink.click();
    ok(warnCalled, 'Logger.warn was called from clicking loading link');
  });

  // Set the destinationRoute (context is still null).
  run(controller, 'set', 'destinationRoute', 'thing');
  assertLinkStatus($contextLink);

  // Set the routeContext to an id
  run(controller, 'set', 'routeContext', '456');
  assertLinkStatus($contextLink, '/thing/456');

  // Test that 0 isn't interpreted as falsy.
  run(controller, 'set', 'routeContext', 0);
  assertLinkStatus($contextLink, '/thing/0');

  // Set the routeContext to an object
  run(controller, 'set', 'routeContext', thing);
  assertLinkStatus($contextLink, '/thing/123');

  // Set the destinationRoute back to null.
  run(controller, 'set', 'destinationRoute', null);
  assertLinkStatus($contextLink);

  run(function() {
    warnCalled = false;
    $staticLink.click();
    ok(warnCalled, 'Logger.warn was called from clicking loading link');
  });

  run(controller, 'set', 'secondRoute', 'about');
  assertLinkStatus($staticLink, '/about');

  // Click the now-active link
  run($staticLink, 'click');

  Logger.warn = oldWarn;
});

QUnit.test('The {{link-to}} helper refreshes href element when one of params changes', function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = EmberObject.create({ id: '1' });
  var secondPost = EmberObject.create({ id: '2' });

  Ember.TEMPLATES.index = compile('{{#link-to "post" post id="post"}}post{{/link-to}}');

  App.IndexController = Controller.extend();
  var indexController = appInstance.lookup('controller:index');

  run(function() { indexController.set('post', post); });

  bootApplication();

  run(function() { router.handleURL('/'); });

  equal(normalizeUrl(jQuery('#post', '#qunit-fixture').attr('href')), '/posts/1', 'precond - Link has rendered href attr properly');

  run(function() { indexController.set('post', secondPost); });

  equal(jQuery('#post', '#qunit-fixture').attr('href'), '/posts/2', 'href attr was updated after one of the params had been changed');

  run(function() { indexController.set('post', null); });

  equal(jQuery('#post', '#qunit-fixture').attr('href'), '#', 'href attr becomes # when one of the arguments in nullified');
});


QUnit.test('The {{link-to}} helper is active when a route is active', function() {
  Router.map(function() {
    this.route('about', function() {
      this.route('item');
    });
  });

  Ember.TEMPLATES.about = compile('<div id=\'about\'>{{#link-to \'about\' id=\'about-link\'}}About{{/link-to}} {{#link-to \'about.item\' id=\'item-link\'}}Item{{/link-to}} {{outlet}}</div>');
  Ember.TEMPLATES['about/item'] = compile(' ');
  Ember.TEMPLATES['about/index'] = compile(' ');

  bootApplication();

  run(router, 'handleURL', '/about');

  equal(jQuery('#about-link.active', '#qunit-fixture').length, 1, 'The about route link is active');
  equal(jQuery('#item-link.active', '#qunit-fixture').length, 0, 'The item route link is inactive');

  run(router, 'handleURL', '/about/item');

  equal(jQuery('#about-link.active', '#qunit-fixture').length, 1, 'The about route link is active');
  equal(jQuery('#item-link.active', '#qunit-fixture').length, 1, 'The item route link is active');
});

QUnit.test('The {{link-to}} helper works in an #each\'d array of string route names', function() {
  Router.map(function() {
    this.route('foo');
    this.route('bar');
    this.route('rar');
  });

  App.IndexController = Controller.extend({
    routeNames: emberA(['foo', 'bar', 'rar']),
    route1: 'bar',
    route2: 'foo'
  });

  Ember.TEMPLATES = {
    index: compile('{{#each routeNames as |routeName|}}{{#link-to routeName}}{{routeName}}{{/link-to}}{{/each}}{{#each routeNames as |r|}}{{#link-to r}}{{r}}{{/link-to}}{{/each}}{{#link-to route1}}a{{/link-to}}{{#link-to route2}}b{{/link-to}}')
  };

  bootApplication();

  function linksEqual($links, expected) {
    equal($links.length, expected.length, 'Has correct number of links');

    var idx;
    for (idx = 0; idx < $links.length; idx++) {
      var href = jQuery($links[idx]).attr('href');
      // Old IE includes the whole hostname as well
      equal(href.slice(-expected[idx].length), expected[idx], 'Expected link to be \'' + expected[idx] + '\', but was \'' + href + '\'');
    }
  }

  linksEqual(jQuery('a', '#qunit-fixture'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/bar', '/foo']);

  var indexController = appInstance.lookup('controller:index');
  run(indexController, 'set', 'route1', 'rar');

  linksEqual(jQuery('a', '#qunit-fixture'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/rar', '/foo']);

  run(indexController.routeNames, 'shiftObject');

  linksEqual(jQuery('a', '#qunit-fixture'), ['/bar', '/rar', '/bar', '/rar', '/rar', '/foo']);
});

QUnit.test('The non-block form {{link-to}} helper moves into the named route', function() {
  expect(3);
  Router.map(function(match) {
    this.route('contact');
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{link-to \'Contact us\' \'contact\' id=\'contact-link\'}}{{#link-to \'index\' id=\'self-link\'}}Self{{/link-to}}');
  Ember.TEMPLATES.contact = compile('<h3>Contact</h3>{{link-to \'Home\' \'index\' id=\'home-link\'}}{{link-to \'Self\' \'contact\' id=\'self-link\'}}');

  bootApplication();

  run(function() {
    jQuery('#contact-link', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(Contact)', '#qunit-fixture').length, 1, 'The contact template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#home-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

QUnit.test('The non-block form {{link-to}} helper updates the link text when it is a binding', function() {
  expect(8);
  Router.map(function(match) {
    this.route('contact');
  });

  App.IndexController = Controller.extend({
    contactName: 'Jane'
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3>{{link-to contactName \'contact\' id=\'contact-link\'}}{{#link-to \'index\' id=\'self-link\'}}Self{{/link-to}}');
  Ember.TEMPLATES.contact = compile('<h3>Contact</h3>{{link-to \'Home\' \'index\' id=\'home-link\'}}{{link-to \'Self\' \'contact\' id=\'self-link\'}}');

  bootApplication();

  run(function() {
    router.handleURL('/');
  });
  var controller = appInstance.lookup('controller:index');

  equal(jQuery('#contact-link:contains(Jane)', '#qunit-fixture').length, 1, 'The link title is correctly resolved');

  run(function() {
    controller.set('contactName', 'Joe');
  });
  equal(jQuery('#contact-link:contains(Joe)', '#qunit-fixture').length, 1, 'The link title is correctly updated when the bound property changes');

  run(function() {
    controller.set('contactName', 'Robert');
  });
  equal(jQuery('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, 'The link title is correctly updated when the bound property changes a second time');

  run(function() {
    jQuery('#contact-link', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(Contact)', '#qunit-fixture').length, 1, 'The contact template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#home-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');

  run(function() {
    jQuery('#home-link', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The index template was rendered');
  equal(jQuery('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, 'The link title is correctly updated when the route changes');
});

QUnit.test('The non-block form {{link-to}} helper moves into the named route with context', function() {
  expect(5);
  Router.map(function(match) {
    this.route('item', { path: '/item/:id' });
  });

  App.IndexRoute = Route.extend({
    model() {
      return emberA([
        { id: 'yehuda', name: 'Yehuda Katz' },
        { id: 'tom', name: 'Tom Dale' },
        { id: 'erik', name: 'Erik Brynroflsson' }
      ]);
    }
  });

  App.ItemRoute = Route.extend({
    serialize(object) {
      return { id: object.id };
    }
  });

  Ember.TEMPLATES.index = compile('<h3>Home</h3><ul>{{#each model as |person|}}<li>{{link-to person.name \'item\' person}}</li>{{/each}}</ul>');
  Ember.TEMPLATES.item = compile('<h3>Item</h3><p>{{model.name}}</p>{{#link-to \'index\' id=\'home-link\'}}Home{{/link-to}}');

  bootApplication();

  run(function() {
    jQuery('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(jQuery('h3:contains(Item)', '#qunit-fixture').length, 1, 'The item template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Yehuda Katz', 'The name is correct');

  run(function() { jQuery('#home-link').click(); });

  equal(normalizeUrl(jQuery('li a:contains(Yehuda)').attr('href')), '/item/yehuda');
  equal(normalizeUrl(jQuery('li a:contains(Tom)').attr('href')), '/item/tom');
  equal(normalizeUrl(jQuery('li a:contains(Erik)').attr('href')), '/item/erik');
});

QUnit.test('The non-block form {{link-to}} performs property lookup', function() {
  Ember.TEMPLATES.index = compile('{{link-to \'string\' \'index\' id=\'string-link\'}}{{link-to path foo id=\'path-link\'}}{{link-to view.foo view.foo id=\'view-link\'}}');

  function assertEquality(href) {
    equal(normalizeUrl(jQuery('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(jQuery('#path-link', '#qunit-fixture').attr('href')), href);
    equal(normalizeUrl(jQuery('#view-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexView = EmberView.extend({
    foo: 'index',
    elementId: 'index-view'
  });

  App.IndexController = Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  assertEquality('/');

  var controller = appInstance.lookup('controller:index');
  var view = EmberView.views['index-view'];
  run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

QUnit.test('The non-block form {{link-to}} protects against XSS', function() {
  Ember.TEMPLATES.application = compile('{{link-to display \'index\' id=\'link\'}}');

  App.ApplicationController = Controller.extend({
    display: 'blahzorz'
  });

  bootApplication();

  run(router, 'handleURL', '/');

  var controller = appInstance.lookup('controller:application');

  equal(jQuery('#link', '#qunit-fixture').text(), 'blahzorz');
  run(function() {
    controller.set('display', '<b>BLAMMO</b>');
  });

  equal(jQuery('#link', '#qunit-fixture').text(), '<b>BLAMMO</b>');
  equal(jQuery('b', '#qunit-fixture').length, 0);
});

QUnit.test('the {{link-to}} helper calls preventDefault', function() {
  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  var event = jQuery.Event('click');
  jQuery('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, 'should preventDefault');
});

QUnit.test('the {{link-to}} helper does not call preventDefault if `preventDefault=false` is passed as an option', function() {
  Ember.TEMPLATES.index = compile('{{#link-to \'about\' id=\'about-link\' preventDefault=false}}About{{/link-to}}');

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  var event = jQuery.Event('click');
  jQuery('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault');
});

QUnit.test('the {{link-to}} helper does not call preventDefault if `preventDefault=boundFalseyThing` is passed as an option', function() {
  Ember.TEMPLATES.index = compile('{{#link-to \'about\' id=\'about-link\' preventDefault=boundFalseyThing}}About{{/link-to}}');

  App.IndexController = Controller.extend({
    boundFalseyThing: false
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  var event = jQuery.Event('click');
  jQuery('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault');
});

QUnit.test('the {{link-to}} helper does not throw an error if its route has exited', function() {
  expect(0);

  Ember.TEMPLATES.application = compile('{{#link-to \'index\' id=\'home-link\'}}Home{{/link-to}}{{#link-to \'post\' defaultPost id=\'default-post-link\'}}Default Post{{/link-to}}{{#if currentPost}}{{#link-to \'post\' id=\'post-link\'}}Post{{/link-to}}{{/if}}');

  App.ApplicationController = Controller.extend({
    postController: inject.controller('post'),
    currentPost: alias('postController.model')
  });

  App.PostController = Controller.extend({
    model: { id: 1 }
  });

  Router.map(function() {
    this.route('post', { path: 'post/:post_id' });
  });

  bootApplication();

  run(router, 'handleURL', '/');

  run(function() {
    jQuery('#default-post-link', '#qunit-fixture').click();
  });

  run(function() {
    jQuery('#home-link', '#qunit-fixture').click();
  });
});

QUnit.test('{{link-to}} active property respects changing parent route context', function() {
  Ember.TEMPLATES.application = compile(
    '{{link-to \'OMG\' \'things\' \'omg\' id=\'omg-link\'}} ' +
    '{{link-to \'LOL\' \'things\' \'lol\' id=\'lol-link\'}} ');


  Router.map(function() {
    this.route('things', { path: '/things/:name' }, function() {
      this.route('other');
    });
  });

  bootApplication();

  run(router, 'handleURL', '/things/omg');
  shouldBeActive('#omg-link');
  shouldNotBeActive('#lol-link');

  run(router, 'handleURL', '/things/omg/other');
  shouldBeActive('#omg-link');
  shouldNotBeActive('#lol-link');
});


QUnit.test('{{link-to}} populates href with default query param values even without query-params object', function() {
  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });
  } else {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });
  }

  Ember.TEMPLATES.index = compile('{{#link-to \'index\' id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/', 'link has right href');
});

QUnit.test('{{link-to}} populates href with default query param values with empty query-params object', function() {
  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });
  } else {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });
  }

  Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params) id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/', 'link has right href');
});

QUnit.test('{{link-to}} populates href with supplied query param values', function() {
  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });
  } else {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });
  }

  Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params foo=\'456\') id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?foo=456', 'link has right href');
});

QUnit.test('{{link-to}} populates href with partially supplied query param values', function() {
  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        },
        bar: {
          defaultValue: 'yes'
        }
      }
    });
  } else {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123',
      bar: 'yes'
    });
  }

  Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params foo=\'456\') id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?foo=456', 'link has right href');
});

QUnit.test('{{link-to}} populates href with partially supplied query param values, but omits if value is default value', function() {
  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });
  } else {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });
  }

  Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params foo=\'123\') id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/', 'link has right href');
});

QUnit.test('{{link-to}} populates href with fully supplied query param values', function() {
  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        },
        bar: {
          defaultValue: 'yes'
        }
      }
    });
  } else {
    App.IndexController = Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: '123',
      bar: 'yes'
    });
  }

  Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params foo=\'456\' bar=\'NAW\') id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');
});

QUnit.test('{{link-to}} with only query-params and a block updates when route changes', function() {
  Router.map(function() {
    this.route('about');
  });

  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.ApplicationRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        },
        bar: {
          defaultValue: 'yes'
        }
      }
    });
  } else {
    App.ApplicationController = Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: '123',
      bar: 'yes'
    });
  }

  Ember.TEMPLATES.application = compile('{{#link-to (query-params foo=\'456\' bar=\'NAW\') id=\'the-link\'}}Index{{/link-to}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

  run(function() {
    router.handleURL('/about');
  });
  equal(jQuery('#the-link').attr('href'), '/about?bar=NAW&foo=456', 'link has right href');
});

QUnit.test('Block-less {{link-to}} with only query-params updates when route changes', function() {
  Router.map(function() {
    this.route('about');
  });

  if (isEnabled('ember-routing-route-configured-query-params')) {
    App.ApplicationRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        },
        bar: {
          defaultValue: 'yes'
        }
      }
    });
  } else {
    App.ApplicationController = Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: '123',
      bar: 'yes'
    });
  }

  Ember.TEMPLATES.application = compile('{{link-to "Index" (query-params foo=\'456\' bar=\'NAW\') id=\'the-link\'}}');
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

  run(function() {
    router.handleURL('/about');
  });
  equal(jQuery('#the-link').attr('href'), '/about?bar=NAW&foo=456', 'link has right href');
});

QUnit.test('The {{link-to}} helper can use dynamic params', function() {
  Router.map(function(match) {
    this.route('foo', { path: 'foo/:some/:thing' });
    this.route('bar', { path: 'bar/:some/:thing/:else' });
  });

  let controller;
  App.IndexController = Controller.extend({
    init() {
      this._super(...arguments);

      controller = this;

      this.dynamicLinkParams = [
        'foo',
        'one',
        'two'
      ];
    }
  });

  Ember.TEMPLATES.index = compile(`
    <h3>Home</h3>

    {{#link-to params=dynamicLinkParams id="dynamic-link"}}Dynamic{{/link-to}}
  `);

  bootApplication();

  run(function() {
    router.handleURL('/');
  });

  let link = jQuery('#dynamic-link', '#qunit-fixture');

  equal(link.attr('href'), '/foo/one/two');

  run(function() {
    controller.set('dynamicLinkParams', [
      'bar',
      'one',
      'two',
      'three'
    ]);
  });

  equal(link.attr('href'), '/bar/one/two/three');
});
