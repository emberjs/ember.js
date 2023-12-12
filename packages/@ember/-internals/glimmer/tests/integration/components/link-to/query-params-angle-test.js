import Controller from '@ember/controller';
import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';
import {
  ApplicationTestCase,
  classes as classMatcher,
  moduleFor,
  runTask,
  runLoopSettled,
} from 'internal-test-helpers';

moduleFor(
  '<LinkTo /> component with query-params (rendering)',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      this.add(
        'controller:index',
        Controller.extend({
          queryParams: ['foo'],
          foo: '123',
          bar: 'yes',
        })
      );
    }

    async ['@test it populates href with fully supplied query param values']() {
      this.addTemplate(
        'index',
        `<LinkTo @route='index' @query={{hash foo='456' bar='NAW'}}>Index</LinkTo>`
      );

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/?bar=NAW&foo=456' },
        content: 'Index',
      });
    }

    async ['@test it populates href with fully supplied query param values, but without @route param']() {
      this.addTemplate('index', `<LinkTo @query={{hash foo='2' bar='NAW'}}>QueryParams</LinkTo>`);

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/?bar=NAW&foo=2' },
        content: 'QueryParams',
      });
    }

    async ['@test it populates href with partially supplied query param values, but omits if value is default value']() {
      this.addTemplate('index', `<LinkTo @route='index' @query={{hash foo='123'}}>Index</LinkTo>`);

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/', class: classMatcher('ember-view active') },
        content: 'Index',
      });
    }
  }
);

