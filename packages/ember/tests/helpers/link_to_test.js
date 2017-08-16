import Logger from 'ember-console';
import {
  moduleFor,
  ApplicationTestCase,
  AutobootApplicationTestCase
} from 'internal-test-helpers';

import {
  Controller,
  inject,
  A as emberA
} from 'ember-runtime';
import {
  instrumentationSubscribe as subscribe,
  alias
} from 'ember-metal';
import { Router, Route, NoneLocation } from 'ember-routing';
import { jQuery } from 'ember-views';
import { EMBER_IMPROVED_INSTRUMENTATION } from 'ember/features';

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

moduleFor('The {{link-to}} helper - basic tests', class extends ApplicationTestCase {

  constructor() {
    super();

    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link'}}About{{/link-to}}
      {{#link-to 'index' id='self-link'}}Self{{/link-to}}
    `);
    this.addTemplate('about', `
      <h3>About</h3>
      {{#link-to 'index' id='home-link'}}Home{{/link-to}}
      {{#link-to 'about' id='self-link'}}Self{{/link-to}}
    `);
  }

  ['@test The {{link-to}} helper moves into the named route'](assert) {
    this.visit('/');
    assert.equal(this.$('h3:contains(Home)').length, 1, 'The home template was rendered');
    assert.equal(this.$('#self-link.active').length, 1, 'The self-link was rendered with active class');
    assert.equal(this.$('#about-link:not(.active)').length, 1, 'The other link was rendered without active class');

    this.click('#about-link');

    assert.equal(this.$('h3:contains(About)').length, 1, 'The about template was rendered');
    assert.equal(this.$('#self-link.active').length, 1, 'The self-link was rendered with active class');
    assert.equal(this.$('#home-link:not(.active)').length, 1, 'The other link was rendered without active class');
  }

  [`@test the {{link-to}} helper doesn't add an href when the tagName isn't 'a'`](assert) {
    this.addTemplate('index', `
      {{#link-to 'about' id='about-link' tagName='div'}}About{{/link-to}}
    `);

    this.visit('/');

    assert.equal(this.$('#about-link').attr('href'), undefined, 'there is no href attribute');
  }

  [`@test the {{link-to}} applies a 'disabled' class when disabled`](assert) {
    this.addTemplate('index', `
      {{#link-to "about" id="about-link-static" disabledWhen="shouldDisable"}}About{{/link-to}}
      {{#link-to "about" id="about-link-dynamic" disabledWhen=dynamicDisabledWhen}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      shouldDisable: true,
      dynamicDisabledWhen: 'shouldDisable'
    }));

    this.visit('/');

    assert.equal(this.$('#about-link-static.disabled').length, 1, 'The static link is disabled when its disabledWhen is true');
    assert.equal(this.$('#about-link-dynamic.disabled').length, 1, 'The dynamic link is disabled when its disabledWhen is true');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => controller.set('dynamicDisabledWhen', false));

    assert.equal(this.$('#about-link-dynamic.disabled').length, 0, 'The dynamic link is re-enabled when its disabledWhen becomes false');
  }

  [`@test the {{link-to}} doesn't apply a 'disabled' class if disabledWhen is not provided`](assert) {
    this.addTemplate('index', `{{#link-to "about" id="about-link"}}About{{/link-to}}`);

    this.visit('/');

    assert.ok(!this.$('#about-link').hasClass('disabled'), 'The link is not disabled if disabledWhen not provided');
  }

  [`@test the {{link-to}} helper supports a custom disabledClass`](assert) {
    this.addTemplate('index', `
      {{#link-to "about" id="about-link" disabledWhen=true disabledClass="do-not-want"}}About{{/link-to}}
    `);

    this.visit('/');

    assert.equal(this.$('#about-link.do-not-want').length, 1, 'The link can apply a custom disabled class');
  }

  [`@test the {{link-to}} helper supports a custom disabledClass set via bound param`](assert) {
    this.addTemplate('index', `
      {{#link-to "about" id="about-link" disabledWhen=true disabledClass=disabledClass}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      disabledClass: 'do-not-want'
    }));

    this.visit('/');

    assert.equal(this.$('#about-link.do-not-want').length, 1, 'The link can apply a custom disabled class via bound param');
  }

  [`@test the {{link-to}} helper does not respond to clicks when disabled`](assert) {
    this.addTemplate('index', `
      {{#link-to "about" id="about-link" disabledWhen=true}}About{{/link-to}}
    `);

    this.visit('/');
    this.click('#about-link');

    assert.equal(this.$('h3:contains(About)').length, 0, 'Transitioning did not occur');
  }

  [`@test the {{link-to}} helper responds to clicks according to its disabledWhen bound param`](assert) {
    this.addTemplate('index', `
      {{#link-to "about" id="about-link" disabledWhen=disabledWhen}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      disabledWhen: true
    }));

    this.visit('/');

    this.click('#about-link');

    assert.equal(this.$('h3:contains(About)').length, 0, 'Transitioning did not occur');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => controller.set('disabledWhen', false));

    this.click('#about-link');

    assert.equal(this.$('h3:contains(About)').length, 1, 'Transitioning did occur when disabledWhen became false');
  }

  [`@test The {{link-to}} helper supports a custom activeClass`](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link'}}About{{/link-to}}
      {{#link-to 'index' id='self-link' activeClass='zomg-active'}}Self{{/link-to}}
    `);

    this.visit('/');

    assert.equal(this.$('h3:contains(Home)').length, 1, 'The home template was rendered');
    assert.equal(this.$('#self-link.zomg-active').length, 1, 'The self-link was rendered with active class');
    assert.equal(this.$('#about-link:not(.active)').length, 1, 'The other link was rendered without active class');
  }

  [`@test The {{link-to}} helper supports a custom activeClass from a bound param`](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link'}}About{{/link-to}}
      {{#link-to 'index' id='self-link' activeClass=activeClass}}Self{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      activeClass: 'zomg-active'
    }));

    this.visit('/');

    assert.equal(this.$('h3:contains(Home)').length, 1, 'The home template was rendered');
    assert.equal(this.$('#self-link.zomg-active').length, 1, 'The self-link was rendered with active class');
    assert.equal(this.$('#about-link:not(.active)').length, 1, 'The other link was rendered without active class');
  }

  [`@test The {{link-to}} helper supports 'classNameBindings' with custom values [GH #11699]`](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link' classNameBindings='foo:foo-is-true:foo-is-false'}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      foo: false
    }));

    this.visit('/');

    assert.equal(this.$('#about-link.foo-is-false').length, 1, 'The about-link was rendered with the falsy class');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => controller.set('foo', true));

    assert.equal(this.$('#about-link.foo-is-true').length, 1, 'The about-link was rendered with the truthy class after toggling the property');
  }
})

moduleFor('The {{link-to}} helper - location hooks', class extends ApplicationTestCase {

  constructor() {
    super();

    this.updateCount = 0;
    this.replaceCount = 0;

    let testContext = this;
    this.add('location:none', NoneLocation.extend({
      setURL() {
        testContext.updateCount++;
        return this._super(...arguments);
      },
      replaceURL() {
        testContext.replaceCount++;
        return this._super(...arguments);
      }
    }));

    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link'}}About{{/link-to}}
      {{#link-to 'index' id='self-link'}}Self{{/link-to}}
    `);
    this.addTemplate('about', `
      <h3>About</h3>
      {{#link-to 'index' id='home-link'}}Home{{/link-to}}
      {{#link-to 'about' id='self-link'}}Self{{/link-to}}
    `);
  }

  visit() {
    super.visit(...arguments);
    this.updateCountAfterVisit = this.updateCount;
    this.replaceCountAfterVisit = this.replaceCount;
  }

  ['@test The {{link-to}} helper supports URL replacement'](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link' replace=true}}About{{/link-to}}
    `);

    this.visit('/');
    this.click('#about-link');

    assert.equal(
      this.updateCount, this.updateCountAfterVisit,
      'setURL should not be called'
    );
    assert.equal(
      this.replaceCount, this.replaceCountAfterVisit + 1,
      'replaceURL should be called once'
    );
  }

  ['@test The {{link-to}} helper supports URL replacement via replace=boundTruthyThing'](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link' replace=boundTruthyThing}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      boundTruthyThing: true
    }));

    this.visit('/');
    this.click('#about-link');

    assert.equal(
      this.updateCount, this.updateCountAfterVisit,
      'setURL should not be called'
    );
    assert.equal(
      this.replaceCount, this.replaceCountAfterVisit + 1,
      'replaceURL should be called once'
    );
  }

  ['@test The {{link-to}} helper supports setting replace=boundFalseyThing'](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link' replace=boundFalseyThing}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      boundFalseyThing: false
    }));

    this.visit('/');
    this.click('#about-link');

    assert.equal(
      this.updateCount, this.updateCountAfterVisit + 1,
      'setURL should be called'
    );
    assert.equal(
      this.replaceCount, this.replaceCountAfterVisit,
      'replaceURL should not be called'
    );
  }

});

if (EMBER_IMPROVED_INSTRUMENTATION) {
  moduleFor('The {{link-to}} helper with EMBER_IMPROVED_INSTRUMENTATION', class extends ApplicationTestCase {

    constructor() {
      super();

      this.router.map(function() {
        this.route('about');
      });

      this.addTemplate('index', `
        <h3>Home</h3>
        {{#link-to 'about' id='about-link'}}About{{/link-to}}
        {{#link-to 'index' id='self-link'}}Self{{/link-to}}
      `);
      this.addTemplate('about', `
        <h3>About</h3>
        {{#link-to 'index' id='home-link'}}Home{{/link-to}}
        {{#link-to 'about' id='self-link'}}Self{{/link-to}}
      `);

      this.visit('/');
    }

    ['@test The {{link-to}} helper fires an interaction event'](assert) {
      assert.expect(2);

      subscribe('interaction.link-to', {
        before() {
          assert.ok(true, 'instrumentation subscriber was called');
        },
        after() {
          assert.ok(true, 'instrumentation subscriber was called');
        }
      });

      this.click('#about-link');
    }

    ['@test The {{link-to}} helper interaction event includes the route name'](assert) {
      assert.expect(2);

      subscribe('interaction.link-to', {
        before(name, timestamp, { routeName }) {
          assert.equal(routeName, 'about', 'instrumentation subscriber was passed route name');
        },
        after(name, timestamp, { routeName }) {
          assert.equal(routeName, 'about', 'instrumentation subscriber was passed route name');
        }
      });

      this.click('#about-link');
    }

    ['@test The {{link-to}} helper interaction event includes the transition in the after hook'](assert) {
      assert.expect(1);

      subscribe('interaction.link-to', {
        before() {},
        after(name, timestamp, { transition }) {
          assert.equal(transition.targetName, 'about', 'instrumentation subscriber was passed route name');
        }
      });

      this.click('#about-link');
    }
  });
}

moduleFor('The {{link-to}} helper - nested routes and link-to arguments', class extends ApplicationTestCase {

  ['@test The {{link-to}} helper supports leaving off .index for nested routes'](assert) {
    this.router.map(function() {
      this.route('about', function() {
        this.route('item');
      });
    });

    this.addTemplate('about', `<h1>About</h1>{{outlet}}`);
    this.addTemplate('about.index', `<div id='index'>Index</div>`);
    this.addTemplate('about.item', `<div id='item'>{{#link-to 'about'}}About{{/link-to}}</div>`);

    this.visit('/about/item');

    assert.equal(normalizeUrl(this.$('#item a').attr('href')), '/about');
  }

  ['@test The {{link-to}} helper supports currentWhen (DEPRECATED)'](assert) {
    expectDeprecation('Usage of `currentWhen` is deprecated, use `current-when` instead.');

    this.router.map(function() {
      this.route('index', { path: '/' }, function() {
        this.route('about');
      });
      this.route('item');
    });

    this.addTemplate('index', `<h3>Home</h3>{{outlet}}`);
    this.addTemplate('index.about', `
      {{#link-to 'item' id='other-link' currentWhen='index'}}ITEM{{/link-to}}
    `);

    this.visit('/about');

    assert.equal(this.$('#other-link.active').length, 1, 'The link is active since current-when is a parent route');
  }

  [`@test The {{link-to}} helper supports custom, nested, current-when`]() {
    this.router.map(function() {
      this.route('index', { path: '/' }, function() {
        this.route('about');
      });

      this.route('item');
    });

    this.addTemplate('index', `<h3>Home</h3>{{outlet}}`);
    this.addTemplate('index.about', `
      {{#link-to 'item' id='other-link' current-when='index'}}ITEM{{/link-to}}
    `);

    this.visit('/about');

    equal(this.$('#other-link.active').length, 1, 'The link is active since current-when is a parent route');
  }

  [`@test The {{link-to}} helper does not disregard current-when when it is given explicitly for a route`](assert) {
    this.router.map(function() {
      this.route('index', { path: '/' }, function() {
        this.route('about');
      });

      this.route('items', function() {
        this.route('item');
      });
    });

    this.addTemplate('index', `<h3>Home</h3>{{outlet}}`);
    this.addTemplate('index.about', `
      {{#link-to 'items' id='other-link' current-when='index'}}ITEM{{/link-to}}
    `);

    this.visit('/about');

    assert.equal(this.$('#other-link.active').length, 1, 'The link is active when current-when is given for explicitly for a route');
  }

  ['@test The {{link-to}} helper does not disregard current-when when it is set via a bound param'](assert) {
    this.router.map(function() {
      this.route('index', { path: '/' }, function() {
        this.route('about');
      });

      this.route('items', function() {
        this.route('item');
      });
    });

    this.add('controller:index.about', Controller.extend({
      currentWhen: 'index'
    }));

    this.addTemplate('index', `<h3>Home</h3>{{outlet}}`);
    this.addTemplate('index.about', `{{#link-to 'items' id='other-link' current-when=currentWhen}}ITEM{{/link-to}}`);

    this.visit('/about');

    assert.equal(this.$('#other-link.active').length, 1, 'The link is active when current-when is given for explicitly for a route');
  }

  ['@test The {{link-to}} helper supports multiple current-when routes'](assert) {
    this.router.map(function() {
      this.route('index', { path: '/' }, function() {
        this.route('about');
      });
      this.route('item');
      this.route('foo');
    });

    this.addTemplate('index', `<h3>Home</h3>{{outlet}}`);
    this.addTemplate('index.about', `{{#link-to 'item' id='link1' current-when='item index'}}ITEM{{/link-to}}`);
    this.addTemplate('item', `{{#link-to 'item' id='link2' current-when='item index'}}ITEM{{/link-to}}`);
    this.addTemplate('foo', `{{#link-to 'item' id='link3' current-when='item index'}}ITEM{{/link-to}}`);

    this.visit('/about');

    assert.equal(this.$('#link1.active').length, 1, 'The link is active since current-when contains the parent route');

    this.visit('/item');

    assert.equal(this.$('#link2.active').length, 1, 'The link is active since you are on the active route');

    this.visit('/foo');

    assert.equal(this.$('#link3.active').length, 0, 'The link is not active since current-when does not contain the active route');
  }

  ['@test The {{link-to}} helper supports boolean values for current-when'](assert) {
    this.router.map(function(match) {
      this.route('index', { path: '/' }, function() {
        this.route('about');
      });
      this.route('item');
    });

    this.addTemplate('index', `<h3>Home</h3>{{outlet}}`);
    this.addTemplate('index.about', `{{#link-to 'item' id='other-link' current-when=true}}ITEM{{/link-to}}`);

    this.visit('/about');

    assert.equal(this.$('#other-link').length, 1, 'The link is active since current-when is true');
  }

  ['@test The {{link-to}} helper defaults to bubbling'](assert) {
    this.addTemplate('about', `
      <div {{action 'hide'}}>
        {{#link-to 'about.contact' id='about-contact'}}About{{/link-to}}
      </div>
      {{outlet}}
    `);
    this.addTemplate('about.contact', `
      <h1 id='contact'>Contact</h1>
    `);

    this.router.map(function() {
      this.route('about', function() {
        this.route('contact');
      });
    });

    let hidden = 0;

    this.add('route:about', Route.extend({
      actions: {
        hide() {
          hidden++;
        }
      }
    }));

    this.visit('/about');

    this.click('#about-contact');

    assert.equal(this.$('#contact').text(), 'Contact', 'precond - the link worked');

    assert.equal(hidden, 1, 'The link bubbles');
  }

  [`@test The {{link-to}} helper supports bubbles=false`](assert) {
    this.addTemplate('about', `
      <div {{action 'hide'}}>
        {{#link-to 'about.contact' id='about-contact' bubbles=false}}
          About
        {{/link-to}}
      </div>
      {{outlet}}
    `);
    this.addTemplate('about.contact', `<h1 id='contact'>Contact</h1>`);

    this.router.map(function() {
      this.route('about', function() {
        this.route('contact');
      });
    });

    let hidden = 0;

    this.add('route:about', Route.extend({
      actions: {
        hide() {
          hidden++;
        }
      }
    }));

    this.visit('/about');

    this.click('#about-contact');

    assert.equal(this.$('#contact').text(), 'Contact', 'precond - the link worked');

    assert.equal(hidden, 0, "The link didn't bubble");
  }

  [`@test The {{link-to}} helper supports bubbles=boundFalseyThing`](assert) {
    this.addTemplate('about', `
      <div {{action 'hide'}}>
        {{#link-to 'about.contact' id='about-contact' bubbles=boundFalseyThing}}
          About
        {{/link-to}}
      </div>
      {{outlet}}
    `);
    this.addTemplate('about.contact', `<h1 id='contact'>Contact</h1>`);

    this.add('controller:about', Controller.extend({
      boundFalseyThing: false
    }));

    this.router.map(function() {
      this.route('about', function() {
        this.route('contact');
      });
    });

    let hidden = 0;

    this.add('route:about', Route.extend({
      actions: {
        hide() {
          hidden++;
        }
      }
    }));

    this.visit('/about');
    this.click('#about-contact');

    assert.equal(this.$('#contact').text(), 'Contact', 'precond - the link worked');
    assert.equal(hidden, 0, "The link didn't bubble");
  }

  [`@test The {{link-to}} helper moves into the named route with context`](assert) {
    this.router.map(function() {
      this.route('about');
      this.route('item', { path: '/item/:id' });
    });

    this.addTemplate('about', `
      <h3>List</h3>
      <ul>
        {{#each model as |person|}}
          <li>
            {{#link-to 'item' person}}
              {{person.name}}
            {{/link-to}}
          </li>
        {{/each}}
      </ul>
      {{#link-to 'index' id='home-link'}}Home{{/link-to}}
    `);

    this.addTemplate('item', `
      <h3>Item</h3>
      <p>{{model.name}}</p>
      {{#link-to 'index' id='home-link'}}Home{{/link-to}}
    `);

    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'about' id='about-link'}}About{{/link-to}}
    `);

    this.add('route:about', Route.extend({
      model() {
        return [
          { id: 'yehuda', name: 'Yehuda Katz' },
          { id: 'tom', name: 'Tom Dale' },
          { id: 'erik', name: 'Erik Brynroflsson' }
        ];
      }
    }));

    this.visit('/about');

    assert.equal(this.$('h3:contains(List)').length, 1, 'The home template was rendered');
    assert.equal(normalizeUrl(this.$('#home-link').attr('href')), '/', 'The home link points back at /');

    this.click('li a:contains(Yehuda)');

    assert.equal(this.$('h3:contains(Item)').length, 1, 'The item template was rendered');
    assert.equal(this.$('p').text(), 'Yehuda Katz', 'The name is correct');

    this.click('#home-link');
    this.click('#about-link');

    assert.equal(normalizeUrl(this.$('li a:contains(Yehuda)').attr('href')), '/item/yehuda');
    assert.equal(normalizeUrl(this.$('li a:contains(Tom)').attr('href')), '/item/tom');
    assert.equal(normalizeUrl(this.$('li a:contains(Erik)').attr('href')), '/item/erik');

    this.click('li a:contains(Erik)');

    assert.equal(this.$('h3:contains(Item)').length, 1, 'The item template was rendered');
    assert.equal(this.$('p').text(), 'Erik Brynroflsson', 'The name is correct');
  }

  [`@test The {{link-to}} helper binds some anchor html tag common attributes`](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'index' id='self-link' title='title-attr' rel='rel-attr' tabindex='-1'}}
        Self
      {{/link-to}}
    `);

    this.visit('/');

    let link = this.$('#self-link');
    assert.equal(link.attr('title'), 'title-attr', 'The self-link contains title attribute');
    assert.equal(link.attr('rel'), 'rel-attr', 'The self-link contains rel attribute');
    assert.equal(link.attr('tabindex'), '-1', 'The self-link contains tabindex attribute');
  }

  [`@test The {{link-to}} helper supports 'target' attribute`](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'index' id='self-link' target='_blank'}}Self{{/link-to}}
    `);

    this.visit('/');

    let link = this.$('#self-link');
    assert.equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
  }

  [`@test The {{link-to}} helper supports 'target' attribute specified as a bound param`](assert) {
    this.addTemplate('index', `<h3>Home</h3>{{#link-to 'index' id='self-link' target=boundLinkTarget}}Self{{/link-to}}`);

    this.add('controller:index', Controller.extend({
      boundLinkTarget: '_blank'
    }));

    this.visit('/');

    let link = this.$('#self-link');
    assert.equal(link.attr('target'), '_blank', 'The self-link contains `target` attribute');
  }

  [`@test the {{link-to}} helper calls preventDefault`](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      {{#link-to 'about' id='about-link'}}About{{/link-to}}
    `);

    this.visit('/');

    let event = jQuery.Event('click');
    this.$('#about-link').trigger(event);

    assert.equal(event.isDefaultPrevented(), true, 'should preventDefault');
  }

  [`@test the {{link-to}} helper does not call preventDefault if 'preventDefault=false' is passed as an option`](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      {{#link-to 'about' id='about-link' preventDefault=false}}About{{/link-to}}
    `);

    this.visit('/');

    let event = jQuery.Event('click');
    this.$('#about-link').trigger(event);

    assert.equal(event.isDefaultPrevented(), false, 'should not preventDefault');
  }

  [`@test the {{link-to}} helper does not call preventDefault if 'preventDefault=boundFalseyThing' is passed as an option`]() {
    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      {{#link-to 'about' id='about-link' preventDefault=boundFalseyThing}}About{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      boundFalseyThing: false
    }));

    this.visit('/');

    let event = jQuery.Event('click');
    this.$('#about-link').trigger(event);

    equal(event.isDefaultPrevented(), false, 'should not preventDefault');
  }

  [`@test The {{link-to}} helper does not call preventDefault if 'target' attribute is provided`](assert) {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'index' id='self-link' target='_blank'}}Self{{/link-to}}
    `);

    this.visit('/');

    let event = jQuery.Event('click');
    this.$('#self-link').trigger(event);

    assert.equal(event.isDefaultPrevented(), false, 'should not preventDefault when target attribute is specified');
  }

  [`@test The {{link-to}} helper should preventDefault when 'target = _self'`]() {
    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to 'index' id='self-link' target='_self'}}Self{{/link-to}}
    `);

    this.visit('/');

    let event = jQuery.Event('click');
    this.$('#self-link').trigger(event);

    equal(event.isDefaultPrevented(), true, 'should preventDefault when target attribute is `_self`');
  }

  [`@test The {{link-to}} helper should not transition if target is not equal to _self or empty`](assert) {
    this.addTemplate('index', `
      {{#link-to 'about' id='about-link' replace=true target='_blank'}}
        About
      {{/link-to}}
    `);

    this.router.map(function() {
      this.route('about');
    });

    this.visit('/');
    this.click('#about-link');

    let currentRouteName = this.applicationInstance.lookup('controller:application').get('currentRouteName');
    assert.notEqual(currentRouteName, 'about', 'link-to should not transition if target is not equal to _self or empty');
  }

  [`@test The {{link-to}} helper accepts string/numeric arguments`](assert) {
    this.router.map(function() {
      this.route('filter', { path: '/filters/:filter' });
      this.route('post', { path: '/post/:post_id' });
      this.route('repo', { path: '/repo/:owner/:name' });
    });

    this.add('controller:filter', Controller.extend({
      filter: 'unpopular',
      repo: { owner: 'ember', name: 'ember.js' },
      post_id: 123
    }));

    this.addTemplate('filter', `
      <p>{{filter}}</p>
      {{#link-to "filter" "unpopular" id="link"}}Unpopular{{/link-to}}
      {{#link-to "filter" filter id="path-link"}}Unpopular{{/link-to}}
      {{#link-to "post" post_id id="post-path-link"}}Post{{/link-to}}
      {{#link-to "post" 123 id="post-number-link"}}Post{{/link-to}}
      {{#link-to "repo" repo id="repo-object-link"}}Repo{{/link-to}}
    `);

    this.visit('/filters/popular');

    assert.equal(normalizeUrl(this.$('#link').attr('href')), '/filters/unpopular');
    assert.equal(normalizeUrl(this.$('#path-link').attr('href')), '/filters/unpopular');
    assert.equal(normalizeUrl(this.$('#post-path-link').attr('href')), '/post/123');
    assert.equal(normalizeUrl(this.$('#post-number-link').attr('href')), '/post/123');
    assert.equal(normalizeUrl(this.$('#repo-object-link').attr('href')), '/repo/ember/ember.js');
  }

  [`@test Issue 4201 - Shorthand for route.index shouldn't throw errors about context arguments`](assert) {
    assert.expect(2);
    this.router.map(function() {
      this.route('lobby', function() {
        this.route('index', { path: ':lobby_id' });
        this.route('list');
      });
    });

    this.add('route:lobby.index', Route.extend({
      model(params) {
        assert.equal(params.lobby_id, 'foobar');
        return params.lobby_id;
      }
    }));

    this.addTemplate('lobby.index', `
      {{#link-to 'lobby' 'foobar' id='lobby-link'}}Lobby{{/link-to}}
    `);
    this.addTemplate('lobby.list', `
      {{#link-to 'lobby' 'foobar' id='lobby-link'}}Lobby{{/link-to}}
    `);

    this.visit('/lobby/list');
    this.click('#lobby-link');

    shouldBeActive(assert, this.$('#lobby-link'));
  }

  [`@test Quoteless route param performs property lookup`](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      {{#link-to 'index' id='string-link'}}string{{/link-to}}
      {{#link-to foo id='path-link'}}path{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      foo: 'index'
    }));

    let assertEquality = href => {
      assert.equal(normalizeUrl(this.$('#string-link').attr('href')), '/');
      assert.equal(normalizeUrl(this.$('#path-link').attr('href')), href);
    }

    this.visit('/');

    assertEquality('/');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => controller.set('foo', 'about'));

    assertEquality('/about');
  }

  [`@test The {{link-to}} helper refreshes href element when one of params changes`](assert) {
    this.router.map(function() {
      this.route('post', { path: '/posts/:post_id' });
    });

    let post = { id: '1' };
    let secondPost = { id: '2' };

    this.addTemplate('index', `
      {{#link-to "post" post id="post"}}post{{/link-to}}
    `);

    this.add('controller:index', Controller.extend());

    this.visit('/');

    let indexController = this.applicationInstance.lookup('controller:index');
    this.runTask(() => indexController.set('post', post));

    assert.equal(normalizeUrl(this.$('#post').attr('href')), '/posts/1', 'precond - Link has rendered href attr properly');

    this.runTask(() => indexController.set('post', secondPost));

    assert.equal(this.$('#post').attr('href'), '/posts/2', 'href attr was updated after one of the params had been changed');

    this.runTask(() => indexController.set('post', null));

    assert.equal(this.$('#post').attr('href'), '#', 'href attr becomes # when one of the arguments in nullified');
  }

  [`@test The {{link-to}} helper is active when a route is active`](assert) {
    this.router.map(function() {
      this.route('about', function() {
        this.route('item');
      });
    });

    this.addTemplate('about', `
      <div id='about'>
        {{#link-to 'about' id='about-link'}}About{{/link-to}}
        {{#link-to 'about.item' id='item-link'}}Item{{/link-to}}
        {{outlet}}
      </div>
    `);

    this.visit('/about');

    assert.equal(this.$('#about-link.active').length, 1, 'The about route link is active');
    assert.equal(this.$('#item-link.active').length, 0, 'The item route link is inactive');

    this.visit('/about/item');

    assert.equal(this.$('#about-link.active').length, 1, 'The about route link is active');
    assert.equal(this.$('#item-link.active').length, 1, 'The item route link is active');
  }

  [`@test The {{link-to}} helper works in an #each'd array of string route names`](assert) {
    this.router.map(function() {
      this.route('foo');
      this.route('bar');
      this.route('rar');
    });

    this.add('controller:index', Controller.extend({
      routeNames: emberA(['foo', 'bar', 'rar']),
      route1: 'bar',
      route2: 'foo'
    }));

    this.addTemplate('index', `
      {{#each routeNames as |routeName|}}
        {{#link-to routeName}}{{routeName}}{{/link-to}}
      {{/each}}
      {{#each routeNames as |r|}}
        {{#link-to r}}{{r}}{{/link-to}}
      {{/each}}
      {{#link-to route1}}a{{/link-to}}
      {{#link-to route2}}b{{/link-to}}
    `);

    this.visit('/');

    let linksEqual = (links, expected) => {
      equal(links.length, expected.length, 'Has correct number of links');

      let idx;
      for (idx = 0; idx < links.length; idx++) {
        let href = this.$(links[idx]).attr('href');
        // Old IE includes the whole hostname as well
        assert.equal(href.slice(-expected[idx].length), expected[idx], `Expected link to be '${expected[idx]}', but was '${href}'`);
      }
    }

    linksEqual(this.$('a'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/bar', '/foo']);

    let indexController = this.applicationInstance.lookup('controller:index');
    this.runTask(() => indexController.set('route1', 'rar'));

    linksEqual(this.$('a'), ['/foo', '/bar', '/rar', '/foo', '/bar', '/rar', '/rar', '/foo']);

    this.runTask(() => indexController.routeNames.shiftObject());

    linksEqual(this.$('a'), ['/bar', '/rar', '/bar', '/rar', '/rar', '/foo']);
  }

  [`@test The non-block form {{link-to}} helper moves into the named route`](assert) {
    assert.expect(3);
    this.router.map(function() {
      this.route('contact');
    });

    this.addTemplate('index', `
      <h3>Home</h3>
      {{link-to 'Contact us' 'contact' id='contact-link'}}
      {{#link-to 'index' id='self-link'}}Self{{/link-to}}
    `);
    this.addTemplate('contact', `
      <h3>Contact</h3>
      {{link-to 'Home' 'index' id='home-link'}}
      {{link-to 'Self' 'contact' id='self-link'}}
    `);

    this.visit('/');

    this.click('#contact-link');

    assert.equal(this.$('h3:contains(Contact)').length, 1, 'The contact template was rendered');
    assert.equal(this.$('#self-link.active').length, 1, 'The self-link was rendered with active class');
    assert.equal(this.$('#home-link:not(.active)').length, 1, 'The other link was rendered without active class');
  }

  [`@test The non-block form {{link-to}} helper updates the link text when it is a binding`](assert) {
    assert.expect(8);
    this.router.map(function() {
      this.route('contact');
    });

    this.add('controller:index', Controller.extend({
      contactName: 'Jane'
    }));

    this.addTemplate('index', `
      <h3>Home</h3>
      {{link-to contactName 'contact' id='contact-link'}}
      {{#link-to 'index' id='self-link'}}Self{{/link-to}}
    `);
    this.addTemplate('contact', `
      <h3>Contact</h3>
      {{link-to 'Home' 'index' id='home-link'}}
      {{link-to 'Self' 'contact' id='self-link'}}
    `);

    this.visit('/');


    assert.equal(this.$('#contact-link:contains(Jane)').length, 1, 'The link title is correctly resolved');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => controller.set('contactName', 'Joe'));

    assert.equal(this.$('#contact-link:contains(Joe)').length, 1, 'The link title is correctly updated when the bound property changes');

    this.runTask(() => controller.set('contactName', 'Robert'));

    assert.equal(this.$('#contact-link:contains(Robert)').length, 1, 'The link title is correctly updated when the bound property changes a second time');

    this.click('#contact-link');

    assert.equal(this.$('h3:contains(Contact)').length, 1, 'The contact template was rendered');
    assert.equal(this.$('#self-link.active').length, 1, 'The self-link was rendered with active class');
    assert.equal(this.$('#home-link:not(.active)').length, 1, 'The other link was rendered without active class');

    this.click('#home-link');

    assert.equal(this.$('h3:contains(Home)').length, 1, 'The index template was rendered');
    assert.equal(this.$('#contact-link:contains(Robert)').length, 1, 'The link title is correctly updated when the route changes');
  }

  [`@test The non-block form {{link-to}} helper moves into the named route with context`](assert) {
    assert.expect(5);

    this.router.map(function() {
      this.route('item', { path: '/item/:id' });
    });

    this.add('route:index', Route.extend({
      model() {
        return [
          { id: 'yehuda', name: 'Yehuda Katz' },
          { id: 'tom', name: 'Tom Dale' },
          { id: 'erik', name: 'Erik Brynroflsson' }
        ];
      }
    }));

    this.addTemplate('index', `
      <h3>Home</h3>
      <ul>
        {{#each model as |person|}}
          <li>
            {{link-to person.name 'item' person}}
          </li>
        {{/each}}
      </ul>
    `);
    this.addTemplate('item', `
      <h3>Item</h3>
      <p>{{model.name}}</p>
      {{#link-to 'index' id='home-link'}}Home{{/link-to}}
    `);

    this.visit('/');

    this.click('li a:contains(Yehuda)');

    assert.equal(this.$('h3:contains(Item)').length, 1, 'The item template was rendered');
    assert.equal(this.$('p').text(), 'Yehuda Katz', 'The name is correct');

    this.click('#home-link');

    assert.equal(normalizeUrl(this.$('li a:contains(Yehuda)').attr('href')), '/item/yehuda');
    assert.equal(normalizeUrl(this.$('li a:contains(Tom)').attr('href')), '/item/tom');
    assert.equal(normalizeUrl(this.$('li a:contains(Erik)').attr('href')), '/item/erik');
  }

  [`@test The non-block form {{link-to}} performs property lookup`](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index', `
      {{link-to 'string' 'index' id='string-link'}}
      {{link-to path foo id='path-link'}}
    `);

    this.add('controller:index', Controller.extend({
      foo: 'index'
    }));

    this.visit('/');

    let assertEquality = href => {
      assert.equal(normalizeUrl(this.$('#string-link').attr('href')), '/');
      assert.equal(normalizeUrl(this.$('#path-link').attr('href')), href);
    }

    assertEquality('/');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => controller.set('foo', 'about'));

    assertEquality('/about');
  }

  [`@test The non-block form {{link-to}} protects against XSS`](assert) {
    this.addTemplate('application', `{{link-to display 'index' id='link'}}`);

    this.add('controller:application', Controller.extend({
      display: 'blahzorz'
    }));

    this.visit('/');

    assert.equal(this.$('#link').text(), 'blahzorz');

    let controller = this.applicationInstance.lookup('controller:application');
    this.runTask(() => controller.set('display', '<b>BLAMMO</b>'));

    assert.equal(this.$('#link').text(), '<b>BLAMMO</b>');
    assert.equal(this.$('b').length, 0);
  }

  [`@test the {{link-to}} helper does not throw an error if its route has exited`](assert) {
    assert.expect(0);

    this.router.map(function() {
      this.route('post', { path: 'post/:post_id' });
    });

    this.addTemplate('application', `
      {{#link-to 'index' id='home-link'}}Home{{/link-to}}
      {{#link-to 'post' defaultPost id='default-post-link'}}Default Post{{/link-to}}
      {{#if currentPost}}
        {{#link-to 'post' currentPost id='current-post-link'}}Current Post{{/link-to}}
      {{/if}}
    `);

    this.add('controller:application', Controller.extend({
      defaultPost: { id: 1 },
      postController: inject.controller('post'),
      currentPost: alias('postController.model')
    }));

    this.add('controller:post', Controller.extend());

    this.add('route:post', Route.extend({
      model() {
        return { id: 2 };
      },
      serialize(model) {
        return { post_id: model.id };
      }
    }));

    this.visit('/');

    this.click('#default-post-link');
    this.click('#home-link');
    this.click('#current-post-link');
    this.click('#home-link');
  }

  [`@test {{link-to}} active property respects changing parent route context`](assert) {
    this.router.map(function() {
      this.route('things', { path: '/things/:name' }, function() {
        this.route('other');
      });
    });

    this.addTemplate('application', `
      {{link-to 'OMG' 'things' 'omg' id='omg-link'}}
      {{link-to 'LOL' 'things' 'lol' id='lol-link'}}
    `);

    this.visit('/things/omg');

    shouldBeActive(assert, this.$('#omg-link'));
    shouldNotBeActive(assert, this.$('#lol-link'));

    this.visit('/things/omg/other');

    shouldBeActive(assert, this.$('#omg-link'));
    shouldNotBeActive(assert, this.$('#lol-link'));
  }

  [`@test {{link-to}} populates href with default query param values even without query-params object`](assert) {
    this.add('controller:index', Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    }));

    this.addTemplate('index', `{{#link-to 'index' id='the-link'}}Index{{/link-to}}`);

    this.visit('/');

    assert.equal(this.$('#the-link').attr('href'), '/', 'link has right href');
  }

  [`@test {{link-to}} populates href with default query param values with empty query-params object`](assert) {
    this.add('controller:index', Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    }));

    this.addTemplate('index', `
      {{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}
    `);

    this.visit('/');

    assert.equal(this.$('#the-link').attr('href'), '/', 'link has right href');
  }

  [`@test {{link-to}} with only query-params and a block updates when route changes`](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.add('controller:application', Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: '123',
      bar: 'yes'
    }));

    this.addTemplate('application', `
      {{#link-to (query-params foo='456' bar='NAW') id='the-link'}}Index{{/link-to}}
    `);

    this.visit('/');

    assert.equal(this.$('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

    this.visit('/about');

    assert.equal(this.$('#the-link').attr('href'), '/about?bar=NAW&foo=456', 'link has right href');
  }

  [`@test Block-less {{link-to}} with only query-params updates when route changes`](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.add('controller:application', Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: '123',
      bar: 'yes'
    }));

    this.addTemplate('application', `
      {{link-to "Index" (query-params foo='456' bar='NAW') id='the-link'}}
    `);

    this.visit('/');

    assert.equal(this.$('#the-link').attr('href'), '/?bar=NAW&foo=456', 'link has right href');

    this.visit('/about');

    assert.equal(this.$('#the-link').attr('href'), '/about?bar=NAW&foo=456', 'link has right href');
  }

  [`@test The {{link-to}} helper can use dynamic params`](assert) {
    this.router.map(function() {
      this.route('foo', { path: 'foo/:some/:thing' });
      this.route('bar', { path: 'bar/:some/:thing/:else' });
    });

    this.add('controller:index', Controller.extend({
      init() {
        this._super(...arguments);
        this.dynamicLinkParams = [
          'foo',
          'one',
          'two'
        ];
      }
    }));

    this.addTemplate('index', `
      <h3>Home</h3>
      {{#link-to params=dynamicLinkParams id="dynamic-link"}}Dynamic{{/link-to}}
    `);

    this.visit('/');

    let link = this.$('#dynamic-link');

    assert.equal(link.attr('href'), '/foo/one/two');

    let controller = this.applicationInstance.lookup('controller:index');
    this.runTask(() => {
      controller.set('dynamicLinkParams', [
        'bar',
        'one',
        'two',
        'three'
      ]);
    });

    assert.equal(link.attr('href'), '/bar/one/two/three');
  }

  [`@test GJ: {{link-to}} to a parent root model hook which performs a 'transitionTo' has correct active class #13256`](assert) {
    assert.expect(1);

    this.router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    this.add('route:parent', Route.extend({
      afterModel() {
        this.transitionTo('parent.child');
      }
    }));

    this.addTemplate('application', `
      {{link-to 'Parent' 'parent' id='parent-link'}}
    `);

    this.visit('/');

    this.click('#parent-link');

    shouldBeActive(assert, this.$('#parent-link'));
  }

});

moduleFor('The {{link-to}} helper - loading states and warnings', class extends ApplicationTestCase {

  constructor() {
    super();
    this._oldWarn = Logger.warn;
    this.warnCalled = false;
    Logger.warn = () => this.warnCalled = true;
  }

  teardown() {
    Logger.warn = this._oldWarn;
    super.teardown();
  }

  [`@test link-to with null/undefined dynamic parameters are put in a loading state`](assert) {
    assert.expect(19);

    this.router.map(function() {
      this.route('thing', { path: '/thing/:thing_id' });
      this.route('about');
    });

    this.addTemplate('index', `
      {{#link-to destinationRoute routeContext loadingClass='i-am-loading' id='context-link'}}
        string
      {{/link-to}}
      {{#link-to secondRoute loadingClass=loadingClass id='static-link'}}
        string
      {{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      destinationRoute: null,
      routeContext: null,
      loadingClass: 'i-am-loading'
    }));

    this.add('route:about', Route.extend({
      activate() {
        assert.ok(true, 'About was entered');
      }
    }));

    this.visit('/');

    function assertLinkStatus(link, url) {
      if (url) {
        assert.equal(normalizeUrl(link.attr('href')), url, 'loaded link-to has expected href');
        assert.ok(!link.hasClass('i-am-loading'), 'loaded linkComponent has no loadingClass');
      } else {
        assert.equal(normalizeUrl(link.attr('href')), '#', "unloaded link-to has href='#'");
        assert.ok(link.hasClass('i-am-loading'), 'loading linkComponent has loadingClass');
      }
    }

    let contextLink = this.$('#context-link');
    let staticLink = this.$('#static-link');
    let controller = this.applicationInstance.lookup('controller:index');

    assertLinkStatus(contextLink);
    assertLinkStatus(staticLink);

    this.warnCalled = false;
    this.click(contextLink);
    assert.ok(this.warnCalled, 'Logger.warn was called from clicking loading link');

    // Set the destinationRoute (context is still null).
    this.runTask(() => controller.set('destinationRoute', 'thing'));
    assertLinkStatus(contextLink);

    // Set the routeContext to an id
    this.runTask(() => controller.set('routeContext', '456'));
    assertLinkStatus(contextLink, '/thing/456');

    // Test that 0 isn't interpreted as falsy.
    this.runTask(() => controller.set('routeContext', 0));
    assertLinkStatus(contextLink, '/thing/0');

    // Set the routeContext to an object
    this.runTask(() => {
      controller.set('routeContext', { id: 123 });
    });
    assertLinkStatus(contextLink, '/thing/123');

    // Set the destinationRoute back to null.
    this.runTask(() => controller.set('destinationRoute', null));
    assertLinkStatus(contextLink);

    this.warnCalled = false;
    this.click(staticLink);
    assert.ok(this.warnCalled, 'Logger.warn was called from clicking loading link');

    this.runTask(() => controller.set('secondRoute', 'about'));
    assertLinkStatus(staticLink, '/about');

    // Click the now-active link
    this.click(staticLink);
  }

});

moduleFor('The {{link-to}} helper - globals mode app', class extends AutobootApplicationTestCase {

  /*
   * When an exception is thrown during the initial rendering phase, the
   * `visit` promise is not resolved or rejected. This means the `applicationInstance`
   * is never torn down and tests running after this one will fail.
   *
   * It is ugly, but since this test intentionally causes an initial render
   * error, it requires globals mode to access the `applicationInstance`
   * for teardown after test completion.
   *
   * Application "globals mode" is trigged by `autoboot: true`. It doesn't
   * have anything to do with the resolver.
   *
   * We should be able to fix this by having the application eagerly stash a
   * copy of each application instance it creates. When the application is
   * destroyed, it can also destroy the instances (this is how the globals
   * mode avoid the problem).
   *
   * See: https://github.com/emberjs/ember.js/issues/15327
   */
  [`@test the {{link-to}} helper throws a useful error if you invoke it wrong`](assert) {
    assert.expect(1);

    assert.throws(() => {
      this.runTask(() => {
        this.createApplication();

        this.add('router:main', Router.extend({
          location: 'none'
        }));

        this.router.map(function() {
          this.route('post', { path: 'post/:post_id' });
        });

        this.addTemplate('application', `{{#link-to 'post'}}Post{{/link-to}}`);
      });
    }, /(You attempted to define a `\{\{link-to "post"\}\}` but did not pass the parameters required for generating its dynamic segments.|You must provide param `post_id` to `generate`)/);
  }

});
