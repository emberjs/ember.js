import Logger from 'ember-console';

import {
  Controller,
  Object as EmberObject,
  inject,
  A as emberA
} from 'ember-runtime';
import {
  set,
  run,
  instrumentationSubscribe as subscribe,
  instrumentationReset as reset,
  alias
} from 'ember-metal';
import { Route, NoneLocation } from 'ember-routing';
import { Application } from 'ember-application';
import { jQuery } from 'ember-views';
import { compile } from 'ember-template-compiler';
import { setTemplates, setTemplate } from 'ember-glimmer';
import { EMBER_IMPROVED_INSTRUMENTATION } from 'ember-debug';

let Router, App, router, appInstance;

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
  let classList = jQuery(selector, '#qunit-fixture')[0].className;
  equal(classList.indexOf('active') > -1, active, selector + ' active should be ' + active.toString());
}

let updateCount, replaceCount;

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
  run(() => App.destroy());
  setTemplates({});
  reset();
}

QUnit.module('The {{link-to}} helper', {
  setup() {
    run(() => {
      sharedSetup();

      setTemplate('app', compile('{{outlet}}'));
      setTemplate('index', compile(`<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}`));
      setTemplate('about', compile(`<h3>About</h3>{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'about' id='self-link'}}Self{{/link-to}}`));
      setTemplate('item', compile(`<h3>Item</h3><p>{{model.name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}`));

      appInstance.unregister('router:main');
      appInstance.register('router:main', Router);
    });
  },

  teardown: sharedTeardown
});

