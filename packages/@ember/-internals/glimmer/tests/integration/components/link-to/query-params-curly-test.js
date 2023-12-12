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
  '{{link-to}} component with query-params (rendering)',
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

    async ['@test populates href with fully supplied query param values']() {
      this.addTemplate(
        'index',
        `{{#link-to route='index' query=(hash foo='456' bar='NAW')}}Index{{/link-to}}`
      );

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/?bar=NAW&foo=456' },
        content: 'Index',
      });
    }

    async ['@test it populates href with fully supplied query param values, but without @route param']() {
      this.addTemplate(
        'index',
        `{{#link-to query=(hash foo='2' bar='NAW')}}QueryParams{{/link-to}}`
      );

      await this.visit('/');

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: '/?bar=NAW&foo=2' },
        content: 'QueryParams',
      });
    }

    async ['@test populates href with partially supplied query param values, but omits if value is default value']() {
      this.addTemplate(
        'index',
        `{{#link-to route='index' query=(hash foo='123')}}Index{{/link-to}}`
      );

      return this.visit('/').then(() => {
        this.assertComponentElement(this.firstChild, {
          tagName: 'a',
          attrs: { href: '/', class: classMatcher('ember-view active') },
          content: 'Index',
        });
      });
    }
  }
);

moduleFor(
  '{{link-to}} component with query params (routing)',
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
      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to route='index'}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#the-link > a');

      let indexController = this.getController('index');

      assert.deepEqual(
        indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    }

    async [`@test doesn't update controller QP properties on current route when invoked (empty query-params obj)`](
      assert
    ) {
      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to route='index' query=(hash)}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#the-link > a');

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
      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to query=(hash)}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      await this.click('#the-link > a');

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
        <div id="the-link">
          {{#link-to route='index' query=(hash foo='456')}}
            Index
          {{/link-to}}
        </div>
        `
      );

      await this.visit('/');

      await this.click('#the-link > a');

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
        <div id="the-link">
          {{#link-to query=(hash foo='456')}}
            Index
          {{/link-to}}
        </div>
        `
      );

      await this.visit('/');

      await this.click('#the-link > a');

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
        <div id='the-link'>
          {{#link-to route='about' query=(hash baz='lol')}}
            About
          {{/link-to}}
        </div>
        `
      );

      await this.visit('/');

      let theLink = this.$('#the-link > a');

      assert.equal(theLink.attr('href'), '/about?baz=lol');

      runTask(() => this.click('#the-link > a'));

      let aboutController = this.getController('about');

      assert.deepEqual(
        aboutController.getProperties('baz', 'bat'),
        { baz: 'lol', bat: 'borf' },
        'about controller QP properties updated'
      );
    }

    async ['@test supplied QP properties can be bound'](assert) {
      this.addTemplate(
        'index',
        `<div id='the-link'>{{#link-to query=(hash foo=this.boundThing)}}Index{{/link-to}}</div>`
      );

      await this.visit('/');

      let indexController = this.getController('index');
      let theLink = this.$('#the-link > a');

      assert.equal(theLink.attr('href'), '/?foo=OMG');

      runTask(() => indexController.set('boundThing', 'ASL'));

      assert.equal(theLink.attr('href'), '/?foo=ASL');
    }

    async ['@test supplied QP properties can be bound (booleans)'](assert) {
      this.addTemplate(
        'index',
        `
        <div id='the-link'>
          {{#link-to query=(hash abool=this.boundThing)}}
            Index
          {{/link-to}}
        </div>
        `
      );

      await this.visit('/');

      let indexController = this.getController('index');
      let theLink = this.$('#the-link > a');

      assert.equal(theLink.attr('href'), '/?abool=OMG');

      runTask(() => indexController.set('boundThing', false));

      assert.equal(theLink.attr('href'), '/?abool=false');

      await this.click('#the-link > a');

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
        <div id='the-link'>
          {{#link-to query=(hash foo='lol')}}Index{{/link-to}}
        </div>
        `
      );

      await this.visit('/');

      let indexController = this.getController('index');
      let theLink = this.$('#the-link > a');

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
        <div id='create-link'>{{#link-to route='cars.create'}}Create new car{{/link-to}}</div>
        <div id='page2-link'>{{#link-to query=(hash page='2')}}Page 2{{/link-to}}</div>
        {{outlet}}
        `
      );

      this.addTemplate(
        'cars.create',
        `<div id='close-link'>{{#link-to route='cars'}}Close create form{{/link-to}}</div>`
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

      runTask(() => this.click('#close-link > a'));

      assert.equal(router.currentRouteName, 'cars.index');
      assert.equal(router.get('url'), '/cars');
      assert.equal(carsController.get('page'), 1, 'The page query-param is 1');

      runTask(() => this.click('#page2-link > a'));

      assert.equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      assert.equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      assert.equal(carsController.get('page'), 2, 'The query params have been updated');
    }

    async ['@test it applies activeClass when query params are not changed'](assert) {
      this.addTemplate(
        'index',
        `
        <div id='cat-link'>{{#link-to query=(hash foo='cat')}}Index{{/link-to}}</div>
        <div id='dog-link'>{{#link-to query=(hash foo='dog')}}Index{{/link-to}}</div>
        <div id='change-nothing'>{{#link-to route='index'}}Index{{/link-to}}</div>
        `
      );

      this.addTemplate(
        'search',
        `
        <div id='same-search'>{{#link-to query=(hash search='same')}}Index{{/link-to}}</div>
        <div id='change-search'>{{#link-to query=(hash search='change')}}Index{{/link-to}}</div>
        <div id='same-search-add-archive'>{{#link-to query=(hash search='same' archive=true)}}Index{{/link-to}}</div>
        <div id='only-add-archive'>{{#link-to query=(hash archive=true)}}Index{{/link-to}}</div>
        <div id='both-same'>{{#link-to query=(hash search='same' archive=true)}}Index{{/link-to}}</div>
        <div id='change-one'>{{#link-to query=(hash search='different' archive=true)}}Index{{/link-to}}</div>
        <div id='remove-one'>{{#link-to query=(hash search='different' archive=false)}}Index{{/link-to}}</div>
        {{outlet}}
        `
      );

      this.addTemplate(
        'search.results',
        `
        <div id='same-sort-child-only'>{{#link-to query=(hash sort='title')}}Index{{/link-to}}</div>
        <div id='same-search-parent-only'>{{#link-to query=(hash search='same')}}Index{{/link-to}}</div>
        <div id='change-search-parent-only'>{{#link-to query=(hash search='change')}}Index{{/link-to}}</div>
        <div id='same-search-same-sort-child-and-parent'>{{#link-to query=(hash search='same' sort='title')}}Index{{/link-to}}</div>
        <div id='same-search-different-sort-child-and-parent'>{{#link-to query=(hash search='same' sort='author')}}Index{{/link-to}}</div>
        <div id='change-search-same-sort-child-and-parent'>{{#link-to query=(hash search='change' sort='title')}}Index{{/link-to}}</div>
        <div id='dog-link'>{{#link-to query=(hash foo='dog')}}Index{{/link-to}}</div>
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

      this.shouldNotBeActive(assert, '#cat-link > a');
      this.shouldNotBeActive(assert, '#dog-link > a');

      await this.visit('/?foo=cat');

      this.shouldBeActive(assert, '#cat-link > a');
      this.shouldNotBeActive(assert, '#dog-link > a');

      await this.visit('/?foo=dog');

      this.shouldBeActive(assert, '#dog-link > a');
      this.shouldNotBeActive(assert, '#cat-link > a');
      this.shouldBeActive(assert, '#change-nothing > a');

      await this.visit('/search?search=same');

      this.shouldBeActive(assert, '#same-search > a');
      this.shouldNotBeActive(assert, '#change-search > a');
      this.shouldNotBeActive(assert, '#same-search-add-archive > a');
      this.shouldNotBeActive(assert, '#only-add-archive > a');
      this.shouldNotBeActive(assert, '#remove-one > a');

      await this.visit('/search?search=same&archive=true');

      this.shouldBeActive(assert, '#both-same > a');
      this.shouldNotBeActive(assert, '#change-one > a');

      await this.visit('/search/results?search=same&sort=title&showDetails=true');

      this.shouldBeActive(assert, '#same-sort-child-only > a');
      this.shouldBeActive(assert, '#same-search-parent-only > a');
      this.shouldNotBeActive(assert, '#change-search-parent-only > a');
      this.shouldBeActive(assert, '#same-search-same-sort-child-and-parent > a');
      this.shouldNotBeActive(assert, '#same-search-different-sort-child-and-parent > a');
      this.shouldNotBeActive(assert, '#change-search-same-sort-child-and-parent > a');
    }

    async ['@test it applies active class when query-param is a number'](assert) {
      this.addTemplate(
        'index',
        `
        <div id='page-link'>
          {{#link-to query=(hash page=this.pageNumber)}}
            Index
          {{/link-to}}
        </div>
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

      this.shouldNotBeActive(assert, '#page-link > a');

      await this.visit('/?page=5');

      this.shouldBeActive(assert, '#page-link > a');
    }

    async ['@test it applies active class when query-param is an array'](assert) {
      this.addTemplate(
        'index',
        `
        <div id='array-link'>{{#link-to query=(hash pages=this.pagesArray)}}Index{{/link-to}}</div>
        <div id='bigger-link'>{{#link-to query=(hash pages=this.biggerArray)}}Index{{/link-to}}</div>
        <div id='empty-link'>{{#link-to query=(hash pages=this.emptyArray)}}Index{{/link-to}}</div>
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

      this.shouldNotBeActive(assert, '#array-link > a');

      await this.visit('/?pages=%5B1%2C2%5D');

      this.shouldBeActive(assert, '#array-link > a');
      this.shouldNotBeActive(assert, '#bigger-link > a');
      this.shouldNotBeActive(assert, '#empty-link > a');

      await this.visit('/?pages=%5B2%2C1%5D');

      this.shouldNotBeActive(assert, '#array-link > a');
      this.shouldNotBeActive(assert, '#bigger-link > a');
      this.shouldNotBeActive(assert, '#empty-link > a');

      await this.visit('/?pages=%5B1%2C2%2C3%5D');

      this.shouldBeActive(assert, '#bigger-link > a');
      this.shouldNotBeActive(assert, '#array-link > a');
      this.shouldNotBeActive(assert, '#empty-link > a');
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
        <div id='parent-link'>{{#link-to route='parent'}}Parent{{/link-to}}</div>
        <div id='parent-child-link'>{{#link-to route='parent.child'}}P}}Child{{/link-to}}</div>
        <div id='parent-link-qp'>{{#link-to route='parent' query=(hash foo=this.cat)}}P}}Parent{{/link-to}}</div>
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

      this.shouldNotBeActive(assert, '#parent-link > a');
      this.shouldNotBeActive(assert, '#parent-child-link > a');
      this.shouldNotBeActive(assert, '#parent-link-qp > a');

      await this.visit('/parent/child?foo=dog');

      this.shouldBeActive(assert, '#parent-link > a');
      this.shouldNotBeActive(assert, '#parent-link-qp > a');
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
        <div id='app-link'>
          {{#link-to route='parent' query=(hash page=1) current-when='parent'}}
            Parent
          {{/link-to}}
        </div>
        {{outlet}}
        `
      );

      this.addTemplate(
        'parent',
        `
        <div id='parent-link'>
          {{#link-to route='parent' query=(hash page=1) current-when='parent'}}
            Parent
          {{/link-to}}
        </div>
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

      appLink = this.$('#app-link > a');

      assert.equal(appLink.attr('href'), '/parent');
      this.shouldNotBeActive(assert, '#app-link > a');

      await this.visit('/parent?page=2');

      appLink = this.$('#app-link > a');
      let router = this.appRouter;

      assert.equal(appLink.attr('href'), '/parent');
      this.shouldBeActive(assert, '#app-link > a');
      assert.equal(this.$('#parent-link > a').attr('href'), '/parent');
      this.shouldBeActive(assert, '#parent-link > a');

      let parentController = this.getController('parent');

      assert.equal(parentController.get('page'), 2);

      runTask(() => parentController.set('page', 3));
      await runLoopSettled();

      assert.equal(router.get('location.path'), '/parent?page=3');
      this.shouldBeActive(assert, '#app-link > a');
      this.shouldBeActive(assert, '#parent-link > a');

      await this.click('#app-link > a');

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
        <div id='foos-link'>{{#link-to route='foos'}}Foos{{/link-to}}</div>
        <div id='baz-foos-link'>{{#link-to route='foos' query=(hash baz=true)}}Baz Foos{{/link-to}}</div>
        <div id='bars-link'>{{#link-to route='bars' query=(hash quux=true)}}Quux Bars{{/link-to}}</div>
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
      let foosLink = this.$('#foos-link > a');
      let barsLink = this.$('#bars-link > a');
      let bazLink = this.$('#baz-foos-link > a');

      assert.equal(foosLink.attr('href'), '/foos');
      assert.equal(bazLink.attr('href'), '/foos?baz=true');
      assert.equal(barsLink.attr('href'), '/bars?quux=true');
      assert.equal(router.get('location.path'), '/');
      this.shouldNotBeActive(assert, '#foos-link > a');
      this.shouldNotBeActive(assert, '#baz-foos-link > a');
      this.shouldNotBeActive(assert, '#bars-link > a');

      runTask(() => barsLink.click());
      this.shouldNotBeActive(assert, '#bars-link > a');

      runTask(() => foosLink.click());
      this.shouldNotBeActive(assert, '#foos-link > a');

      runTask(() => foos.resolve());

      assert.equal(router.get('location.path'), '/foos');
      this.shouldBeActive(assert, '#foos-link > a');
    }

    async ['@test it does not throw an error if called without a @route argument, but with a @query argument'](
      assert
    ) {
      this.addTemplate(
        'index',
        `
        <div id='page-link'>
          {{#link-to query=(hash page=this.pageNumber)}}
            Index
          {{/link-to}}
        </div>
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

      this.shouldNotBeActive(assert, '#page-link > a');

      await this.visit('/?page=5');

      this.shouldBeActive(assert, '#page-link > a');
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

      this.addTemplate(
        'foo.bar',
        `<div id='baz-link'>{{#link-to route='foo.bar.baz'}}Baz{{/link-to}}</div>`
      );
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

      let bazLink = this.$('#baz-link > a');
      assert.equal(bazLink.attr('href'), '/foo/bar/baz?qux=abc');
    }
  }
);
