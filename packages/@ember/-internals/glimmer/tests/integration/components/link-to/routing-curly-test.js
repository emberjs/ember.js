import {
  ApplicationTestCase,
  ModuleBasedTestResolver,
  moduleFor,
  runTask,
} from 'internal-test-helpers';
import Controller, { inject as injectController } from '@ember/controller';
import { A as emberA } from '@ember/array';
import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';
import NoneLocation from '@ember/routing/none-location';
import { service } from '@ember/service';
import Engine from '@ember/engine';
import { DEBUG } from '@glimmer/env';
import { compile } from '../../../utils/helpers';

// IE includes the host name
function normalizeUrl(url) {
  return url.replace(/https?:\/\/[^/]+/, '');
}

function shouldNotBeActive(assert, element) {
  checkActive(assert, element, false);
}

function shouldBeActive(assert, element) {
  checkActive(assert, element, true);
}

function checkActive(assert, element, active) {
  let classList = element.attr('class');
  assert.equal(classList.indexOf('active') > -1, active, `${element} active should be ${active}`);
}

moduleFor(
  '{{link-to}} component (routing tests)',
  class extends ApplicationTestCase {
    constructor() {
      super();

      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about'}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index'}}Self{{/link-to}}</div>
        `
      );
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <div id="home-link">{{#link-to route='index'}}Home{{/link-to}}</div>
        <div id="self-link">{{#link-to route='about'}}Self{{/link-to}}</div>
        `
      );
    }

    async ['@test it navigates into the named route'](assert) {
      await this.visit('/');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );

      await this.click('#about-link > a');

      assert.equal(this.$('h3.about').length, 1, 'The about template was rendered');
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async ['@test [GH#19546] it navigates into the named route when containing other elements'](
      assert
    ) {
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <div id="home-link">{{#link-to route='index'}}<span id='inside'>Home</span>{{/link-to}}</div>
        <div id="self-link">{{#link-to route='about'}}Self{{/link-to}}</div>
        `
      );

      await this.visit('/about');

      assert.equal(this.$('h3.about').length, 1, 'The about template was rendered');
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );

      await this.click('#inside');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async [`@test it applies a 'disabled' class when disabled`](assert) {
      this.addTemplate(
        'index',
        `
        <div id="about-link-static">{{#link-to route="about" disabled="truthy"}}About{{/link-to}}</div>
        <div id="about-link-dynamic">{{#link-to route="about" disabled=this.dynamicDisabled}}About{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          dynamicDisabled = true;
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link-static > a.disabled').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.equal(
        this.$('#about-link-dynamic > a.disabled').length,
        1,
        'The dynamic link is disabled when its disabled is true'
      );

      runTask(() => controller.set('dynamicDisabled', false));

      assert.equal(
        this.$('#about-link-static > a.disabled').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic > a.disabled').length,
        0,
        'The dynamic link is re-enabled when its disabled becomes false'
      );
    }

    async [`@test it doesn't apply a 'disabled' class when not disabled`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about"}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.ok(
        !this.$('#about-link > a').hasClass('disabled'),
        'The link is not disabled if disabled was not provided'
      );
    }

    async [`@test it supports a custom disabledClass`](assert) {
      this.addTemplate(
        'index',
        `
        <div id="about-link-static">{{#link-to route="about" disabledClass="do-not-want" disabled="truthy"}}About{{/link-to}}</div>
        <div id="about-link-dynamic">{{#link-to route="about" disabledClass="do-not-want" disabled=this.dynamicDisabled}}About{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          dynamicDisabled = true;
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link-static > a.do-not-want').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic > a.do-not-want').length,
        1,
        'The dynamic link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-static > a.disabled').length,
        0,
        'The default disabled class is not added on the static link'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic > a.disabled').length,
        0,
        'The default disabled class is not added on the dynamic link'
      );

      runTask(() => controller.set('dynamicDisabled', false));

      assert.equal(
        this.$('#about-link-static > a.do-not-want').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic > a.disabled').length,
        0,
        'The dynamic link is re-enabled when its disabled becomes false'
      );
      assert.strictEqual(
        this.$('#about-link-static > a.disabled').length,
        0,
        'The default disabled class is not added on the static link'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic > a.disabled').length,
        0,
        'The default disabled class is not added on the dynamic link'
      );
    }

    async [`@test it supports a custom disabledClass set via bound param`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabledClass=this.disabledClass disabled=true}}About{{/link-to}}</div>`
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          disabledClass = 'do-not-want';
        }
      );

      await this.visit('/');

      assert.equal(
        this.$('#about-link > a.do-not-want').length,
        1,
        'The link can apply a custom disabled class via bound param'
      );
      assert.strictEqual(
        this.$('#about-link > a.disabled').length,
        0,
        'The default disabled class is not added'
      );

      runTask(() => controller.set('disabledClass', 'can-not-use'));

      assert.equal(
        this.$('#about-link > a.can-not-use').length,
        1,
        'The link can apply a custom disabled class via bound param'
      );
      assert.strictEqual(
        this.$('#about-link > a.do-not-want').length,
        0,
        'The old class is removed'
      );
      assert.strictEqual(
        this.$('#about-link > a.disabled').length,
        0,
        'The default disabled class is not added'
      );
    }

    async [`@test it does not respond to clicks when disabled`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabled=true}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(this.$('h3.about').length, 0, 'Transitioning did not occur');
    }

    async [`@test it responds to clicks according to its disabled bound param`](assert) {
      this.addTemplate(
        'index',
        `<div id="about-link">{{#link-to route="about" disabled=this.dynamicDisabled}}About{{/link-to}}</div>`
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          dynamicDisabled = true;
        }
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(this.$('h3.about').length, 0, 'Transitioning did not occur');

      runTask(() => controller.set('dynamicDisabled', false));

      await this.click('#about-link > a');

      assert.equal(
        this.$('h3.about').length,
        1,
        'Transitioning did occur when disabled became false'
      );
    }

    async [`@test it supports a custom activeClass`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' activeClass='zomg-active'}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index' activeClass='zomg-active'}}Self{{/link-to}}</div>
        `
      );

      await this.visit('/');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link > a.zomg-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.zomg-active)').length,
        1,
        'The other link was rendered without active class'
      );
      assert.strictEqual(
        this.$('#self-link > a.active').length,
        0,
        'The self-link was rendered without the default active class'
      );
      assert.strictEqual(
        this.$('#about-link > a.active').length,
        0,
        'The other link was rendered without the default active class'
      );
    }

    async [`@test it supports a custom activeClass from a bound param`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' activeClass=this.activeClass}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index' activeClass=this.activeClass}}Self{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          activeClass = 'zomg-active';
        }
      );

      await this.visit('/');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link > a.zomg-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.zomg-active)').length,
        1,
        'The other link was rendered without active class'
      );
      assert.strictEqual(
        this.$('#self-link > a.active').length,
        0,
        'The self-link was rendered without the default active class'
      );
      assert.strictEqual(
        this.$('#about-link > a.active').length,
        0,
        'The other link was rendered without the default active class'
      );

      runTask(() => controller.set('activeClass', 'wow-active'));

      assert.equal(
        this.$('#self-link > a.wow-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link > a:not(.wow-active)').length,
        1,
        'The other link was rendered without active class'
      );
      assert.strictEqual(
        this.$('#self-link > a.zomg-active').length,
        0,
        'The self-link was rendered without the previous active class'
      );
      assert.strictEqual(
        this.$('#self-link > a.active').length,
        0,
        'The self-link was rendered without the default active class'
      );
      assert.strictEqual(
        this.$('#about-link > a.active').length,
        0,
        'The other link was rendered without the default active class'
      );
    }

    async ['@test Using {{link-to}} inside a non-routable engine errors'](assert) {
      this.add(
        'engine:not-routable',
        class NotRoutableEngine extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              compile(`{{#link-to route='about'}}About{{/link-to}}`, {
                moduleName: 'non-routable/templates/application.hbs',
              })
            );
          }
        }
      );

      this.addTemplate('index', `{{mount "not-routable"}}`);

      await assert.rejectsAssertion(
        this.visit('/'),
        'You attempted to use the <LinkTo> component within a routeless engine, this is not supported. ' +
          'If you are using the ember-engines addon, use the <LinkToExternal> component instead. ' +
          'See https://ember-engines.com/docs/links for more info.'
      );
    }

    async ['@test Using {{link-to}} inside a routable engine link within the engine'](assert) {
      this.add(
        'engine:routable',
        class RoutableEngine extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              compile(
                `
                <h2 id='engine-layout'>Routable Engine</h2>
                {{outlet}}
                <div id="engine-application-link">{{#link-to route='application'}}Engine Application{{/link-to}}</div>
                `,
                {
                  moduleName: 'routable/templates/application.hbs',
                }
              )
            );
            this.register(
              'template:index',
              compile(
                `
                <h3 class='engine-home'>Engine Home</h3>
                <div id="engine-about-link">{{#link-to route='about'}}Engine About{{/link-to}}</div>
                <div id="engine-self-link">{{#link-to route='index'}}Engine Self{{/link-to}}</div>
                `,
                {
                  moduleName: 'routable/templates/index.hbs',
                }
              )
            );
            this.register(
              'template:about',
              compile(
                `
                <h3 class='engine-about'>Engine About</h3>
                <div id="engine-home-link">{{#link-to route='index'}}Engine Home{{/link-to}}</div>
                <div id="engine-self-link">{{#link-to route='about'}}Engine Self{{/link-to}}</div>
                `,
                {
                  moduleName: 'routable/templates/about.hbs',
                }
              )
            );
          }
        }
      );

      this.router.map(function () {
        this.mount('routable');
      });

      this.add('route-map:routable', function () {
        this.route('about');
      });

      this.addTemplate(
        'application',
        `
        <h1 id="application-layout">Application</h1>
        {{outlet}}
        <div id="application-link">{{#link-to route='application'}}Appliction{{/link-to}}</div>
        <div id="engine-link">{{#link-to route='routable'}}Engine{{/link-to}}</div>
        `
      );

      await this.visit('/');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.strictEqual(this.$('#engine-layout').length, 0, 'The engine layout was not rendered');
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a:not(.active)').length,
        1,
        'The engine link is not active'
      );

      assert.equal(this.$('h3.home').length, 1, 'The application index page is rendered');
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The application index link is active'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The application about link is not active'
      );

      await this.click('#about-link > a');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.strictEqual(this.$('#engine-layout').length, 0, 'The engine layout was not rendered');
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a:not(.active)').length,
        1,
        'The engine link is not active'
      );

      assert.equal(this.$('h3.about').length, 1, 'The application about page is rendered');
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The application about link is active'
      );
      assert.equal(
        this.$('#home-link > a:not(.active)').length,
        1,
        'The application home link is not active'
      );

      await this.click('#engine-link > a');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.equal(this.$('#engine-layout').length, 1, 'The engine layout was rendered');
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(this.$('#engine-link > a.active').length, 1, 'The engine link is active');
      assert.equal(
        this.$('#engine-application-link > a.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(this.$('h3.engine-home').length, 1, 'The engine index page is rendered');
      assert.equal(
        this.$('#engine-self-link > a.active').length,
        1,
        'The engine index link is active'
      );
      assert.equal(
        this.$('#engine-about-link > a:not(.active)').length,
        1,
        'The engine about link is not active'
      );

      await this.click('#engine-about-link > a');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.equal(this.$('#engine-layout').length, 1, 'The engine layout was rendered');
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(this.$('#engine-link > a.active').length, 1, 'The engine link is active');
      assert.equal(
        this.$('#engine-application-link > a.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(this.$('h3.engine-about').length, 1, 'The engine about page is rendered');
      assert.equal(
        this.$('#engine-self-link > a.active').length,
        1,
        'The engine about link is active'
      );
      assert.equal(
        this.$('#engine-home-link > a:not(.active)').length,
        1,
        'The engine home link is not active'
      );

      await this.click('#engine-application-link > a');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.equal(this.$('#engine-layout').length, 1, 'The engine layout was rendered');
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(this.$('#engine-link > a.active').length, 1, 'The engine link is active');
      assert.equal(
        this.$('#engine-application-link > a.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(this.$('h3.engine-home').length, 1, 'The engine index page is rendered');
      assert.equal(
        this.$('#engine-self-link > a.active').length,
        1,
        'The engine index link is active'
      );
      assert.equal(
        this.$('#engine-about-link > a:not(.active)').length,
        1,
        'The engine about link is not active'
      );

      await this.click('#application-link > a');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.strictEqual(this.$('#engine-layout').length, 0, 'The engine layout was not rendered');
      assert.equal(
        this.$('#application-link > a.active').length,
        1,
        'The application link is active'
      );
      assert.equal(
        this.$('#engine-link > a:not(.active)').length,
        1,
        'The engine link is not active'
      );

      assert.equal(this.$('h3.home').length, 1, 'The application index page is rendered');
      assert.equal(
        this.$('#self-link > a.active').length,
        1,
        'The application index link is active'
      );
      assert.equal(
        this.$('#about-link > a:not(.active)').length,
        1,
        'The application about link is not active'
      );
    }
  }
);

moduleFor(
  '{{link-to}} component (routing tests - location hooks)',
  class extends ApplicationTestCase {
    constructor() {
      super();

      this.updateCount = 0;
      this.replaceCount = 0;

      let testContext = this;

      this.add(
        'location:none',
        class extends NoneLocation {
          setURL(...args) {
            testContext.updateCount++;
            return super.setURL(...args);
          }
          replaceURL(...args) {
            testContext.replaceCount++;
            return super.setURL(...args);
          }
        }
      );

      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about'}}About{{/link-to}}</div>
        <div id="self-link">{{#link-to route='index'}}Self{{/link-to}}</div>
        `
      );
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <div id="home-link">{{#link-to route='index'}}Home{{/link-to}}</div>
        <div id="self-link">{{#link-to route='about'}}Self{{/link-to}}</div>
        `
      );
    }

    async visit(...args) {
      await super.visit(...args);

      this.updateCountAfterVisit = this.updateCount;
      this.replaceCountAfterVisit = this.replaceCount;
    }

    async ['@test it supports URL replacement'](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' replace=true}}About{{/link-to}}</div>
        `
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(
        this.updateCount,
        this.updateCountAfterVisit,
        'setURL should not be called'
      );

      assert.strictEqual(
        this.replaceCount,
        this.replaceCountAfterVisit + 1,
        'replaceURL should be called once'
      );
    }

    async ['@test it supports URL replacement via replace=boundTruthyThing'](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' replace=this.boundTruthyThing}}About{{/link-to}}</div>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundTruthyThing = true;
        }
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(
        this.updateCount,
        this.updateCountAfterVisit,
        'setURL should not be called'
      );

      assert.strictEqual(
        this.replaceCount,
        this.replaceCountAfterVisit + 1,
        'replaceURL should be called once'
      );
    }

    async ['@test it supports setting replace=boundFalseyThing'](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id="about-link">{{#link-to route='about' replace=this.boundFalseyThing}}About{{/link-to}}</div>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundFalseyThing = false;
        }
      );

      await this.visit('/');

      await this.click('#about-link > a');

      assert.strictEqual(
        this.updateCount,
        this.updateCountAfterVisit + 1,
        'setURL should be called'
      );

      assert.strictEqual(
        this.replaceCount,
        this.replaceCountAfterVisit,
        'replaceURL should not be called'
      );
    }
  }
);

moduleFor(
  'The {{link-to}} component - nested routes and link-to arguments',
  class extends ApplicationTestCase {
    async ['@test it supports leaving off .index for nested routes'](assert) {
      this.router.map(function () {
        this.route('about', function () {
          this.route('item');
        });
      });

      this.addTemplate('about', `<h1>About</h1>{{outlet}}`);
      this.addTemplate('about.index', `<div id='index'>Index</div>`);
      this.addTemplate(
        'about.item',
        `<div id='item'>{{#link-to route='about'}}About{{/link-to}}</div>`
      );

      await this.visit('/about/item');

      assert.equal(normalizeUrl(this.$('#item a').attr('href')), '/about');
    }

    async [`@test it supports custom, nested, current-when`](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });

        this.route('item');
      });

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="other-link">{{#link-to route='item' current-when='index'}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link > a.active').length,
        1,
        'The link is active since current-when is a parent route'
      );
    }

    async [`@test it does not disregard current-when when it is given explicitly for a route`](
      assert
    ) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });

        this.route('items', function () {
          this.route('item');
        });
      });

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="other-link">{{#link-to route='items' current-when='index'}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link > a.active').length,
        1,
        'The link is active when current-when is given for explicitly for a route'
      );
    }

    async ['@test it does not disregard current-when when it is set via a bound param'](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });

        this.route('items', function () {
          this.route('item');
        });
      });

      this.add(
        'controller:index.about',
        class extends Controller {
          currentWhen = 'index';
        }
      );

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="other-link">{{#link-to route='items' current-when=this.currentWhen}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link > a.active').length,
        1,
        'The link is active when current-when is given for explicitly for a route'
      );
    }

    async ['@test it supports multiple current-when routes'](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });
        this.route('item');
        this.route('foo');
      });

      this.addTemplate('index', `<h3 class="home">Home</h3>{{outlet}}`);
      this.addTemplate(
        'index.about',
        `<div id="link1">{{#link-to route='item' current-when='item index'}}ITEM{{/link-to}}</div>`
      );
      this.addTemplate(
        'item',
        `<div id="link2">{{#link-to route='item' current-when='item index'}}ITEM{{/link-to}}</div>`
      );
      this.addTemplate(
        'foo',
        `<div id="link3">{{#link-to route='item' current-when='item index'}}ITEM{{/link-to}}</div>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#link1 > a.active').length,
        1,
        'The link is active since current-when contains the parent route'
      );

      await this.visit('/item');

      assert.equal(
        this.$('#link2 > a.active').length,
        1,
        'The link is active since you are on the active route'
      );

      await this.visit('/foo');

      assert.equal(
        this.$('#link3 > a.active').length,
        0,
        'The link is not active since current-when does not contain the active route'
      );
    }

    async ['@test it supports boolean values for current-when'](assert) {
      this.router.map(function () {
        this.route('index', { path: '/' }, function () {
          this.route('about');
        });
        this.route('item');
      });

      this.addTemplate(
        'index.about',
        `
        <div id="index-link">{{#link-to route='index' current-when=this.isCurrent}}index{{/link-to}}</div>
        <div id="about-link">{{#link-to route='item' current-when=true}}ITEM{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index.about',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          isCurrent = false;
        }
      );

      await this.visit('/about');

      assert.ok(
        this.$('#about-link > a').hasClass('active'),
        'The link is active since current-when is true'
      );
      assert.notOk(
        this.$('#index-link > a').hasClass('active'),
        'The link is not active since current-when is false'
      );

      runTask(() => controller.set('isCurrent', true));

      assert.ok(
        this.$('#index-link > a').hasClass('active'),
        'The link is active since current-when is true'
      );
    }

    async ['@test it defaults to bubbling'](assert) {
      this.addTemplate(
        'about',
        `
        <div {{action this.hide}}>
          <div id="about-contact">{{#link-to route='about.contact'}}About{{/link-to}}</div>
        </div>
        {{outlet}}
        `
      );

      this.addTemplate('about.contact', `<h1 id='contact'>Contact</h1>`);

      this.router.map(function () {
        this.route('about', function () {
          this.route('contact');
        });
      });

      let hidden = 0;

      this.add(
        'controller:about',
        class extends Controller {
          hide() {
            hidden++;
          }
        }
      );

      await this.visit('/about');

      await this.click('#about-contact > a');

      assert.equal(this.$('#contact').text(), 'Contact', 'precond - the link worked');

      assert.equal(hidden, 1, 'The link bubbles');
    }

    async [`@test it moves into the named route with context`](assert) {
      this.router.map(function () {
        this.route('about');
        this.route('item', { path: '/item/:id' });
      });

      this.addTemplate(
        'about',
        `
        <h3 class="list">List</h3>
        <ul>
          {{#each @model as |person|}}
            <li id={{person.id}}>
              {{#link-to route='item' model=person}}
                {{person.name}}
              {{/link-to}}
            </li>
          {{/each}}
        </ul>
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        `
      );

      this.addTemplate(
        'item',
        `
        <h3 class="item">Item</h3>
        <p>{{@model.name}}</p>
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        `
      );

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>
        `
      );

      this.add(
        'route:about',
        Route.extend({
          model() {
            return [
              { id: 'yehuda', name: 'Yehuda Katz' },
              { id: 'tom', name: 'Tom Dale' },
              { id: 'erik', name: 'Erik Brynroflsson' },
            ];
          },
        })
      );

      await this.visit('/about');

      assert.equal(this.$('h3.list').length, 1, 'The home template was rendered');
      assert.equal(
        normalizeUrl(this.$('#home-link > a').attr('href')),
        '/',
        'The home link points back at /'
      );

      await this.click('#yehuda > a');

      assert.equal(this.$('h3.item').length, 1, 'The item template was rendered');
      assert.equal(this.$('p').text(), 'Yehuda Katz', 'The name is correct');

      await this.click('#home-link > a');

      await this.click('#about-link > a');

      assert.equal(normalizeUrl(this.$('li#yehuda > a').attr('href')), '/item/yehuda');
      assert.equal(normalizeUrl(this.$('li#tom > a').attr('href')), '/item/tom');
      assert.equal(normalizeUrl(this.$('li#erik > a').attr('href')), '/item/erik');

      await this.click('#erik > a');

      assert.equal(this.$('h3.item').length, 1, 'The item template was rendered');
      assert.equal(this.$('p').text(), 'Erik Brynroflsson', 'The name is correct');
    }

    async [`@test it calls preventDefault`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `<div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>`
      );

      await this.visit('/');

      assertNav({ prevented: true }, () => this.$('#about-link > a').click(), assert);
    }

    async [`@test it accepts string/numeric arguments`](assert) {
      this.router.map(function () {
        this.route('filter', { path: '/filters/:filter' });
        this.route('post', { path: '/post/:post_id' });
        this.route('repo', { path: '/repo/:owner/:name' });
      });

      this.add(
        'controller:filter',
        class extends Controller {
          filter = 'unpopular';
          repo = { owner: 'ember', name: 'ember.js' };
          post_id = 123;
        }
      );

      this.addTemplate(
        'filter',
        `
        <p>{{this.filter}}</p>
        <div id="link">{{#link-to route="filter" model="unpopular"}}Unpopular{{/link-to}}</div>
        <div id="path-link">{{#link-to route="filter" model=this.filter}}Unpopular{{/link-to}}</div>
        <div id="post-path-link">{{#link-to route="post" model=this.post_id}}Post{{/link-to}}</div>
        <div id="post-number-link">{{#link-to route="post" model=123}}Post{{/link-to}}</div>
        <div id="repo-object-link">{{#link-to route="repo" model=this.repo}}Repo{{/link-to}}</div>
        `
      );

      await this.visit('/filters/popular');

      assert.equal(normalizeUrl(this.$('#link > a').attr('href')), '/filters/unpopular');
      assert.equal(normalizeUrl(this.$('#path-link > a').attr('href')), '/filters/unpopular');
      assert.equal(normalizeUrl(this.$('#post-path-link > a').attr('href')), '/post/123');
      assert.equal(normalizeUrl(this.$('#post-number-link > a').attr('href')), '/post/123');
      assert.equal(
        normalizeUrl(this.$('#repo-object-link > a').attr('href')),
        '/repo/ember/ember.js'
      );
    }

    async [`@test [GH#4201] Shorthand for route.index shouldn't throw errors about context arguments`](
      assert
    ) {
      this.router.map(function () {
        this.route('lobby', function () {
          this.route('index', { path: ':lobby_id' });
          this.route('list');
        });
      });

      this.add(
        'route:lobby.index',
        class extends Route {
          model(params) {
            assert.equal(params.lobby_id, 'foobar');
            return params.lobby_id;
          }
        }
      );

      this.addTemplate(
        'lobby.index',
        `<div id='lobby-link'>{{#link-to route='lobby' model='foobar'}}Lobby{{/link-to}}</div>`
      );

      this.addTemplate(
        'lobby.list',
        `<div id='lobby-link'>{{#link-to route='lobby' model='foobar'}}Lobby{{/link-to}}</div>`
      );

      await this.visit('/lobby/list');

      await this.click('#lobby-link > a');

      shouldBeActive(assert, this.$('#lobby-link > a'));
    }

    async [`@test Quoteless route param performs property lookup`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <div id='string-link'>{{#link-to route='index'}}string{{/link-to}}</div>
        <div id='path-link'>{{#link-to route=this.foo}}path{{/link-to}}</div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          foo = 'index';
        }
      );

      let assertEquality = (href) => {
        assert.equal(normalizeUrl(this.$('#string-link > a').attr('href')), '/');
        assert.equal(normalizeUrl(this.$('#path-link > a').attr('href')), href);
      };

      await this.visit('/');

      assertEquality('/');

      runTask(() => controller.set('foo', 'about'));

      assertEquality('/about');
    }

    async [`@test it refreshes href element when one of params changes`](assert) {
      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' });
      });

      let post = { id: '1' };
      let secondPost = { id: '2' };

      this.addTemplate(
        'index',
        `<div id="post">{{#link-to route="post" model=this.post}}post{{/link-to}}</div>`
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }
        }
      );

      await this.visit('/');

      runTask(() => controller.set('post', post));

      assert.equal(
        normalizeUrl(this.$('#post > a').attr('href')),
        '/posts/1',
        'precond - Link has rendered href attr properly'
      );

      runTask(() => controller.set('post', secondPost));

      assert.equal(
        this.$('#post > a').attr('href'),
        '/posts/2',
        'href attr was updated after one of the params had been changed'
      );

      runTask(() => controller.set('post', null));

      assert.equal(
        this.$('#post > a').attr('href'),
        '#',
        'href attr becomes # when one of the arguments in nullified'
      );
    }

    async [`@test it is active when a route is active`](assert) {
      this.router.map(function () {
        this.route('about', function () {
          this.route('item');
        });
      });

      this.addTemplate(
        'about',
        `
        <div id='about'>
          <div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>
          <div id='item-link'>{{#link-to route='about.item'}}Item{{/link-to}}</div>
          {{outlet}}
        </div>
        `
      );

      await this.visit('/about');

      assert.equal(this.$('#about-link > a.active').length, 1, 'The about route link is active');
      assert.equal(this.$('#item-link > a.active').length, 0, 'The item route link is inactive');

      await this.visit('/about/item');

      assert.equal(this.$('#about-link > a.active').length, 1, 'The about route link is active');
      assert.equal(this.$('#item-link > a.active').length, 1, 'The item route link is active');
    }

    async [`@test it works in an #each'd array of string route names`](assert) {
      this.router.map(function () {
        this.route('foo');
        this.route('bar');
        this.route('rar');
      });

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          routeNames = emberA(['foo', 'bar', 'rar']);
          route1 = 'bar';
          route2 = 'foo';
        }
      );

      this.addTemplate(
        'index',
        `
        {{#each this.routeNames as |routeName|}}
          {{#link-to route=routeName}}{{routeName}}{{/link-to}}
        {{/each}}
        {{#each this.routeNames as |r|}}
          {{#link-to route=r}}{{r}}{{/link-to}}
        {{/each}}
        {{#link-to route=this.route1}}a{{/link-to}}
        {{#link-to route=this.route2}}b{{/link-to}}
        `
      );

      let linksEqual = (links, expected) => {
        assert.equal(links.length, expected.length, 'Has correct number of links');

        let idx;
        for (idx = 0; idx < links.length; idx++) {
          let href = this.$(links[idx]).attr('href');
          // Old IE includes the whole hostname as well
          assert.equal(
            href.slice(-expected[idx].length),
            expected[idx],
            `Expected link to be '${expected[idx]}', but was '${href}'`
          );
        }
      };

      await this.visit('/');

      linksEqual(this.$('a'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/bar', '/foo']);

      runTask(() => controller.set('route1', 'rar'));

      linksEqual(this.$('a'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/rar', '/foo']);

      runTask(() => controller.routeNames.shiftObject());

      linksEqual(this.$('a'), ['/bar', '/rar', '/bar', '/rar', '/rar', '/foo']);
    }

    async [`@test it throws a useful error if you invoke it wrong`](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      this.router.map(function () {
        this.route('post', { path: 'post/:post_id' });
      });

      this.addTemplate('application', `{{#link-to route='post'}}Post{{/link-to}}`);

      return assert.rejectsAssertion(
        this.visit('/'),
        /(You attempted to define a `\{\{link-to "post"\}\}` but did not pass the parameters required for generating its dynamic segments.|You must provide param `post_id` to `generate`)/
      );
    }

    async [`@test it does not throw an error if its route has exited`](assert) {
      assert.expect(0);

      this.router.map(function () {
        this.route('post', { path: 'post/:post_id' });
      });

      this.addTemplate(
        'application',
        `
        <div id='home-link'>{{#link-to route='index'}}Home{{/link-to}}</div>
        <div id='default-post-link'>{{#link-to route='post' model=this.defaultPost}}Default Post{{/link-to}}</div>
        {{#if this.currentPost}}
          <div id='current-post-link'>{{#link-to route='post' model=this.currentPost}}Current Post{{/link-to}}</div>
        {{/if}}
        `
      );

      this.add(
        'controller:application',
        class extends Controller {
          defaultPost = { id: 1 };

          @injectController('post') postController;

          get currentPost() {
            return this.postController.model;
          }
        }
      );

      this.add('controller:post', class extends Controller {});

      this.add(
        'route:post',
        class extends Route {
          model() {
            return { id: 2 };
          }
          serialize(model) {
            return { post_id: model.id };
          }
        }
      );

      await this.visit('/');
      await this.click('#default-post-link > a');
      await this.click('#home-link > a');
      await this.click('#current-post-link > a');
      await this.click('#home-link > a');
    }

    async [`@test its active property respects changing parent route context`](assert) {
      this.router.map(function () {
        this.route('things', { path: '/things/:name' }, function () {
          this.route('other');
        });
      });

      this.addTemplate(
        'application',
        `
        <div id='omg-link'>{{#link-to route='things' model='omg'}}OMG{{/link-to}}</div>
        <div id='lol-link'>{{#link-to route='things' model='lol'}}LOL{{/link-to}}</div>
        `
      );

      await this.visit('/things/omg');

      shouldBeActive(assert, this.$('#omg-link > a'));
      shouldNotBeActive(assert, this.$('#lol-link > a'));

      await this.visit('/things/omg/other');

      shouldBeActive(assert, this.$('#omg-link > a'));
      shouldNotBeActive(assert, this.$('#lol-link > a'));
    }

    async [`@test it populates href with default query param values even without query-params object`](
      assert
    ) {
      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['foo'];
          foo = '123';
        }
      );

      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to route='index'}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(this.$('#the-link > a').attr('href'), '/', 'link has right href');
    }

    async [`@test it populates href with default query param values with empty query-params object`](
      assert
    ) {
      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['foo'];
          foo = '123';
        }
      );

      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to route='index' query=(hash)}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(this.$('#the-link > a').attr('href'), '/', 'link has right href');
    }

    async [`@test it updates when route changes with only query-params and a block`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.add(
        'controller:application',
        class extends Controller {
          queryParams = ['foo', 'bar'];
          foo = '123';
          bar = 'yes';
        }
      );

      this.addTemplate(
        'application',
        `<div id='the-link'>{{#link-to query=(hash foo='456' bar='NAW')}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/?bar=NAW&foo=456',
        'link has right href'
      );

      await this.visit('/about');

      assert.equal(
        this.$('#the-link > a').attr('href'),
        '/about?bar=NAW&foo=456',
        'link has right href'
      );
    }

    async ['@test [GH#17018] passing model to {{link-to}} with `hash` helper works']() {
      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' });
      });

      this.add(
        'route:index',
        class extends Route {
          model() {
            return RSVP.hash({
              user: { name: 'Papa Smurf' },
            });
          }
        }
      );

      this.addTemplate(
        'index',
        `{{#link-to route='post' model=(hash id="someId" user=@model.user)}}Post{{/link-to}}`
      );

      this.addTemplate('post', 'Post: {{@model.user.name}}');

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/posts/someId' },
        content: 'Post',
      });

      await this.click('a');

      this.assertText('Post: Papa Smurf');
    }

    async [`@test [GH#13256]: {{link-to}} to a parent root model hook which performs a 'transitionTo' has correct active class`](
      assert
    ) {
      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
        });
      });

      this.add(
        'route:parent',
        class extends Route {
          @service router;
          afterModel() {
            this.router.transitionTo('parent.child');
          }
        }
      );

      this.addTemplate(
        'application',
        `<div id='parent-link'>{{#link-to route='parent'}}Parent{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#parent-link > a');

      shouldBeActive(assert, this.$('#parent-link > a'));
    }
  }
);

moduleFor(
  'The {{link-to}} component - loading states and warnings',
  class extends ApplicationTestCase {
    async [`@test {{link-to}} with null/undefined dynamic parameters are put in a loading state`](
      assert
    ) {
      let warningMessage =
        'This link is in an inactive loading state because at least one of its models currently has a null/undefined value, or the provided route name is invalid.';

      this.router.map(function () {
        this.route('thing', { path: '/thing/:thing_id' });
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <div id='context-link'>
          {{#link-to route=this.destinationRoute model=this.routeContext loadingClass='i-am-loading'}}
            string
          {{/link-to}}
        </div>
        <div id='static-link'>
          {{#link-to route=this.secondRoute loadingClass=this.loadingClass}}
            string
          {{/link-to}}
        </div>
        `
      );

      let controller;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          destinationRoute = null;
          routeContext = null;
          loadingClass = 'i-am-loading';
        }
      );

      let activate = 0;

      this.add(
        'route:about',
        class extends Route {
          activate() {
            activate++;
          }
        }
      );

      function assertLinkStatus(link, url) {
        if (url) {
          assert.equal(normalizeUrl(link.attr('href')), url, 'loaded link-to has expected href');
          assert.ok(!link.hasClass('i-am-loading'), 'loaded linkComponent has no loadingClass');
        } else {
          assert.equal(normalizeUrl(link.attr('href')), '#', "unloaded link-to has href='#'");
          assert.ok(link.hasClass('i-am-loading'), 'loading linkComponent has loadingClass');
        }
      }

      await this.visit('/');

      let contextLink = this.$('#context-link > a');
      let staticLink = this.$('#static-link > a');

      assertLinkStatus(contextLink);
      assertLinkStatus(staticLink);

      await expectWarning(() => this.click(contextLink[0]), warningMessage);

      // Set the destinationRoute (context is still null).
      runTask(() => controller.set('destinationRoute', 'thing'));
      assertLinkStatus(contextLink);

      // Set the routeContext to an id
      runTask(() => controller.set('routeContext', '456'));
      assertLinkStatus(contextLink, '/thing/456');

      // Test that 0 isn't interpreted as falsy.
      runTask(() => controller.set('routeContext', 0));
      assertLinkStatus(contextLink, '/thing/0');

      // Set the routeContext to an object
      runTask(() => controller.set('routeContext', { id: 123 }));
      assertLinkStatus(contextLink, '/thing/123');

      // Set the destinationRoute back to null.
      runTask(() => controller.set('destinationRoute', null));
      assertLinkStatus(contextLink);

      await expectWarning(() => this.click(staticLink[0]), warningMessage);

      runTask(() => controller.set('secondRoute', 'about'));
      assertLinkStatus(staticLink, '/about');

      // Click the now-active link
      await this.click(staticLink[0]);

      assert.equal(activate, 1, 'About route was entered');
    }
  }
);

function assertNav(options, callback, assert) {
  let nav = false;

  function check(event) {
    assert.equal(
      event.defaultPrevented,
      options.prevented,
      `expected defaultPrevented=${options.prevented}`
    );
    nav = true;
    event.preventDefault();
  }

  try {
    document.addEventListener('click', check);
    callback();
  } finally {
    document.removeEventListener('click', check);
    assert.ok(nav, 'Expected a link to be clicked');
  }
}
