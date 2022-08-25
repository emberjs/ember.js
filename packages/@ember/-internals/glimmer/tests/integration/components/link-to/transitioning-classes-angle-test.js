import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';
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
  '<LinkTo /> component: .transitioning-in .transitioning-out CSS classes',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.aboutDefer = RSVP.defer();
      this.otherDefer = RSVP.defer();
      this.newsDefer = RSVP.defer();
      let _this = this;

      this.router.map(function () {
        this.route('about');
        this.route('other');
        this.route('news');
      });

      this.add(
        'route:about',
        class extends Route {
          model() {
            return _this.aboutDefer.promise;
          }
        }
      );

      this.add(
        'route:other',
        class extends Route {
          model() {
            return _this.otherDefer.promise;
          }
        }
      );

      this.add(
        'route:news',
        class extends Route {
          model() {
            return _this.newsDefer.promise;
          }
        }
      );

      this.addTemplate(
        'application',
        `
        {{outlet}}
        <LinkTo id='index-link' @route='index'>Index</LinkTo>
        <LinkTo id='about-link' @route='about'>About</LinkTo>
        <LinkTo id='other-link' @route='other'>Other</LinkTo>
        <LinkTo id='news-link' @route='news' @activeClass={{false}}>News</LinkTo>
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

      runTask(() => $about.click());

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

      runTask(() => $news.click());

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