QUnit.test('The {{link-to}} helper moves into the named route', function() {
  Router.map(function(match) {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#about-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');

  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 1, 'The about template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#home-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

if (EMBER_IMPROVED_INSTRUMENTATION) {
  QUnit.test('The {{link-to}} helper fires an interaction event', function(assert) {
    assert.expect(2);
    Router.map(function(match) {
      this.route('about');
    });

    bootApplication();

    run(() => router.handleURL('/'));

    subscribe('interaction.link-to', {
      before() {
        assert.ok(true, 'instrumentation subscriber was called');
      },
      after() {
        assert.ok(true, 'instrumentation subscriber was called');
      }
    });

    jQuery('#about-link', '#qunit-fixture').click();
  });

  QUnit.test('The {{link-to}} helper interaction event includes the route name', function(assert) {
    assert.expect(2);
    Router.map(function(match) {
      this.route('about');
    });

    bootApplication();

    run(() => router.handleURL('/'));

    subscribe('interaction.link-to', {
      before(name, timestamp, { routeName }) {
        assert.equal(routeName, 'about', 'instrumentation subscriber was passed route name');
      },
      after(name, timestamp, { routeName }) {
        assert.equal(routeName, 'about', 'instrumentation subscriber was passed route name');
      }
    });

    jQuery('#about-link', '#qunit-fixture').click();
  });

  QUnit.test('The {{link-to}} helper interaction event includes the transition in the after hook', function(assert) {
    assert.expect(1);
    Router.map(function(match) {
      this.route('about');
    });

    bootApplication();

    run(() => router.handleURL('/'));

    subscribe('interaction.link-to', {
      before() {},
      after(name, timestamp, { transition }) {
        assert.equal(transition.targetName, 'about', 'instrumentation subscriber was passed route name');
      }
    });

    jQuery('#about-link', '#qunit-fixture').click();
  });
}

QUnit.test('The {{link-to}} helper supports URL replacement', function() {
  setTemplate('index', compile(`<h3>Home</h3>{{#link-to 'about' id='about-link' replace=true}}About{{/link-to}}`));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(updateCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

QUnit.test('The {{link-to}} helper supports URL replacement via replace=boundTruthyThing', function() {
  setTemplate('index', compile(`<h3>Home</h3>{{#link-to 'about' id='about-link' replace=boundTruthyThing}}About{{/link-to}}`));

  App.IndexController = Controller.extend({
    boundTruthyThing: true
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(updateCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

QUnit.test('The {{link-to}} helper supports setting replace=boundFalseyThing', function() {
  setTemplate('index', compile(`<h3>Home</h3>{{#link-to 'about' id='about-link' replace=boundFalseyThing}}About{{/link-to}}`));

  App.IndexController = Controller.extend({
    boundFalseyThing: false
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(updateCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(updateCount, 1, 'setURL should be called');
  equal(replaceCount, 0, 'replaceURL should not be called');
});

// jscs:disable

QUnit.test("the {{link-to}} helper doesn't add an href when the tagName isn't 'a'", function() {
  setTemplate('index', compile(`{{#link-to 'about' id='about-link' tagName='div'}}About{{/link-to}}`));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('#about-link').attr('href'), undefined, 'there is no href attribute');
});


QUnit.test("the {{link-to}} applies a 'disabled' class when disabled", function () {
  setTemplate('index', compile(`
    {{#link-to "about" id="about-link-static" disabledWhen="shouldDisable"}}About{{/link-to}}
    {{#link-to "about" id="about-link-dynamic" disabledWhen=dynamicDisabledWhen}}About{{/link-to}}
  `));

  App.IndexController = Controller.extend({
    shouldDisable: true,
    dynamicDisabledWhen: 'shouldDisable'
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('#about-link-static.disabled', '#qunit-fixture').length, 1, 'The static link is disabled when its disabledWhen is true');
  equal(jQuery('#about-link-dynamic.disabled', '#qunit-fixture').length, 1, 'The dynamic link is disabled when its disabledWhen is true');

  run(() => set(appInstance.lookup('controller:index'), 'dynamicDisabledWhen', false));

  equal(jQuery('#about-link-dynamic.disabled', '#qunit-fixture').length, 0, 'The dynamic link is re-enabled when its disabledWhen becomes false');
});

QUnit.test("the {{link-to}} doesn't apply a 'disabled' class if disabledWhen is not provided", function () {
  setTemplate('index', compile(`{{#link-to "about" id="about-link"}}About{{/link-to}}`));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  ok(!jQuery('#about-link', '#qunit-fixture').hasClass('disabled'), 'The link is not disabled if disabledWhen not provided');
});

QUnit.test('the {{link-to}} helper supports a custom disabledClass', function () {
  setTemplate('index', compile('{{#link-to "about" id="about-link" disabledWhen=true disabledClass="do-not-want"}}About{{/link-to}}'));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('#about-link.do-not-want', '#qunit-fixture').length, 1, 'The link can apply a custom disabled class');
});

QUnit.test('the {{link-to}} helper supports a custom disabledClass set via bound param', function () {
  setTemplate('index', compile('{{#link-to "about" id="about-link" disabledWhen=true disabledClass=disabledClass}}About{{/link-to}}'));

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    disabledClass: 'do-not-want'
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('#about-link.do-not-want', '#qunit-fixture').length, 1, 'The link can apply a custom disabled class via bound param');
});

QUnit.test('the {{link-to}} helper does not respond to clicks when disabled', function () {
  setTemplate('index', compile('{{#link-to "about" id="about-link" disabledWhen=true}}About{{/link-to}}'));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 0, 'Transitioning did not occur');
});

QUnit.test('the {{link-to}} helper responds to clicks according to its disabledWhen bound param', function () {
  setTemplate('index', compile('{{#link-to "about" id="about-link" disabledWhen=disabledWhen}}About{{/link-to}}'));

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    disabledWhen: true
  });

  bootApplication();

  run(() => router.handleURL('/'));

  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 0, 'Transitioning did not occur');

  run(() => set(appInstance.lookup('controller:index'), 'disabledWhen', false));
  run(() => jQuery('#about-link', '#qunit-fixture').click());

  equal(jQuery('h3:contains(About)', '#qunit-fixture').length, 1, 'Transitioning did occur when disabledWhen became false');
});

QUnit.test('The {{link-to}} helper supports a custom activeClass', function() {
  setTemplate('index', compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link' activeClass='zomg-active'}}Self{{/link-to}}"));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(jQuery('#self-link.zomg-active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#about-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

QUnit.test('The {{link-to}} helper supports a custom activeClass from a bound param', function() {
  setTemplate('index', compile(`<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link' activeClass=activeClass}}Self{{/link-to}}`));

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    activeClass: 'zomg-active'
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('h3:contains(Home)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(jQuery('#self-link.zomg-active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#about-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');
});

QUnit.test("The {{link-to}} helper supports 'classNameBindings' with custom values [GH #11699]", function() {
  setTemplate('index', compile(`<h3>Home</h3>{{#link-to 'about' id='about-link' classNameBindings='foo:foo-is-true:foo-is-false'}}About{{/link-to}}`));

  Router.map(function() {
    this.route('about');
  });

  App.IndexController = Controller.extend({
    foo: false
  });

  bootApplication();

  run(() => router.handleURL('/'));

  equal(jQuery('#about-link.foo-is-false', '#qunit-fixture').length, 1, 'The about-link was rendered with the falsy class');

  let controller = appInstance.lookup('controller:index');

  run(() => controller.set('foo', true));

  equal(jQuery('#about-link.foo-is-true', '#qunit-fixture').length, 1, 'The about-link was rendered with the truthy class after toggling the property');
});

QUnit.test('The {{link-to}} helper supports leaving off .index for nested routes', function() {
  Router.map(function() {
    this.route('about', function() {
      this.route('item');
    });
  });

  setTemplate('about', compile('<h1>About</h1>{{outlet}}'));
  setTemplate('about/index', compile("<div id='index'>Index</div>"));
  setTemplate('about/item', compile("<div id='item'>{{#link-to 'about'}}About{{/link-to}}</div>"));

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

  setTemplate('index', compile('<h3>Home</h3>{{outlet}}'));
  setTemplate('index/about', compile("{{#link-to 'item' id='other-link' currentWhen='index'}}ITEM{{/link-to}}"));

  bootApplication();

  run(() => router.handleURL('/about'));

  equal(jQuery('#other-link.active', '#qunit-fixture').length, 1, 'The link is active since current-when is a parent route');
});

QUnit.test('The {{link-to}} helper supports custom, nested, current-when', function() {
  Router.map(function(match) {
    this.route('index', { path: '/' }, function() {
      this.route('about');
    });

    this.route('item');
  });

  setTemplate('index', compile('<h3>Home</h3>{{outlet}}'));
  setTemplate('index/about', compile("{{#link-to 'item' id='other-link' current-when='index'}}ITEM{{/link-to}}"));

  bootApplication();

  run(() => router.handleURL('/about'));

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

  setTemplate('index', compile('<h3>Home</h3>{{outlet}}'));
  setTemplate('index/about', compile("{{#link-to 'items' id='other-link' current-when='index'}}ITEM{{/link-to}}"));

  bootApplication();

  run(() => router.handleURL('/about'));

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

  setTemplate('index', compile('<h3>Home</h3>{{outlet}}'));
  setTemplate('index/about', compile("{{#link-to 'items' id='other-link' current-when=currentWhen}}ITEM{{/link-to}}"));

  bootApplication();

  run(() => router.handleURL('/about'));

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

  setTemplate('index', compile('<h3>Home</h3>{{outlet}}'));
  setTemplate('index/about', compile("{{#link-to 'item' id='link1' current-when='item index'}}ITEM{{/link-to}}"));
  setTemplate('item', compile("{{#link-to 'item' id='link2' current-when='item index'}}ITEM{{/link-to}}"));
  setTemplate('foo', compile("{{#link-to 'item' id='link3' current-when='item index'}}ITEM{{/link-to}}"));

  bootApplication();

  run(() => router.handleURL('/about'));

  equal(jQuery('#link1.active', '#qunit-fixture').length, 1, 'The link is active since current-when contains the parent route');

  run(() => router.handleURL('/item'));

  equal(jQuery('#link2.active', '#qunit-fixture').length, 1, 'The link is active since you are on the active route');

  run(() => router.handleURL('/foo'));

  equal(jQuery('#link3.active', '#qunit-fixture').length, 0, 'The link is not active since current-when does not contain the active route');
});

QUnit.test('The {{link-to}} helper defaults to bubbling', function() {
  setTemplate('about', compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact'}}About{{/link-to}}</div>{{outlet}}"));
  setTemplate('about/contact', compile("<h1 id='contact'>Contact</h1>"));

  Router.map(function() {
    this.route('about', function() {
      this.route('contact');
    });
  });

  let hidden = 0;

  App.AboutRoute = Route.extend({
    actions: {
      hide() {
        hidden++;
      }
    }
  });

  bootApplication();

  run(() => router.handleURL('/about'));

  run(() => jQuery('#about-contact', '#qunit-fixture').click());

  equal(jQuery('#contact', '#qunit-fixture').text(), 'Contact', 'precond - the link worked');

  equal(hidden, 1, 'The link bubbles');
});

QUnit.test('The {{link-to}} helper supports bubbles=false', function() {
  setTemplate('about', compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact' bubbles=false}}About{{/link-to}}</div>{{outlet}}"));
  setTemplate('about/contact', compile("<h1 id='contact'>Contact</h1>"));

  Router.map(function() {
    this.route('about', function() {
      this.route('contact');
    });
  });

  let hidden = 0;

  App.AboutRoute = Route.extend({
    actions: {
      hide() {
        hidden++;
      }
    }
  });

  bootApplication();

  run(() => router.handleURL('/about'));

  run(() => jQuery('#about-contact', '#qunit-fixture').click());

  equal(jQuery('#contact', '#qunit-fixture').text(), 'Contact', 'precond - the link worked');

  equal(hidden, 0, "The link didn't bubble");
});

QUnit.test('The {{link-to}} helper supports bubbles=boundFalseyThing', function() {
  setTemplate('about', compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact' bubbles=boundFalseyThing}}About{{/link-to}}</div>{{outlet}}"));
  setTemplate('about/contact', compile("<h1 id='contact'>Contact</h1>"));

  App.AboutController = Controller.extend({
    boundFalseyThing: false
  });

  Router.map(function() {
    this.route('about', function() {
      this.route('contact');
    });
  });

  let hidden = 0;

  App.AboutRoute = Route.extend({
    actions: {
      hide() {
        hidden++;
      }
    }
  });

  bootApplication();

  run(() => router.handleURL('/about'));
  run(() => jQuery('#about-contact', '#qunit-fixture').click());

  equal(jQuery('#contact', '#qunit-fixture').text(), 'Contact', 'precond - the link worked');

  equal(hidden, 0, "The link didn't bubble");
});

QUnit.test('The {{link-to}} helper moves into the named route with context', function() {
  Router.map(function(match) {
    this.route('about');
    this.route('item', { path: '/item/:id' });
  });

  setTemplate('about', compile("<h3>List</h3><ul>{{#each model as |person|}}<li>{{#link-to 'item' person}}{{person.name}}{{/link-to}}</li>{{/each}}</ul>{{#link-to 'index' id='home-link'}}Home{{/link-to}}"));

  App.AboutRoute = Route.extend({
    model() {
      return emberA([
        { id: 'yehuda', name: 'Yehuda Katz' },
        { id: 'tom', name: 'Tom Dale' },
        { id: 'erik', name: 'Erik Brynroflsson' }
      ]);
    }
  });

  bootApplication();

  run(() => router.handleURL('/about'));

  equal(jQuery('h3:contains(List)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(normalizeUrl(jQuery('#home-link').attr('href')), '/', 'The home link points back at /');

  run(() => jQuery('li a:contains(Yehuda)', '#qunit-fixture').click());

  equal(jQuery('h3:contains(Item)', '#qunit-fixture').length, 1, 'The item template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Yehuda Katz', 'The name is correct');

  run(() => jQuery('#home-link').click());
  run(() => jQuery('#about-link').click());

  equal(normalizeUrl(jQuery('li a:contains(Yehuda)').attr('href')), '/item/yehuda');
  equal(normalizeUrl(jQuery('li a:contains(Tom)').attr('href')), '/item/tom');
  equal(normalizeUrl(jQuery('li a:contains(Erik)').attr('href')), '/item/erik');

  run(() => jQuery('li a:contains(Erik)', '#qunit-fixture').click());

  equal(jQuery('h3:contains(Item)', '#qunit-fixture').length, 1, 'The item template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Erik Brynroflsson', 'The name is correct');
});

QUnit.test('The {{link-to}} helper binds some anchor html tag common attributes', function() {
  setTemplate('index', compile("<h3>Home</h3>{{#link-to 'index' id='self-link' title='title-attr' rel='rel-attr' tabindex='-1'}}Self{{/link-to}}"));
  bootApplication();

  run(() => router.handleURL('/'));

  let link = jQuery('#self-link', '#qunit-fixture');
  equal(link.attr('title'), 'title-attr', 'The self-link contains title attribute');
  equal(link.attr('rel'), 'rel-attr', 'The self-link contains rel attribute');
  equal(link.attr('tabindex'), '-1', 'The self-link contains tabindex attribute');
});

QUnit.test('The {{link-to}} helper supports `target` attribute', function() {
  setTemplate('index', compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target='_blank'}}Self{{/link-to}}"));
  bootApplication();

  run(() => router.handleURL('/'));

  let link = jQuery('#self-link', '#qunit-fixture');
  equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
});

QUnit.test('The {{link-to}} helper supports `target` attribute specified as a bound param', function() {
  setTemplate('index', compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target=boundLinkTarget}}Self{{/link-to}}"));

  App.IndexController = Controller.extend({
    boundLinkTarget: '_blank'
  });

  bootApplication();

  run(() => router.handleURL('/'));

  let link = jQuery('#self-link', '#qunit-fixture');
  equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
});

QUnit.test('The {{link-to}} helper does not call preventDefault if `target` attribute is provided', function() {
  setTemplate('index', compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target='_blank'}}Self{{/link-to}}"));
  bootApplication();

  run(() => router.handleURL('/'));

  let event = jQuery.Event('click');
  jQuery('#self-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault when target attribute is specified');
});

QUnit.test('The {{link-to}} helper should preventDefault when `target = _self`', function() {
  setTemplate('index', compile("<h3>Home</h3>{{#link-to 'index' id='self-link' target='_self'}}Self{{/link-to}}"));
  bootApplication();

  run(() => router.handleURL('/'));

  let event = jQuery.Event('click');
  jQuery('#self-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, 'should preventDefault when target attribute is `_self`');
});

QUnit.test('The {{link-to}} helper should not transition if target is not equal to _self or empty', function() {
  setTemplate('index', compile("{{#link-to 'about' id='about-link' replace=true target='_blank'}}About{{/link-to}}"));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(() => router.handleURL('/'));
  run(() => jQuery('#about-link', '#qunit-fixture').click());

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
  setTemplate('filter', compile('<p>{{filter}}</p>{{#link-to "filter" "unpopular" id="link"}}Unpopular{{/link-to}}{{#link-to "filter" filter id="path-link"}}Unpopular{{/link-to}}{{#link-to "post" post_id id="post-path-link"}}Post{{/link-to}}{{#link-to "post" 123 id="post-number-link"}}Post{{/link-to}}{{#link-to "repo" repo id="repo-object-link"}}Repo{{/link-to}}'));

  setTemplate('index', compile(' '));

  bootApplication();

  run(() => router.handleURL('/filters/popular'));

  equal(normalizeUrl(jQuery('#link', '#qunit-fixture').attr('href')), '/filters/unpopular');
  equal(normalizeUrl(jQuery('#path-link', '#qunit-fixture').attr('href')), '/filters/unpopular');
  equal(normalizeUrl(jQuery('#post-path-link', '#qunit-fixture').attr('href')), '/post/123');
  equal(normalizeUrl(jQuery('#post-number-link', '#qunit-fixture').attr('href')), '/post/123');
  equal(normalizeUrl(jQuery('#repo-object-link', '#qunit-fixture').attr('href')), '/repo/ember/ember.js');
});

QUnit.test("Issue 4201 - Shorthand for route.index shouldn't throw errors about context arguments", function() {
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

  setTemplate('lobby/index', compile("{{#link-to 'lobby' 'foobar' id='lobby-link'}}Lobby{{/link-to}}"));
  setTemplate('index', compile(''));
  setTemplate('lobby/list', compile("{{#link-to 'lobby' 'foobar' id='lobby-link'}}Lobby{{/link-to}}"));
  bootApplication();
  run(router, 'handleURL', '/lobby/list');
  run(jQuery('#lobby-link'), 'click');
  shouldBeActive('#lobby-link');
});

QUnit.test('Quoteless route param performs property lookup', function() {
  setTemplate('index', compile("{{#link-to 'index' id='string-link'}}string{{/link-to}}{{#link-to foo id='path-link'}}path{{/link-to}}"));

  function assertEquality(href) {
    equal(normalizeUrl(jQuery('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(jQuery('#path-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexController = Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  assertEquality('/');

  let controller = appInstance.lookup('controller:index');
  run(() => controller.set('foo', 'about'));

  assertEquality('/about');
});

QUnit.test('link-to with null/undefined dynamic parameters are put in a loading state', function() {
  expect(19);

  let oldWarn = Logger.warn;
  let warnCalled = false;
  Logger.warn = function() { warnCalled = true; };
  setTemplate('index', compile("{{#link-to destinationRoute routeContext loadingClass='i-am-loading' id='context-link'}}string{{/link-to}}{{#link-to secondRoute loadingClass=loadingClass id='static-link'}}string{{/link-to}}"));

  let thing = EmberObject.create({ id: 123 });

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
      equal(normalizeUrl($link.attr('href')), '#', "unloaded link-to has href='#'");
      ok($link.hasClass('i-am-loading'), 'loading linkComponent has loadingClass');
    }
  }

  let $contextLink = jQuery('#context-link', '#qunit-fixture');
  let $staticLink = jQuery('#static-link', '#qunit-fixture');
  let controller = appInstance.lookup('controller:index');

  assertLinkStatus($contextLink);
  assertLinkStatus($staticLink);

  run(() => {
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

  run(() => {
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

  let post = EmberObject.create({ id: '1' });
  let secondPost = EmberObject.create({ id: '2' });

  setTemplate('index', compile('{{#link-to "post" post id="post"}}post{{/link-to}}'));

  App.IndexController = Controller.extend();
  let indexController = appInstance.lookup('controller:index');

  run(() => indexController.set('post', post));

  bootApplication();

  run(() => router.handleURL('/'));

  equal(normalizeUrl(jQuery('#post', '#qunit-fixture').attr('href')), '/posts/1', 'precond - Link has rendered href attr properly');

  run(() => indexController.set('post', secondPost));

  equal(jQuery('#post', '#qunit-fixture').attr('href'), '/posts/2', 'href attr was updated after one of the params had been changed');

  run(() => indexController.set('post', null));

  equal(jQuery('#post', '#qunit-fixture').attr('href'), '#', 'href attr becomes # when one of the arguments in nullified');
});


QUnit.test('The {{link-to}} helper is active when a route is active', function() {
  Router.map(function() {
    this.route('about', function() {
      this.route('item');
    });
  });

  setTemplate('about', compile("<div id='about'>{{#link-to 'about' id='about-link'}}About{{/link-to}} {{#link-to 'about.item' id='item-link'}}Item{{/link-to}} {{outlet}}</div>"));
  setTemplate('about/item', compile(' '));
  setTemplate('about/index', compile(' '));

  bootApplication();

  run(router, 'handleURL', '/about');

  equal(jQuery('#about-link.active', '#qunit-fixture').length, 1, 'The about route link is active');
  equal(jQuery('#item-link.active', '#qunit-fixture').length, 0, 'The item route link is inactive');

  run(router, 'handleURL', '/about/item');

  equal(jQuery('#about-link.active', '#qunit-fixture').length, 1, 'The about route link is active');
  equal(jQuery('#item-link.active', '#qunit-fixture').length, 1, 'The item route link is active');
});

QUnit.test("The {{link-to}} helper works in an #each'd array of string route names", function() {
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

  setTemplate('index', compile('{{#each routeNames as |routeName|}}{{#link-to routeName}}{{routeName}}{{/link-to}}{{/each}}{{#each routeNames as |r|}}{{#link-to r}}{{r}}{{/link-to}}{{/each}}{{#link-to route1}}a{{/link-to}}{{#link-to route2}}b{{/link-to}}'));

  bootApplication();

  function linksEqual($links, expected) {
    equal($links.length, expected.length, 'Has correct number of links');

    let idx;
    for (idx = 0; idx < $links.length; idx++) {
      let href = jQuery($links[idx]).attr('href');
      // Old IE includes the whole hostname as well
      equal(href.slice(-expected[idx].length), expected[idx], `Expected link to be '${expected[idx]}', but was '${href}'`);
    }
  }

  linksEqual(jQuery('a', '#qunit-fixture'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/bar', '/foo']);

  let indexController = appInstance.lookup('controller:index');
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

  setTemplate('index', compile("<h3>Home</h3>{{link-to 'Contact us' 'contact' id='contact-link'}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}"));
  setTemplate('contact', compile("<h3>Contact</h3>{{link-to 'Home' 'index' id='home-link'}}{{link-to 'Self' 'contact' id='self-link'}}"));

  bootApplication();

  run(() => jQuery('#contact-link', '#qunit-fixture').click());

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

  setTemplate('index', compile("<h3>Home</h3>{{link-to contactName 'contact' id='contact-link'}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}"));
  setTemplate('contact', compile("<h3>Contact</h3>{{link-to 'Home' 'index' id='home-link'}}{{link-to 'Self' 'contact' id='self-link'}}"));

  bootApplication();

  run(() => router.handleURL('/'));

  let controller = appInstance.lookup('controller:index');

  equal(jQuery('#contact-link:contains(Jane)', '#qunit-fixture').length, 1, 'The link title is correctly resolved');

  run(() => controller.set('contactName', 'Joe'));

  equal(jQuery('#contact-link:contains(Joe)', '#qunit-fixture').length, 1, 'The link title is correctly updated when the bound property changes');

  run(() => controller.set('contactName', 'Robert'));

  equal(jQuery('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, 'The link title is correctly updated when the bound property changes a second time');

  run(() => jQuery('#contact-link', '#qunit-fixture').click());

  equal(jQuery('h3:contains(Contact)', '#qunit-fixture').length, 1, 'The contact template was rendered');
  equal(jQuery('#self-link.active', '#qunit-fixture').length, 1, 'The self-link was rendered with active class');
  equal(jQuery('#home-link:not(.active)', '#qunit-fixture').length, 1, 'The other link was rendered without active class');

  run(() => jQuery('#home-link', '#qunit-fixture').click());

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

  setTemplate('index', compile("<h3>Home</h3><ul>{{#each model as |person|}}<li>{{link-to person.name 'item' person}}</li>{{/each}}</ul>"));
  setTemplate('item', compile("<h3>Item</h3><p>{{model.name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}"));

  bootApplication();

  run(() => jQuery('li a:contains(Yehuda)', '#qunit-fixture').click());

  equal(jQuery('h3:contains(Item)', '#qunit-fixture').length, 1, 'The item template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Yehuda Katz', 'The name is correct');

  run(() => jQuery('#home-link').click());

  equal(normalizeUrl(jQuery('li a:contains(Yehuda)').attr('href')), '/item/yehuda');
  equal(normalizeUrl(jQuery('li a:contains(Tom)').attr('href')), '/item/tom');
  equal(normalizeUrl(jQuery('li a:contains(Erik)').attr('href')), '/item/erik');
});

QUnit.test('The non-block form {{link-to}} performs property lookup', function() {
  setTemplate('index', compile("{{link-to 'string' 'index' id='string-link'}}{{link-to path foo id='path-link'}}"));

  function assertEquality(href) {
    equal(normalizeUrl(jQuery('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(jQuery('#path-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexController = Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  assertEquality('/');

  let controller = appInstance.lookup('controller:index');
  run(() => controller.set('foo', 'about'));

  assertEquality('/about');
});

QUnit.test('The non-block form {{link-to}} protects against XSS', function() {
  setTemplate('application', compile("{{link-to display 'index' id='link'}}"));

  App.ApplicationController = Controller.extend({
    display: 'blahzorz'
  });

  bootApplication();

  run(router, 'handleURL', '/');

  let controller = appInstance.lookup('controller:application');

  equal(jQuery('#link', '#qunit-fixture').text(), 'blahzorz');
  run(() => controller.set('display', '<b>BLAMMO</b>'));

  equal(jQuery('#link', '#qunit-fixture').text(), '<b>BLAMMO</b>');
  equal(jQuery('b', '#qunit-fixture').length, 0);
});

QUnit.test('the {{link-to}} helper calls preventDefault', function() {
  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  let event = jQuery.Event('click');
  jQuery('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, 'should preventDefault');
});

QUnit.test('the {{link-to}} helper does not call preventDefault if `preventDefault=false` is passed as an option', function() {
  setTemplate('index', compile("{{#link-to 'about' id='about-link' preventDefault=false}}About{{/link-to}}"));

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  let event = jQuery.Event('click');
  jQuery('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault');
});

QUnit.test('the {{link-to}} helper does not call preventDefault if `preventDefault=boundFalseyThing` is passed as an option', function() {
  setTemplate('index', compile("{{#link-to 'about' id='about-link' preventDefault=boundFalseyThing}}About{{/link-to}}"));

  App.IndexController = Controller.extend({
    boundFalseyThing: false
  });

  Router.map(function() {
    this.route('about');
  });

  bootApplication();

  run(router, 'handleURL', '/');

  let event = jQuery.Event('click');
  jQuery('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault');
});

QUnit.test('the {{link-to}} helper throws a useful error if you invoke it wrong', function() {
  expect(1);

  setTemplate('application', compile("{{#link-to 'post'}}Post{{/link-to}}"));

  Router.map(function() {
    this.route('post', { path: 'post/:post_id' });
  });

  QUnit.throws(function() {
    bootApplication();
  }, /(You attempted to define a `\{\{link-to "post"\}\}` but did not pass the parameters required for generating its dynamic segments.|You must provide param `post_id` to `generate`)/);
});

QUnit.test('the {{link-to}} helper does not throw an error if its route has exited', function() {
  expect(0);

  setTemplate('application', compile("{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'post' defaultPost id='default-post-link'}}Default Post{{/link-to}}{{#if currentPost}}{{#link-to 'post' currentPost id='current-post-link'}}Current Post{{/link-to}}{{/if}}"));

  App.ApplicationController = Controller.extend({
    defaultPost: { id: 1 },
    postController: inject.controller('post'),
    currentPost: alias('postController.model')
  });

  App.PostController = Controller.extend();

  App.PostRoute = Route.extend({
    model: function() {
      return { id: 2 };
    },
    serialize: function(model) {
      return { post_id: model.id };
    }
  });

  Router.map(function() {
    this.route('post', { path: 'post/:post_id' });
  });

  bootApplication();

  run(router, 'handleURL', '/');

  run(() => jQuery('#default-post-link', '#qunit-fixture').click());
  run(() => jQuery('#home-link', '#qunit-fixture').click());
  run(() => jQuery('#current-post-link', '#qunit-fixture').click());
  run(() => jQuery('#home-link', '#qunit-fixture').click());
});

QUnit.test('{{link-to}} active property respects changing parent route context', function() {
  setTemplate('application', compile(
    "{{link-to 'OMG' 'things' 'omg' id='omg-link'}} " +
    "{{link-to 'LOL' 'things' 'lol' id='lol-link'}} "));


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
  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  setTemplate('index', compile("{{#link-to 'index' id='the-link'}}Index{{/link-to}}"));
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/', 'link has right href');
});

QUnit.test('{{link-to}} populates href with default query param values with empty query-params object', function() {
  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  setTemplate('index', compile("{{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}"));
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/', 'link has right href');
});

QUnit.test('{{link-to}} with only query-params and a block updates when route changes', function() {
  Router.map(function() {
    this.route('about');
  });

  App.ApplicationController = Controller.extend({
    queryParams: ['foo', 'bar'],
    foo: '123',
    bar: 'yes'
  });

  setTemplate('application', compile(`{{#link-to (query-params foo='456' bar='NAW') id='the-link'}}Index{{/link-to}}`));
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

  run(() => router.handleURL('/about'));

  equal(jQuery('#the-link').attr('href'), '/about?bar=NAW&foo=456', 'link has right href');
});

QUnit.test('Block-less {{link-to}} with only query-params updates when route changes', function() {
  Router.map(function() {
    this.route('about');
  });

  App.ApplicationController = Controller.extend({
    queryParams: ['foo', 'bar'],
    foo: '123',
    bar: 'yes'
  });

  setTemplate('application', compile(`{{link-to "Index" (query-params foo='456' bar='NAW') id='the-link'}}`));
  bootApplication();
  equal(jQuery('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

  run(() => router.handleURL('/about'));

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

  setTemplate('index', compile(`
    <h3>Home</h3>

    {{#link-to params=dynamicLinkParams id="dynamic-link"}}Dynamic{{/link-to}}
  `));

  bootApplication();

  run(() => router.handleURL('/'));

  let link = jQuery('#dynamic-link', '#qunit-fixture');

  equal(link.attr('href'), '/foo/one/two');

  run(() => {
    controller.set('dynamicLinkParams', [
      'bar',
      'one',
      'two',
      'three'
    ]);
  });

  equal(link.attr('href'), '/bar/one/two/three');
});

QUnit.test('GJ: {{link-to}} to a parent root model hook which performs a `transitionTo` has correct active class #13256', function() {
  expect(1);

  Router.map(function() {
    this.route('parent', function() {
      this.route('child');
    });
  });

  App.ParentRoute = Route.extend({
    afterModel(transition) {
      this.transitionTo('parent.child');
    }
  });

  setTemplate('application', compile(`
    {{link-to 'Parent' 'parent' id='parent-link'}}
  `));

  bootApplication();

  run(jQuery('#parent-link'), 'click');

  shouldBeActive('#parent-link');
});