moduleFor(
  '<LinkTo /> component with query params (routing)',
  class extends ApplicationTestCase {
    constructor(...args) {
      super(...args);

      let indexProperties = {
        foo: '123',
        bar: 'abc',
      };

      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['foo', 'bar', 'abool'];
          foo = indexProperties.foo;
          bar = indexProperties.bar;
          boundThing = 'OMG';
          abool = true;
        }
      );

      this.add(
        'controller:about',
        class extends Controller {
          queryParams = ['baz', 'bat'];
          baz = 'alex';
          bat = 'borf';
        }
      );

      this.indexProperties = indexProperties;
    }

    shouldNotBeActive(assert, selector) {
      this.checkActive(assert, selector, false);
    }

    shouldBeActive(assert, selector) {
      this.checkActive(assert, selector, true);
    }

    getController(name) {
      return this.applicationInstance.lookup(`controller:${name}`);
    }

    checkActive(assert, selector, active) {
      let classList = this.$(selector)[0].className;
      assert.equal(
        classList.indexOf('active') > -1,
        active,
        selector + ' active should be ' + active.toString()
      );
    }

    async [`@test it doesn't update controller QP properties on current route when invoked`](
      assert
    ) {
      this.addTemplate('index', `<LinkTo id='the-link' @route='index'>Index</LinkTo>`);

      await this.visit('/');

      await this.click('#the-link');

      let indexController = this.getController('index');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    }

    async [`@test it doesn't update controller QP properties on current route when invoked (empty query-params obj)`](
      assert
    ) {
      this.addTemplate(
        'index',
        `<LinkTo id='the-link' @route='index' @query={{(hash)}}>Index</LinkTo>`
      );

      await this.visit('/');

      await this.click('#the-link');

      let indexController = this.getController('index');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    }

    async [`@test it doesn't update controller QP properties on current route when invoked (empty query-params obj, inferred route)`](
      assert
    ) {
      this.addTemplate('index', `<LinkTo id='the-link' @query={{(hash)}}>Index</LinkTo>`);

      await this.visit('/');

      await this.click('#the-link');

      let indexController = this.getController('index');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    }

    async ['@test it updates controller QP properties on current route when invoked'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="the-link" @route='index' @query={{hash foo='456'}}>
          Index
        </LinkTo>
        `
      );

      await this.visit('/');

      await this.click('#the-link');

      let indexController = this.getController('index');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar'),
        { foo: '456', bar: 'abc' },
        'controller QP properties updated'
      );
    }

    async ['@test it updates controller QP properties on current route when invoked (inferred route)'](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="the-link" @query={{hash foo='456'}}>
          Index
        </LinkTo>
        `
      );

      await this.visit('/');

      await this.click('#the-link');

      let indexController = this.getController('index');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar'),
        { foo: '456', bar: 'abc' },
        'controller QP properties updated'
      );
    }

    async ['@test it updates controller QP properties on other route after transitioning to that route'](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });

      this.addTemplate(
        'index',
        `
        <LinkTo id="the-link" @route="about" @query={{hash baz='lol'}}>
          About
        </LinkTo>
        `
      );

      await this.visit('/');

      let theLink = this.$('#the-link');

      assert.equal(theLink.attr('href'), '/about?baz=lol');

      runTask(() => this.click('#the-link'));

      let aboutController = this.getController('about');

      assert.deepEqual(
        aboutController.getProperties('baz', 'bat'),
        { baz: 'lol', bat: 'borf' },
        'about controller QP properties updated'
      );
    }

    async ['@test it generates proper href for `LinkTo` with no @route after transitioning to an error route [GH#17963]'](
      assert
    ) {
      this.router.map(function () {
        this.route('bad');
      });

      this.add(
        'controller:application',
        class extends Controller {
          queryParams = ['baz'];
        }
      );

      this.add(
        'route:bad',
        class extends Route {
          model() {
            throw new Error('bad!');
          }
        }
      );

      this.addTemplate('error', `Error: {{@model.message}}`);

      this.addTemplate(
        'application',
        `
        <LinkTo id="bad-link" @route="bad">
          Bad
        </LinkTo>

        <LinkTo id="good-link" @query={{hash baz='lol'}}>
          Good
        </LinkTo>

        {{outlet}}
        `
      );

      await this.visit('/');

      assert.equal(this.$('#good-link').length, 1, 'good-link should be in the DOM');
      assert.equal(this.$('#bad-link').length, 1, 'bad-link should be in the DOM');

      let goodLink = this.$('#good-link');
      assert.equal(goodLink.attr('href'), '/?baz=lol');

      await this.visit('/bad');

      assert.equal(this.$('#good-link').length, 1, 'good-link should be in the DOM');
      assert.equal(this.$('#bad-link').length, 1, 'bad-link should be in the DOM');

      goodLink = this.$('#good-link');
      // should still be / because we never entered /bad (it errored before being fully entered)
      // and error states do not get represented in the URL, so we are _effectively_ still
      // on /
      assert.equal(goodLink.attr('href'), '/?baz=lol');

      runTask(() => this.click('#good-link'));

      let applicationController = this.getController('application');
      assert.deepEqual(
        applicationController.getProperties('baz'),
        { baz: 'lol' },
        'index controller QP properties updated'
      );
    }

    async ['@test supplied QP properties can be bound'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="the-link" @query={{hash foo=this.boundThing}}>
          Index
        </LinkTo>
        `
      );

      await this.visit('/');

      let indexController = this.getController('index');
      let theLink = this.$('#the-link');

      assert.equal(theLink.attr('href'), '/?foo=OMG');

      runTask(() => indexController.set('boundThing', 'ASL'));

      assert.equal(theLink.attr('href'), '/?foo=ASL');
    }

    async ['@test supplied QP properties can be bound (booleans)'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="the-link" @query={{hash abool=this.boundThing}}>
          Index
        </LinkTo>
        `
      );

      await this.visit('/');

      let indexController = this.getController('index');
      let theLink = this.$('#the-link');

      assert.equal(theLink.attr('href'), '/?abool=OMG');

      runTask(() => indexController.set('boundThing', false));

      assert.equal(theLink.attr('href'), '/?abool=false');

      await this.click('#the-link');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar', 'abool'),
        { foo: '123', bar: 'abc', abool: false },
        'bound bool QP properties update'
      );
    }

    async ['@test href updates when unsupplied controller QP props change'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id="the-link" @query={{hash foo='lol'}}>
          Index
        </LinkTo>
        `
      );

      await this.visit('/');

      let indexController = this.getController('index');
      let theLink = this.$('#the-link');

      assert.equal(theLink.attr('href'), '/?foo=lol');

      runTask(() => indexController.set('bar', 'BORF'));
      await runLoopSettled();

      assert.equal(theLink.attr('href'), '/?bar=BORF&foo=lol');

      runTask(() => indexController.set('foo', 'YEAH'));
      await runLoopSettled();

      assert.equal(theLink.attr('href'), '/?bar=BORF&foo=lol');
    }

    async ['@test [GH#12033] with only query params, it always transitions to the current route with the query params applied'](
      assert
    ) {
      this.addTemplate(
        'cars',
        `
        <LinkTo id='create-link' @route='cars.create'>Create new car</LinkTo>
        <LinkTo id='page2-link' @query={{hash page='2'}}>Page 2</LinkTo>
        {{outlet}}
        `
      );

      this.addTemplate(
        'cars.create',
        `<LinkTo id='close-link' @route='cars'>Close create form</LinkTo>`
      );

      this.router.map(function () {
        this.route('cars', function () {
          this.route('create');
        });
      });

      this.add(
        'controller:cars',
        class extends Controller {
          queryParams = ['page'];
          page = 1;
        }
      );

      await this.visit('/cars/create');

      let router = this.appRouter;
      let carsController = this.getController('cars');

      assert.equal(router.currentRouteName, 'cars.create');

      runTask(() => this.click('#close-link'));

      assert.equal(router.currentRouteName, 'cars.index');
      assert.equal(router.get('url'), '/cars');
      assert.equal(carsController.get('page'), 1, 'The page query-param is 1');

      runTask(() => this.click('#page2-link'));

      assert.equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      assert.equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      assert.equal(carsController.get('page'), 2, 'The query params have been updated');
    }

    async ['@test it applies activeClass when query params are not changed'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id='cat-link' @query={{hash foo='cat'}}>Index</LinkTo>
        <LinkTo id='dog-link' @query={{hash foo='dog'}}>Index</LinkTo>
        <LinkTo id='change-nothing' @route='index'>Index</LinkTo>
        `
      );

      this.addTemplate(
        'search',
        `
        <LinkTo id='same-search' @query={{hash search='same'}}>Index</LinkTo>
        <LinkTo id='change-search' @query={{hash search='change'}}>Index</LinkTo>
        <LinkTo id='same-search-add-archive' @query={{hash search='same' archive=true}}>Index</LinkTo>
        <LinkTo id='only-add-archive' @query={{hash archive=true}}>Index</LinkTo>
        <LinkTo id='both-same' @query={{hash search='same' archive=true}}>Index</LinkTo>
        <LinkTo id='change-one' @query={{hash search='different' archive=true}}>Index</LinkTo>
        <LinkTo id='remove-one' @query={{hash search='different' archive=false}}>Index</LinkTo>
        {{outlet}}
        `
      );

      this.addTemplate(
        'search.results',
        `
        <LinkTo id='same-sort-child-only' @query={{hash sort='title'}}>Index</LinkTo>
        <LinkTo id='same-search-parent-only' @query={{hash search='same'}}>Index</LinkTo>
        <LinkTo id='change-search-parent-only' @query={{hash search='change'}}>Index</LinkTo>
        <LinkTo id='same-search-same-sort-child-and-parent' @query={{hash search='same' sort='title'}}>Index</LinkTo>
        <LinkTo id='same-search-different-sort-child-and-parent' @query={{hash search='same' sort='author'}}>Index</LinkTo>
        <LinkTo id='change-search-same-sort-child-and-parent' @query={{hash search='change' sort='title'}}>Index</LinkTo>
        <LinkTo id='dog-link' @query={{hash foo='dog'}}>Index</LinkTo>
        `
      );

      this.router.map(function () {
        this.route('search', function () {
          this.route('results');
        });
      });

      this.add(
        'controller:search',
        class extends Controller {
          queryParams = ['search', 'archive'];
          search = '';
          archive = false;
        }
      );

      this.add(
        'controller:search.results',
        class extends Controller {
          queryParams = ['sort', 'showDetails'];
          sort = 'title';
          showDetails = true;
        }
      );

      await this.visit('/');

      this.shouldNotBeActive(assert, '#cat-link');
      this.shouldNotBeActive(assert, '#dog-link');

      await this.visit('/?foo=cat');

      this.shouldBeActive(assert, '#cat-link');
      this.shouldNotBeActive(assert, '#dog-link');

      await this.visit('/?foo=dog');

      this.shouldBeActive(assert, '#dog-link');
      this.shouldNotBeActive(assert, '#cat-link');
      this.shouldBeActive(assert, '#change-nothing');

      await this.visit('/search?search=same');

      this.shouldBeActive(assert, '#same-search');
      this.shouldNotBeActive(assert, '#change-search');
      this.shouldNotBeActive(assert, '#same-search-add-archive');
      this.shouldNotBeActive(assert, '#only-add-archive');
      this.shouldNotBeActive(assert, '#remove-one');

      await this.visit('/search?search=same&archive=true');

      this.shouldBeActive(assert, '#both-same');
      this.shouldNotBeActive(assert, '#change-one');

      await this.visit('/search/results?search=same&sort=title&showDetails=true');

      this.shouldBeActive(assert, '#same-sort-child-only');
      this.shouldBeActive(assert, '#same-search-parent-only');
      this.shouldNotBeActive(assert, '#change-search-parent-only');
      this.shouldBeActive(assert, '#same-search-same-sort-child-and-parent');
      this.shouldNotBeActive(assert, '#same-search-different-sort-child-and-parent');
      this.shouldNotBeActive(assert, '#change-search-same-sort-child-and-parent');
    }

    async ['@test it applies active class when query-param is a number'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id='page-link' @query={{hash page=this.pageNumber}}>
          Index
        </LinkTo>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['page'];
          page = 1;
          pageNumber = 5;
        }
      );

      await this.visit('/');

      this.shouldNotBeActive(assert, '#page-link');

      await this.visit('/?page=5');

      this.shouldBeActive(assert, '#page-link');
    }

    async ['@test it applies active class when query-param is an array'](assert) {
      this.addTemplate(
        'index',
        `
        <LinkTo id='array-link' @query={{hash pages=this.pagesArray}}>Index</LinkTo>
        <LinkTo id='bigger-link' @query={{hash pages=this.biggerArray}}>Index</LinkTo>
        <LinkTo id='empty-link' @query={{hash pages=this.emptyArray}}>Index</LinkTo>
        `
      );

      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['pages'];
          pages = [];
          pagesArray = [1, 2];
          biggerArray = [1, 2, 3];
          emptyArray = [];
        }
      );

      await this.visit('/');

      this.shouldNotBeActive(assert, '#array-link');

      await this.visit('/?pages=%5B1%2C2%5D');

      this.shouldBeActive(assert, '#array-link');
      this.shouldNotBeActive(assert, '#bigger-link');
      this.shouldNotBeActive(assert, '#empty-link');

      await this.visit('/?pages=%5B2%2C1%5D');

      this.shouldNotBeActive(assert, '#array-link');
      this.shouldNotBeActive(assert, '#bigger-link');
      this.shouldNotBeActive(assert, '#empty-link');

      await this.visit('/?pages=%5B1%2C2%2C3%5D');

      this.shouldBeActive(assert, '#bigger-link');
      this.shouldNotBeActive(assert, '#array-link');
      this.shouldNotBeActive(assert, '#empty-link');
    }

    async ['@test it applies active class to the parent route'](assert) {
      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
        });
      });

      this.addTemplate(
        'application',
        `
        <LinkTo id='parent-link' @route='parent'>Parent</LinkTo>
        <LinkTo id='parent-child-link' @route='parent.child'>Child</LinkTo>
        <LinkTo id='parent-link-qp' @route='parent' @query={{hash foo=this.cat}}>Parent</LinkTo>
        {{outlet}}
        `
      );

      this.add(
        'controller:parent.child',
        class extends Controller {
          queryParams = ['foo'];
          foo = 'bar';
        }
      );

      await this.visit('/');

      this.shouldNotBeActive(assert, '#parent-link');
      this.shouldNotBeActive(assert, '#parent-child-link');
      this.shouldNotBeActive(assert, '#parent-link-qp');

      await this.visit('/parent/child?foo=dog');

      this.shouldBeActive(assert, '#parent-link');
      this.shouldNotBeActive(assert, '#parent-link-qp');
    }

    async ['@test it disregards query-params in activeness computation when current-when is specified'](
      assert
    ) {
      let appLink;

      this.router.map(function () {
        this.route('parent');
      });

      this.addTemplate(
        'application',
        `
        <LinkTo id='app-link' @route='parent' @query={{hash page=1}} @current-when='parent'>
          Parent
        </LinkTo>
        {{outlet}}
        `
      );

      this.addTemplate(
        'parent',
        `
        <LinkTo id='parent-link' @route='parent' @query={{hash page=1}} @current-when='parent'>
          Parent
        </LinkTo>
        {{outlet}}
        `
      );

      this.add(
        'controller:parent',
        class extends Controller {
          queryParams = ['page'];
          page = 1;
        }
      );

      await this.visit('/');

      appLink = this.$('#app-link');

      assert.equal(appLink.attr('href'), '/parent');
      this.shouldNotBeActive(assert, '#app-link');

      await this.visit('/parent?page=2');

      appLink = this.$('#app-link');
      let router = this.appRouter;

      assert.equal(appLink.attr('href'), '/parent');
      this.shouldBeActive(assert, '#app-link');
      assert.equal(this.$('#parent-link').attr('href'), '/parent');
      this.shouldBeActive(assert, '#parent-link');

      let parentController = this.getController('parent');

      assert.equal(parentController.get('page'), 2);

      runTask(() => parentController.set('page', 3));
      await runLoopSettled();

      assert.equal(router.get('location.path'), '/parent?page=3');
      this.shouldBeActive(assert, '#app-link');
      this.shouldBeActive(assert, '#parent-link');

      await this.click('#app-link');

      assert.equal(router.get('location.path'), '/parent');
    }

    async ['@test it defaults query params while in active transition regression test'](assert) {
      this.router.map(function () {
        this.route('foos');
        this.route('bars');
      });

      let foos = RSVP.defer();
      let bars = RSVP.defer();

      this.addTemplate(
        'application',
        `
        <LinkTo id='foos-link' @route='foos'>Foos</LinkTo>
        <LinkTo id='baz-foos-link' @route='foos' @query={{hash baz=true}}>Baz Foos</LinkTo>
        <LinkTo id='bars-link' @route='bars' @query={{hash quux=true}}>Quux Bars</LinkTo>
        `
      );

      this.add(
        'controller:foos',
        class extends Controller {
          queryParams = ['status'];
          baz = false;
        }
      );

      this.add(
        'route:foos',
        class extends Route {
          model() {
            return foos.promise;
          }
        }
      );

      this.add(
        'controller:bars',
        class extends Controller {
          queryParams = ['status'];
          quux = false;
        }
      );

      this.add(
        'route:bars',
        class extends Route {
          model() {
            return bars.promise;
          }
        }
      );

      await this.visit('/');

      let router = this.appRouter;
      let foosLink = this.$('#foos-link');
      let barsLink = this.$('#bars-link');
      let bazLink = this.$('#baz-foos-link');

      assert.equal(foosLink.attr('href'), '/foos');
      assert.equal(bazLink.attr('href'), '/foos?baz=true');
      assert.equal(barsLink.attr('href'), '/bars?quux=true');
      assert.equal(router.get('location.path'), '/');
      this.shouldNotBeActive(assert, '#foos-link');
      this.shouldNotBeActive(assert, '#baz-foos-link');
      this.shouldNotBeActive(assert, '#bars-link');

      runTask(() => barsLink.click());
      this.shouldNotBeActive(assert, '#bars-link');

      runTask(() => foosLink.click());
      this.shouldNotBeActive(assert, '#foos-link');

      runTask(() => foos.resolve());

      assert.equal(router.get('location.path'), '/foos');
      this.shouldBeActive(assert, '#foos-link');
    }

    async ['@test it does not throw an error if called without a @route argument, but with a @query argument'](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <LinkTo @query={{hash page=this.pageNumber}} id="page-link">
          Index
        </LinkTo>
        `
      );

      this.add(
        'route:index',
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

      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['page'];
          page = 1;
          pageNumber = 5;
        }
      );

      await this.visit('/');

      this.shouldNotBeActive(assert, '#page-link');

      await this.visit('/?page=5');

      this.shouldBeActive(assert, '#page-link');
    }

    async ['@test with dynamic segment and loading route, it should preserve query parameters'](
      assert
    ) {
      this.router.map(function () {
        this.route('foo', { path: ':foo' }, function () {
          this.route('bar', function () {
            this.route('baz');
          });
        });
      });

      this.addTemplate('foo.bar', `<LinkTo id='baz-link' @route='foo.bar.baz'>Baz</LinkTo>`);

      this.addTemplate('foo.bar.loading', 'Loading');

      this.add(
        'controller:foo.bar',
        class extends Controller {
          queryParams = ['qux'];
          qux = null;
        }
      );

      this.add(
        'route:foo.bar.baz',
        class extends Route {
          model() {
            return new RSVP.Promise((resolve) => {
              setTimeout(resolve, 1);
            });
          }
        }
      );

      await this.visit('/foo/bar/baz?qux=abc');

      let bazLink = this.$('#baz-link');
      assert.equal(bazLink.attr('href'), '/foo/bar/baz?qux=abc');
    }
  }
);
