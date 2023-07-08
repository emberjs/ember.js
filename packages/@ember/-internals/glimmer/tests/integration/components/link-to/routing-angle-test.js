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
  '<LinkTo /> component (routing tests)',
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
        <LinkTo @route='about' id='about-link'>About</LinkTo>
        <LinkTo @route='index' id='self-link'>Self</LinkTo>
        `
      );
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <LinkTo @route='index' id='home-link'>Home</LinkTo>
        <LinkTo @route='about' id='self-link'>Self</LinkTo>
        `
      );
    }

    async ['@test it navigates into the named route'](assert) {
      await this.visit('/');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );

      await this.click('#about-link');

      assert.equal(this.$('h3.about').length, 1, 'The about template was rendered');
      assert.equal(
        this.$('#self-link.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link:not(.active)').length,
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
        <LinkTo @route='index' id='home-link'><span id='inside'>Home</span></LinkTo>
        <LinkTo @route='about' id='self-link'>Self</LinkTo>
        `
      );

      await this.visit('/about');

      assert.equal(this.$('h3.about').length, 1, 'The about template was rendered');
      assert.equal(
        this.$('#self-link.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#home-link:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );

      await this.click('#inside');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link.active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link:not(.active)').length,
        1,
        'The other link was rendered without active class'
      );
    }

    async [`@test it applies a 'disabled' class when disabled`](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="about-link-static" @route="about" @disabled="truthy">About</LinkTo>
        <LinkTo id="about-link-dynamic" @route="about" @disabled={{this.dynamicDisabled}}>About</LinkTo>
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
        this.$('#about-link-static.disabled').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.equal(
        this.$('#about-link-dynamic.disabled').length,
        1,
        'The dynamic link is disabled when its disabled is true'
      );

      runTask(() => controller.set('dynamicDisabled', false));

      assert.equal(
        this.$('#about-link-static.disabled').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic.disabled').length,
        0,
        'The dynamic link is re-enabled when its disabled becomes false'
      );
    }

    async [`@test it doesn't apply a 'disabled' class when not disabled`](assert) {
      this.addTemplate('index', `<LinkTo id="about-link" @route="about">About</LinkTo>`);

      await this.visit('/');

      assert.ok(
        !this.$('#about-link').hasClass('disabled'),
        'The link is not disabled if disabled was not provided'
      );
    }

    async [`@test it supports a custom disabledClass`](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="about-link-static" @route="about" @disabledClass="do-not-want" @disabled={{true}}>About</LinkTo>
        <LinkTo id="about-link-dynamic" @route="about" @disabledClass="do-not-want" @disabled={{this.dynamicDisabled}}>About</LinkTo>
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
        this.$('#about-link-static.do-not-want').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic.do-not-want').length,
        1,
        'The dynamic link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-static.disabled').length,
        0,
        'The default disabled class is not added on the static link'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic.disabled').length,
        0,
        'The default disabled class is not added on the dynamic link'
      );

      runTask(() => controller.set('dynamicDisabled', false));

      assert.equal(
        this.$('#about-link-static.do-not-want').length,
        1,
        'The static link is disabled when its disabled is true'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic.disabled').length,
        0,
        'The dynamic link is re-enabled when its disabled becomes false'
      );
      assert.strictEqual(
        this.$('#about-link-static.disabled').length,
        0,
        'The default disabled class is not added on the static link'
      );
      assert.strictEqual(
        this.$('#about-link-dynamic.disabled').length,
        0,
        'The default disabled class is not added on the dynamic link'
      );
    }

    async [`@test it supports a custom disabledClass set via bound param`](assert) {
      this.addTemplate(
        'index',
        `<LinkTo id="about-link" @route="about" @disabledClass={{this.disabledClass}} @disabled={{true}}>About</LinkTo>`
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
        this.$('#about-link.do-not-want').length,
        1,
        'The link can apply a custom disabled class via bound param'
      );
      assert.strictEqual(
        this.$('#about-link.disabled').length,
        0,
        'The default disabled class is not added'
      );

      runTask(() => controller.set('disabledClass', 'can-not-use'));

      assert.equal(
        this.$('#about-link.can-not-use').length,
        1,
        'The link can apply a custom disabled class via bound param'
      );
      assert.strictEqual(this.$('#about-link.do-not-want').length, 0, 'The old class is removed');
      assert.strictEqual(
        this.$('#about-link.disabled').length,
        0,
        'The default disabled class is not added'
      );
    }

    async [`@test it does not respond to clicks when disabled`](assert) {
      this.addTemplate(
        'index',
        `<LinkTo id="about-link" @route="about" @disabled={{true}}>About</LinkTo>`
      );

      await this.visit('/');

      await this.click('#about-link');

      assert.strictEqual(this.$('h3.about').length, 0, 'Transitioning did not occur');
    }

    async [`@test it responds to clicks according to its disabled bound param`](assert) {
      this.addTemplate(
        'index',
        `<LinkTo id="about-link" @route="about" @disabled={{this.dynamicDisabled}}>About</LinkTo>`
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

      await this.click('#about-link');

      assert.strictEqual(this.$('h3.about').length, 0, 'Transitioning did not occur');

      runTask(() => controller.set('dynamicDisabled', false));

      await this.click('#about-link');

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
        <LinkTo id='about-link' @route='about' @activeClass='zomg-active'>About</LinkTo>
        <LinkTo id='self-link' @route='index' @activeClass='zomg-active'>Self</LinkTo>
        `
      );

      await this.visit('/');

      assert.equal(this.$('h3.home').length, 1, 'The home template was rendered');
      assert.equal(
        this.$('#self-link.zomg-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link:not(.zomg-active)').length,
        1,
        'The other link was rendered without active class'
      );
      assert.strictEqual(
        this.$('#self-link.active').length,
        0,
        'The self-link was rendered without the default active class'
      );
      assert.strictEqual(
        this.$('#about-link.active').length,
        0,
        'The other link was rendered without the default active class'
      );
    }

    async [`@test it supports a custom activeClass from a bound param`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='about-link' @route='about' @activeClass={{this.activeClass}}>About</LinkTo>
        <LinkTo id='self-link' @route='index' @activeClass={{this.activeClass}}>Self</LinkTo>
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
        this.$('#self-link.zomg-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link:not(.zomg-active)').length,
        1,
        'The other link was rendered without active class'
      );
      assert.strictEqual(
        this.$('#self-link.active').length,
        0,
        'The self-link was rendered without the default active class'
      );
      assert.strictEqual(
        this.$('#about-link.active').length,
        0,
        'The other link was rendered without the default active class'
      );

      runTask(() => controller.set('activeClass', 'wow-active'));

      assert.equal(
        this.$('#self-link.wow-active').length,
        1,
        'The self-link was rendered with active class'
      );
      assert.equal(
        this.$('#about-link:not(.wow-active)').length,
        1,
        'The other link was rendered without active class'
      );
      assert.strictEqual(
        this.$('#self-link.zomg-active').length,
        0,
        'The self-link was rendered without the previous active class'
      );
      assert.strictEqual(
        this.$('#self-link.active').length,
        0,
        'The self-link was rendered without the default active class'
      );
      assert.strictEqual(
        this.$('#about-link.active').length,
        0,
        'The other link was rendered without the default active class'
      );
    }

    async ['@test Using <LinkTo> inside a non-routable engine errors'](assert) {
      this.add(
        'engine:not-routable',
        class NotRoutableEngine extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);
            this.register(
              'template:application',
              compile(`<LinkTo @route='about'>About</LinkTo>`, {
                moduleName: 'non-routable/templates/application.hbs',
              })
            );
          }
        }
      );

      this.addTemplate('index', `{{mount 'not-routable'}}`);

      await assert.rejectsAssertion(
        this.visit('/'),
        'You attempted to use the <LinkTo> component within a routeless engine, this is not supported. ' +
          'If you are using the ember-engines addon, use the <LinkToExternal> component instead. ' +
          'See https://ember-engines.com/docs/links for more info.'
      );
    }

    async ['@test Using <LinkTo> inside a routable engine link within the engine'](assert) {
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
                <LinkTo @route='application' id='engine-application-link'>Engine Appliction</LinkTo>
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
                <LinkTo @route='about' id='engine-about-link'>Engine About</LinkTo>
                <LinkTo @route='index' id='engine-self-link'>Engine Self</LinkTo>
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
                <LinkTo @route='index' id='engine-home-link'>Engine Home</LinkTo>
                <LinkTo @route='about' id='engine-self-link'>Engine Self</LinkTo>
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
        <h1 id='application-layout'>Application</h1>
        {{outlet}}
        <LinkTo @route='application' id='application-link'>Appliction</LinkTo>
        <LinkTo @route='routable' id='engine-link'>Engine</LinkTo>
        `
      );

      await this.visit('/');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.strictEqual(this.$('#engine-layout').length, 0, 'The engine layout was not rendered');
      assert.equal(this.$('#application-link.active').length, 1, 'The application link is active');
      assert.equal(this.$('#engine-link:not(.active)').length, 1, 'The engine link is not active');

      assert.equal(this.$('h3.home').length, 1, 'The application index page is rendered');
      assert.equal(this.$('#self-link.active').length, 1, 'The application index link is active');
      assert.equal(
        this.$('#about-link:not(.active)').length,
        1,
        'The application about link is not active'
      );

      await this.click('#about-link');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.strictEqual(this.$('#engine-layout').length, 0, 'The engine layout was not rendered');
      assert.equal(this.$('#application-link.active').length, 1, 'The application link is active');
      assert.equal(this.$('#engine-link:not(.active)').length, 1, 'The engine link is not active');

      assert.equal(this.$('h3.about').length, 1, 'The application about page is rendered');
      assert.equal(this.$('#self-link.active').length, 1, 'The application about link is active');
      assert.equal(
        this.$('#home-link:not(.active)').length,
        1,
        'The application home link is not active'
      );

      await this.click('#engine-link');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.equal(this.$('#engine-layout').length, 1, 'The engine layout was rendered');
      assert.equal(this.$('#application-link.active').length, 1, 'The application link is active');
      assert.equal(this.$('#engine-link.active').length, 1, 'The engine link is active');
      assert.equal(
        this.$('#engine-application-link.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(this.$('h3.engine-home').length, 1, 'The engine index page is rendered');
      assert.equal(this.$('#engine-self-link.active').length, 1, 'The engine index link is active');
      assert.equal(
        this.$('#engine-about-link:not(.active)').length,
        1,
        'The engine about link is not active'
      );

      await this.click('#engine-about-link');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.equal(this.$('#engine-layout').length, 1, 'The engine layout was rendered');
      assert.equal(this.$('#application-link.active').length, 1, 'The application link is active');
      assert.equal(this.$('#engine-link.active').length, 1, 'The engine link is active');
      assert.equal(
        this.$('#engine-application-link.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(this.$('h3.engine-about').length, 1, 'The engine about page is rendered');
      assert.equal(this.$('#engine-self-link.active').length, 1, 'The engine about link is active');
      assert.equal(
        this.$('#engine-home-link:not(.active)').length,
        1,
        'The engine home link is not active'
      );

      await this.click('#engine-application-link');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.equal(this.$('#engine-layout').length, 1, 'The engine layout was rendered');
      assert.equal(this.$('#application-link.active').length, 1, 'The application link is active');
      assert.equal(this.$('#engine-link.active').length, 1, 'The engine link is active');
      assert.equal(
        this.$('#engine-application-link.active').length,
        1,
        'The engine application link is active'
      );

      assert.equal(this.$('h3.engine-home').length, 1, 'The engine index page is rendered');
      assert.equal(this.$('#engine-self-link.active').length, 1, 'The engine index link is active');
      assert.equal(
        this.$('#engine-about-link:not(.active)').length,
        1,
        'The engine about link is not active'
      );

      await this.click('#application-link');

      assert.equal(this.$('#application-layout').length, 1, 'The application layout was rendered');
      assert.strictEqual(this.$('#engine-layout').length, 0, 'The engine layout was not rendered');
      assert.equal(this.$('#application-link.active').length, 1, 'The application link is active');
      assert.equal(this.$('#engine-link:not(.active)').length, 1, 'The engine link is not active');

      assert.equal(this.$('h3.home').length, 1, 'The application index page is rendered');
      assert.equal(this.$('#self-link.active').length, 1, 'The application index link is active');
      assert.equal(
        this.$('#about-link:not(.active)').length,
        1,
        'The application about link is not active'
      );
    }
  }
);

moduleFor(
  '<LinkTo /> component (routing tests - location hooks)',
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
        <LinkTo id='about-link' @route='about'>About</LinkTo>
        <LinkTo id='self-link' @route='index'>Self</LinkTo>
        `
      );
      this.addTemplate(
        'about',
        `
        <h3 class="about">About</h3>
        <LinkTo id='home-link' @route='index'>Home</LinkTo>
        <LinkTo id='self-link' @route='about'>Self</LinkTo>
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
        <LinkTo id='about-link' @route='about' @replace={{true}}>About</LinkTo>
        `
      );

      await this.visit('/');

      await this.click('#about-link');

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
        <LinkTo id='about-link' @route='about' @replace={{this.boundTruthyThing}}>About</LinkTo>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundTruthyThing = true;
        }
      );

      await this.visit('/');

      await this.click('#about-link');

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
        <LinkTo id='about-link' @route='about' replace={{this.boundFalseyThing}}>About</LinkTo>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          boundFalseyThing = false;
        }
      );

      await this.visit('/');

      await this.click('#about-link');

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
  'The <LinkTo /> component - nested routes and link-to arguments',
  class extends ApplicationTestCase {
    async ['@test it supports leaving off .index for nested routes'](assert) {
      this.router.map(function () {
        this.route('about', function () {
          this.route('item');
        });
      });

      this.addTemplate('about', `<h1>About</h1>{{outlet}}`);
      this.addTemplate('about.index', `<div id='index'>Index</div>`);
      this.addTemplate('about.item', `<div id='item'><LinkTo @route='about'>About</LinkTo></div>`);

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
        `<LinkTo id='other-link' @route='item' @current-when='index'>ITEM</LinkTo>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link.active').length,
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
        `<LinkTo id='other-link' @route='items' @current-when='index'>ITEM</LinkTo>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link.active').length,
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
        `<LinkTo id='other-link' @route='items' @current-when={{this.currentWhen}}>ITEM</LinkTo>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#other-link.active').length,
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
        `<LinkTo id='link1' @route='item' @current-when='item index'>ITEM</LinkTo>`
      );
      this.addTemplate(
        'item',
        `<LinkTo id='link2' @route='item' @current-when='item index'>ITEM</LinkTo>`
      );
      this.addTemplate(
        'foo',
        `<LinkTo id='link3' @route='item' @current-when='item index'>ITEM</LinkTo>`
      );

      await this.visit('/about');

      assert.equal(
        this.$('#link1.active').length,
        1,
        'The link is active since current-when contains the parent route'
      );

      await this.visit('/item');

      assert.equal(
        this.$('#link2.active').length,
        1,
        'The link is active since you are on the active route'
      );

      await this.visit('/foo');

      assert.equal(
        this.$('#link3.active').length,
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
        <LinkTo id='index-link' @route='index' @current-when={{this.isCurrent}}>ITEM</LinkTo>
        <LinkTo id='about-link' @route='item' @current-when={{true}}>ITEM</LinkTo>
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
        this.$('#about-link').hasClass('active'),
        'The link is active since current-when is true'
      );
      assert.notOk(
        this.$('#index-link').hasClass('active'),
        'The link is not active since current-when is false'
      );

      runTask(() => controller.set('isCurrent', true));

      assert.ok(
        this.$('#index-link').hasClass('active'),
        'The link is active since current-when is true'
      );
    }

    async ['@test it defaults to bubbling'](assert) {
      this.addTemplate(
        'about',
        `
        <div {{action this.hide}}>
          <LinkTo id='about-contact' @route='about.contact'>About</LinkTo>
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

      await this.click('#about-contact');

      assert.equal(this.$('#contact').text(), 'Contact', 'precond - the link worked');

      assert.equal(hidden, 1, 'The link bubbles');
    }

    async [`The propagation of the click event can be stopped`](assert) {
      this.addTemplate(
        'about',
        `
        <div {{on 'click' this.hide}}>
          <LinkTo id='about-contact' @route='about.contact' {{on 'click' this.stopPropagation}}>
            About
          </LinkTo>
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

          stopPropagation(event) {
            event.stopPropagation();
          }
        }
      );

      await this.visit('/about');

      await this.click('#about-contact');

      assert.equal(this.$('#contact').text(), 'Contact', 'precond - the link worked');

      assert.equal(hidden, 0, "The link didn't bubble");
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
            <li>
              <LinkTo id={{person.id}} @route='item' @model={{person}}>
                {{person.name}}
              </LinkTo>
            </li>
          {{/each}}
        </ul>
        <LinkTo id='home-link' @route='index'>Home</LinkTo>
        `
      );

      this.addTemplate(
        'item',
        `
        <h3 class="item">Item</h3>
        <p>{{@model.name}}</p>
        <LinkTo id='home-link' @route='index'>Home</LinkTo>
        `
      );

      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='about-link' @route='about'>About</LinkTo>
        `
      );

      this.add(
        'route:about',
        class extends Route {
          model() {
            return [
              { id: 'yehuda', name: 'Yehuda Katz' },
              { id: 'tom', name: 'Tom Dale' },
              { id: 'erik', name: 'Erik Brynroflsson' },
            ];
          }
        }
      );

      await this.visit('/about');

      assert.equal(this.$('h3.list').length, 1, 'The home template was rendered');
      assert.equal(
        normalizeUrl(this.$('#home-link').attr('href')),
        '/',
        'The home link points back at /'
      );

      await this.click('#yehuda');

      assert.equal(this.$('h3.item').length, 1, 'The item template was rendered');
      assert.equal(this.$('p').text(), 'Yehuda Katz', 'The name is correct');

      await this.click('#home-link');

      await this.click('#about-link');

      assert.equal(normalizeUrl(this.$('li a#yehuda').attr('href')), '/item/yehuda');
      assert.equal(normalizeUrl(this.$('li a#tom').attr('href')), '/item/tom');
      assert.equal(normalizeUrl(this.$('li a#erik').attr('href')), '/item/erik');

      await this.click('#erik');

      assert.equal(this.$('h3.item').length, 1, 'The item template was rendered');
      assert.equal(this.$('p').text(), 'Erik Brynroflsson', 'The name is correct');
    }

    async [`@test it binds some anchor html tag common attributes`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='self-link' @route='index' title='title-attr' rel='rel-attr' tabindex='-1'>
          Self
        </LinkTo>
        `
      );

      await this.visit('/');

      let link = this.$('#self-link');
      assert.equal(link.attr('title'), 'title-attr', 'The self-link contains title attribute');
      assert.equal(link.attr('rel'), 'rel-attr', 'The self-link contains rel attribute');
      assert.equal(link.attr('tabindex'), '-1', 'The self-link contains tabindex attribute');
    }

    async [`@test it supports 'target' attribute`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='self-link' @route='index' target='_blank'>Self</LinkTo>
        `
      );

      await this.visit('/');

      let link = this.$('#self-link');
      assert.equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
    }

    async [`@test it supports 'target' attribute specified as a bound param`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='self-link' @route='index' target={{this.boundLinkTarget}}>Self</LinkTo>
        `
      );

      let controller = this;

      this.add(
        'controller:index',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          boundLinkTarget = '_blank';
        }
      );

      await this.visit('/');

      let link = this.$('#self-link');
      assert.equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');

      runTask(() => controller.set('boundLinkTarget', '_self'));

      assert.equal(link.attr('target'), '_self', 'The self-link contains `target` attribute');
    }

    async [`@test it calls preventDefault`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate('index', `<LinkTo @route='about' id='about-link'>About</LinkTo>`);

      await this.visit('/');

      assertNav({ prevented: true }, () => this.$('#about-link').click(), assert);
    }

    async [`@test it does not call preventDefault if 'target' attribute is provided`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='self-link' @route='index' target='_blank'>Self</LinkTo>
        `
      );

      await this.visit('/');

      assertNav({ prevented: false }, () => this.$('#self-link').click(), assert);
    }

    async [`@test it should preventDefault when 'target = _self'`](assert) {
      this.addTemplate(
        'index',
        `
        <h3 class="home">Home</h3>
        <LinkTo id='self-link' @route='index' target='_self'>Self</LinkTo>
        `
      );

      await this.visit('/');

      assertNav({ prevented: true }, () => this.$('#self-link').click(), assert);
    }

    async [`@test it should not transition if target is not equal to _self or empty`](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id='about-link' @route='about' @replace={{true}} target='_blank'>
          About
        </LinkTo>
        `
      );

      this.router.map(function () {
        this.route('about');
      });

      await this.visit('/');

      await this.click('#about-link');

      assert.notEqual(
        this.appRouter.currentRouteName,
        'about',
        'link-to should not transition if target is not equal to _self or empty'
      );
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
        <LinkTo id="link" @route="filter" @model="unpopular">Unpopular</LinkTo>
        <LinkTo id="path-link" @route="filter" @model={{this.filter}}>Unpopular</LinkTo>
        <LinkTo id="post-path-link" @route="post" @model={{this.post_id}}>Post</LinkTo>
        <LinkTo id="post-number-link" @route="post" @model={{123}}>Post</LinkTo>
        <LinkTo id="repo-object-link" @route="repo" @model={{this.repo}}>Repo</LinkTo>
        `
      );

      await this.visit('/filters/popular');

      assert.equal(normalizeUrl(this.$('#link').attr('href')), '/filters/unpopular');
      assert.equal(normalizeUrl(this.$('#path-link').attr('href')), '/filters/unpopular');
      assert.equal(normalizeUrl(this.$('#post-path-link').attr('href')), '/post/123');
      assert.equal(normalizeUrl(this.$('#post-number-link').attr('href')), '/post/123');
      assert.equal(normalizeUrl(this.$('#repo-object-link').attr('href')), '/repo/ember/ember.js');
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
        `<LinkTo id='lobby-link' @route='lobby' @model='foobar'>Lobby</LinkTo>`
      );

      this.addTemplate(
        'lobby.list',
        `<LinkTo id='lobby-link' @route='lobby' @model='foobar'>Lobby</LinkTo>`
      );

      await this.visit('/lobby/list');

      await this.click('#lobby-link');

      shouldBeActive(assert, this.$('#lobby-link'));
    }

    async [`@test Quoteless route param performs property lookup`](assert) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <LinkTo id='string-link' @route='index'>string</LinkTo>
        <LinkTo id='path-link' @route={{this.foo}}>path</LinkTo>
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
        assert.equal(normalizeUrl(this.$('#string-link').attr('href')), '/');
        assert.equal(normalizeUrl(this.$('#path-link').attr('href')), href);
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
        `<LinkTo id="post" @route="post" @model={{this.post}}>post</LinkTo>`
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
        normalizeUrl(this.$('#post').attr('href')),
        '/posts/1',
        'precond - Link has rendered href attr properly'
      );

      runTask(() => controller.set('post', secondPost));

      assert.equal(
        this.$('#post').attr('href'),
        '/posts/2',
        'href attr was updated after one of the params had been changed'
      );

      runTask(() => controller.set('post', null));

      assert.equal(
        this.$('#post').attr('href'),
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
          <LinkTo id='about-link' @route='about'>About</LinkTo>
          <LinkTo id='item-link' @route='about.item'>Item</LinkTo>
          {{outlet}}
        </div>
        `
      );

      await this.visit('/about');

      assert.equal(this.$('#about-link.active').length, 1, 'The about route link is active');
      assert.equal(this.$('#item-link.active').length, 0, 'The item route link is inactive');

      await this.visit('/about/item');

      assert.equal(this.$('#about-link.active').length, 1, 'The about route link is active');
      assert.equal(this.$('#item-link.active').length, 1, 'The item route link is active');
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
          <LinkTo @route={{routeName}}>{{routeName}}</LinkTo>
        {{/each}}
        {{#each this.routeNames as |r|}}
          <LinkTo @route={{r}}>{{r}}</LinkTo>
        {{/each}}
        <LinkTo @route={{this.route1}}>a</LinkTo>
        <LinkTo @route={{this.route2}}>b</LinkTo>
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

      this.addTemplate('application', `<LinkTo @route='post'>Post</LinkTo>`);

      return assert.rejectsAssertion(
        this.visit('/'),
        /(You attempted to generate a link for the "post" route, but did not pass the models required for generating its dynamic segments.|You must provide param `post_id` to `generate`)/
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
        <LinkTo id='home-link' @route='index'>Home</LinkTo>
        <LinkTo id='default-post-link' @route='post' @model={{this.defaultPost}}>Default Post</LinkTo>
        {{#if this.currentPost}}
          <LinkTo id='current-post-link' @route='post' @model={{this.currentPost}}>Current Post</LinkTo>
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
      await this.click('#default-post-link');
      await this.click('#home-link');
      await this.click('#current-post-link');
      await this.click('#home-link');
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
        <LinkTo id='omg-link' @route='things' @model='omg'>OMG</LinkTo>
        <LinkTo id='lol-link' @route='things' @model='lol'>LOL</LinkTo>
        `
      );

      await this.visit('/things/omg');

      shouldBeActive(assert, this.$('#omg-link'));
      shouldNotBeActive(assert, this.$('#lol-link'));

      await this.visit('/things/omg/other');

      shouldBeActive(assert, this.$('#omg-link'));
      shouldNotBeActive(assert, this.$('#lol-link'));
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

      this.addTemplate('index', `<LinkTo id='the-link' @route='index'>Index</LinkTo>`);

      await this.visit('/');

      assert.equal(this.$('#the-link').attr('href'), '/', 'link has right href');
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
        `<LinkTo id='the-link' @route='index' @query={{(hash)}}>Index</LinkTo>`
      );

      await this.visit('/');

      assert.equal(this.$('#the-link').attr('href'), '/', 'link has right href');
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
        `<LinkTo id='the-link' @query={{hash foo='456' bar='NAW'}}>Index</LinkTo>`
      );

      await this.visit('/');

      assert.equal(this.$('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

      await this.visit('/about');

      assert.equal(
        this.$('#the-link').attr('href'),
        '/about?bar=NAW&foo=456',
        'link has right href'
      );
    }

    async ['@test [GH#17018] passing model to <LinkTo /> with `hash` helper works']() {
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
        `<LinkTo @route='post' @model={{hash id="someId" user=@model.user}}>Post</LinkTo>`
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

    async [`@test [GH#13256]: <LinkTo /> to a parent root model hook which performs a 'transitionTo' has correct active class`](
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

      this.addTemplate('application', `<LinkTo id='parent-link' @route='parent'>Parent</LinkTo>`);

      await this.visit('/');

      await this.click('#parent-link');

      shouldBeActive(assert, this.$('#parent-link'));
    }
  }
);

moduleFor(
  'The <LinkTo /> component - loading states and warnings',
  class extends ApplicationTestCase {
    async [`@test <LinkTo /> with null/undefined dynamic parameters are put in a loading state`](
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
        <LinkTo id='context-link' @route={{this.destinationRoute}} @model={{this.routeContext}} @loadingClass='i-am-loading'>
          string
        </LinkTo>
        <LinkTo id='static-link' @route={{this.secondRoute}} @loadingClass={{this.loadingClass}}>
          string
        </LinkTo>
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

      let contextLink = this.$('#context-link');
      let staticLink = this.$('#static-link');

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
