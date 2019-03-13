import { RSVP } from '@ember/-internals/runtime';
import { Route } from '@ember/-internals/routing';
import { moduleFor, ApplicationTestCase, runTask } from 'internal-test-helpers';

function assertHasClass(assert, selector, label) {
  let testLabel = `${selector.attr('id')} should have class ${label}`;

  assert.equal(selector.hasClass(label), true, testLabel);
}

function assertHasNoClass(assert, selector, label) {
  let testLabel = `${selector.attr('id')} should not have class ${label}`;

  assert.equal(selector.hasClass(label), false, testLabel);
}

moduleFor(
  'The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes',
  class extends ApplicationTestCase {
    constructor() {
      super();

      this.aboutDefer = RSVP.defer();
      this.otherDefer = RSVP.defer();
      this.newsDefer = RSVP.defer();
      let _this = this;

      this.router.map(function() {
        this.route('about');
        this.route('other');
        this.route('news');
      });

      this.add(
        'route:about',
        Route.extend({
          model() {
            return _this.aboutDefer.promise;
          },
        })
      );

      this.add(
        'route:other',
        Route.extend({
          model() {
            return _this.otherDefer.promise;
          },
        })
      );

      this.add(
        'route:news',
        Route.extend({
          model() {
            return _this.newsDefer.promise;
          },
        })
      );

      this.addTemplate(
        'application',
        `
      {{outlet}}
      {{link-to 'Index' 'index' id='index-link'}}
      {{link-to 'About' 'about' id='about-link'}}
      {{link-to 'Other' 'other' id='other-link'}}
      {{link-to 'News' 'news' activeClass=false id='news-link'}}
    `
      );
    }

    beforeEach() {
      return this.visit('/');
    }

    afterEach() {
      super.afterEach();
      this.aboutDefer = null;
      this.otherDefer = null;
      this.newsDefer = null;
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

      runTask(() => this.aboutDefer.resolve());

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

    ['@test while a transition is underway with activeClass is false'](assert) {
      let $index = this.$('#index-link');
      let $news = this.$('#news-link');
      let $other = this.$('#other-link');

      $news.click();

      assertHasClass(assert, $index, 'active');
      assertHasNoClass(assert, $news, 'active');
      assertHasNoClass(assert, $other, 'active');

      assertHasNoClass(assert, $index, 'ember-transitioning-in');
      assertHasClass(assert, $news, 'ember-transitioning-in');
      assertHasNoClass(assert, $other, 'ember-transitioning-in');

      assertHasClass(assert, $index, 'ember-transitioning-out');
      assertHasNoClass(assert, $news, 'ember-transitioning-out');
      assertHasNoClass(assert, $other, 'ember-transitioning-out');

      runTask(() => this.newsDefer.resolve());

      assertHasNoClass(assert, $index, 'active');
      assertHasNoClass(assert, $news, 'active');
      assertHasNoClass(assert, $other, 'active');

      assertHasNoClass(assert, $index, 'ember-transitioning-in');
      assertHasNoClass(assert, $news, 'ember-transitioning-in');
      assertHasNoClass(assert, $other, 'ember-transitioning-in');

      assertHasNoClass(assert, $index, 'ember-transitioning-out');
      assertHasNoClass(assert, $news, 'ember-transitioning-out');
      assertHasNoClass(assert, $other, 'ember-transitioning-out');
    }
  }
);

moduleFor(
  `The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes - nested link-to's`,
  class extends ApplicationTestCase {
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
      this.add(
        'route:parent-route.about',
        Route.extend({
          model() {
            return _this.aboutDefer.promise;
          },
        })
      );

      this.add(
        'route:parent-route.other',
        Route.extend({
          model() {
            return _this.otherDefer.promise;
          },
        })
      );

      this.addTemplate(
        'application',
        `
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
    `
      );
    }

    beforeEach() {
      return this.visit('/');
    }

    resolveAbout() {
      return runTask(() => {
        this.aboutDefer.resolve();
        this.aboutDefer = RSVP.defer();
      });
    }

    resolveOther() {
      return runTask(() => {
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
      // TODO undo changes to this test but currently this test navigates away if navigation
      // outlet is not stable and the second $about.click() is triggered.
      let $about = this.$('#about-link');

      $about.click();

      let $index = this.$('#index-link');
      $about = this.$('#about-link');
      let $other = this.$('#other-link');

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

      $index = this.$('#index-link');
      $about = this.$('#about-link');
      $other = this.$('#other-link');

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

      $index = this.$('#index-link');
      $about = this.$('#about-link');
      $other = this.$('#other-link');

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

      $index = this.$('#index-link');
      $about = this.$('#about-link');
      $other = this.$('#other-link');

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

      $index = this.$('#index-link');
      $about = this.$('#about-link');
      $other = this.$('#other-link');

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

      $index = this.$('#index-link');
      $about = this.$('#about-link');
      $other = this.$('#other-link');

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
  }
);
