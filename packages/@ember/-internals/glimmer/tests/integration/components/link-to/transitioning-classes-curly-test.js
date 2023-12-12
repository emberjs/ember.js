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
  '{{link-to}} component: .transitioning-in .transitioning-out CSS classes',
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
        <div id='index-link'>{{#link-to route='index'}}Index{{/link-to}}</div>
        <div id='about-link'>{{#link-to route='about'}}About{{/link-to}}</div>
        <div id='other-link'>{{#link-to route='other'}}Other{{/link-to}}</div>
        <div id='news-link'>{{#link-to route='news' activeClass=false}}News{{/link-to}}</div>
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
      let $index = this.$('#index-link > a');
      let $about = this.$('#about-link > a');
      let $other = this.$('#other-link > a');

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
      let $index = this.$('#index-link > a');
      let $news = this.$('#news-link > a');
      let $other = this.$('#other-link > a');

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
