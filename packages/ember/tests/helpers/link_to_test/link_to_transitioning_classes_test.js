import { RSVP } from 'ember-runtime';
import { Route } from 'ember-routing';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

function assertHasClass(assert, selector, label) {
  let testLabel = `${selector.attr('id')} should have class ${label}`;

  assert.equal(selector.hasClass(label), true, testLabel);
}

function assertHasNoClass(assert, selector, label) {
  let testLabel = `${selector.attr('id')} should not have class ${label}`;

  assert.equal(selector.hasClass(label), false, testLabel);
}

moduleFor('The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes', class extends ApplicationTestCase {
  constructor() {
    super();

    this.aboutDefer = RSVP.defer();
    this.otherDefer = RSVP.defer();
    let _this = this;

    this.router.map(function() {
      this.route('about');
      this.route('other');
    });

    this.add('route:about', Route.extend({
      model() {
        return _this.aboutDefer.promise;
      }
    }));

    this.add('route:other', Route.extend({
      model() {
        return _this.otherDefer.promise;
      }
    }));

    this.addTemplate('application',`
      {{outlet}}
      {{link-to 'Index' 'index' id='index-link'}}
      {{link-to 'About' 'about' id='about-link'}}
      {{link-to 'Other' 'other' id='other-link'}}
    `);

    this.visit('/');
  }

  teardown() {
    super.teardown();
    this.aboutDefer = null;
    this.otherDefer = null;
  }

  ['@test while a transition is underway'](assert) {
    let $index = this.$('#index-link');
    let $about = this.$('#about-link');
    let $other = this.$('#other-link');

    $about.click();

    assertHasClass(assert, $index, 'active');
    assertHasNoClass(assert, $about, 'active');
    assertHasNoClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');

    this.runTask(() => this.aboutDefer.resolve());

    assertHasNoClass(assert, $index, 'active');
    assertHasClass(assert, $about, 'active');
    assertHasNoClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasNoClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasNoClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');
  }
});

moduleFor(`The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes - nested link-to's`, class extends ApplicationTestCase {
  constructor() {
    super();
    this.aboutDefer = RSVP.defer();
    this.otherDefer = RSVP.defer();
    let _this = this;

    this.router.map(function() {
      this.route('parent-route', function() {
        this.route('about');
        this.route('other');
      });
    });
    this.add('route:parent-route.about', Route.extend({
      model() {
        return _this.aboutDefer.promise;
      }
    }));

    this.add('route:parent-route.other', Route.extend({
      model() {
        return _this.otherDefer.promise;
      }
    }));

    this.addTemplate('application', `
      {{outlet}}
      {{#link-to 'index' tagName='li'}}
        {{link-to 'Index' 'index' id='index-link'}}
      {{/link-to}}
      {{#link-to 'parent-route.about' tagName='li'}}
        {{link-to 'About' 'parent-route.about' id='about-link'}}
      {{/link-to}}
      {{#link-to 'parent-route.other' tagName='li'}}
        {{link-to 'Other' 'parent-route.other' id='other-link'}}
      {{/link-to}}
    `);

    this.visit('/');
  }

  resolveAbout() {
    return this.runTask(() => {
      this.aboutDefer.resolve();
      this.aboutDefer = RSVP.defer();
    });
  }

  resolveOther() {
    return this.runTask(() => {
      this.otherDefer.resolve();
      this.otherDefer = RSVP.defer();
    });
  }

  teardown() {
    super.teardown();
    this.aboutDefer = null;
    this.otherDefer = null;
  }

  [`@test while a transition is underway with nested link-to's`](assert) {
    let $index = this.$('#index-link');
    let $about = this.$('#about-link');
    let $other = this.$('#other-link');

    $about.click();

    assertHasClass(assert, $index, 'active');
    assertHasNoClass(assert, $about, 'active');
    assertHasNoClass(assert, $about, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');

    this.resolveAbout();

    assertHasNoClass(assert, $index, 'active');
    assertHasClass(assert, $about, 'active');
    assertHasNoClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasNoClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasNoClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');

    $other.click();

    assertHasNoClass(assert, $index, 'active');
    assertHasClass(assert, $about, 'active');
    assertHasNoClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasNoClass(assert, $about, 'ember-transitioning-in');
    assertHasClass(assert, $other, 'ember-transitioning-in');

    assertHasNoClass(assert, $index, 'ember-transitioning-out');
    assertHasClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');

    this.resolveOther();

    assertHasNoClass(assert, $index, 'active');
    assertHasNoClass(assert, $about, 'active');
    assertHasClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasNoClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasNoClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');

    $about.click();


    assertHasNoClass(assert, $index, 'active');
    assertHasNoClass(assert, $about, 'active');
    assertHasClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasNoClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasClass(assert, $other, 'ember-transitioning-out');

    this.resolveAbout();

    assertHasNoClass(assert, $index, 'active');
    assertHasClass(assert, $about, 'active');
    assertHasNoClass(assert, $other, 'active');

    assertHasNoClass(assert, $index, 'ember-transitioning-in');
    assertHasNoClass(assert, $about, 'ember-transitioning-in');
    assertHasNoClass(assert, $other, 'ember-transitioning-in');

    assertHasNoClass(assert, $index, 'ember-transitioning-out');
    assertHasNoClass(assert, $about, 'ember-transitioning-out');
    assertHasNoClass(assert, $other, 'ember-transitioning-out');
  }
});
