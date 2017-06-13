import { Controller, RSVP } from 'ember-runtime';
import { Route, Router } from 'ember-routing';
import { moduleFor, ApplicationTestCase, AutobootApplicationTestCase } from 'internal-test-helpers';

moduleFor('The {{link-to}} helper: invoking with query params', class extends ApplicationTestCase {
  constructor() {
    super();
    let indexProperties = {
      foo: '123',
      bar: 'abc'
    }
    this.add('controller:index', Controller.extend({
      queryParams: ['foo', 'bar', 'abool'],
      foo: indexProperties.foo,
      bar: indexProperties.bar,
      boundThing: 'OMG',
      abool: true
    }));
    this.add('controller:about', Controller.extend({
        queryParams: ['baz', 'bat'],
        baz: 'alex',
        bat: 'borf'
    }));
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
    assert.equal(classList.indexOf('active') > -1, active, selector + ' active should be ' + active.toString());
  }

  [`@test doesn't update controller QP properties on current route when invoked`](assert) {
    this.addTemplate('index', `
      {{#link-to 'index' id='the-link'}}Index{{/link-to}}
    `);

    return this.visit('/').then(() => {
      this.click('#the-link');
      let indexController = this.getController('index');

      assert.deepEqual(indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    });
  }

  [`@test doesn't update controller QP properties on current route when invoked (empty query-params obj)`](assert) {
    this.addTemplate('index', `
      {{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}
    `);

    return this.visit('/').then(() => {
      this.click('#the-link');
      let indexController = this.getController('index');

      assert.deepEqual(indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    });
  }

  [`@test doesn't update controller QP properties on current route when invoked (empty query-params obj, inferred route)`](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params) id='the-link'}}Index{{/link-to}}
    `);

    return this.visit('/').then(() => {
      this.click('#the-link');
      let indexController = this.getController('index');

      assert.deepEqual(indexController.getProperties('foo', 'bar'),
        this.indexProperties,
        'controller QP properties do not update'
      );
    });
  }

  ['@test updates controller QP properties on current route when invoked'](assert) {
    this.addTemplate('index', `
      {{#link-to 'index' (query-params foo='456') id="the-link"}}
        Index
      {{/link-to}}
    `);

    return this.visit('/').then(() => {
      this.click('#the-link');
      let indexController = this.getController('index');

      assert.deepEqual(indexController.getProperties('foo', 'bar'),
        { foo: '456', bar: 'abc' },
        'controller QP properties updated'
      );
    });
  }

  ['@test updates controller QP properties on current route when invoked (inferred route)'](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params foo='456') id="the-link"}}
        Index
      {{/link-to}}
    `);

    return this.visit('/').then(() => {
      this.click('#the-link');
      let indexController = this.getController('index');

      assert.deepEqual(indexController.getProperties('foo', 'bar'),
        { foo: '456', bar: 'abc' },
        'controller QP properties updated'
      );
    });
  }

  ['@test updates controller QP properties on other route after transitioning to that route'](assert) {
    this.router.map(function() {
      this.route('about');
    });

    this.addTemplate('index',`
      {{#link-to 'about' (query-params baz='lol') id='the-link'}}
        About
      {{/link-to}}
    `);

    return this.visit('/').then(() => {
      let theLink = this.$('#the-link');
      assert.equal(theLink.attr('href'), '/about?baz=lol');

      this.click('#the-link');
      let aboutController = this.getController('about');

      assert.deepEqual(aboutController.getProperties('baz', 'bat'),
        { baz: 'lol', bat: 'borf' },
        'about controller QP properties updated'
      );
    });
  }

  ['@test supplied QP properties can be bound'](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params foo=boundThing) id='the-link'}}Index{{/link-to}}
    `);

    return this.visit('/').then(() => {
      let indexController = this.getController('index');
      let theLink = this.$('#the-link')

      assert.equal(theLink.attr('href'), '/?foo=OMG');

      this.runTask(() => indexController.set('boundThing', 'ASL'));

      assert.equal(theLink.attr('href'), '/?foo=ASL');
    });
  }

  ['@test supplied QP properties can be bound (booleans)'](assert) {
    this.addTemplate('index',`
      {{#link-to (query-params abool=boundThing) id='the-link'}}
        Index
      {{/link-to}}
    `);

    return this.visit('/').then(() => {
      let indexController = this.getController('index');
      let theLink = this.$('#the-link');

      assert.equal(theLink.attr('href'), '/?abool=OMG');

      this.runTask(() => indexController.set('boundThing', false));

      assert.equal(theLink.attr('href'), '/?abool=false');

      this.click('#the-link');

      assert.deepEqual(indexController.getProperties('foo', 'bar', 'abool'),
        { foo: '123', bar: 'abc', abool: false },
        'bound bool QP properties update'
      );
    });
  }
  ['@test href updates when unsupplied controller QP props change'](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params foo='lol') id='the-link'}}Index{{/link-to}}
    `);

    return this.visit('/').then(() => {
      let indexController = this.getController('index');
      let theLink = this.$('#the-link');

      assert.equal(theLink.attr('href'), '/?foo=lol');

      this.runTask(() => indexController.set('bar', 'BORF'));

      assert.equal(theLink.attr('href'), '/?bar=BORF&foo=lol');

      this.runTask(() => indexController.set('foo', 'YEAH'));

      assert.equal(theLink.attr('href'), '/?bar=BORF&foo=lol');
    });
  }

  ['@test The {{link-to}} with only query params always transitions to the current route with the query params applied'](assert) {
    // Test harness for bug #12033
    this.addTemplate('cars',`
      {{#link-to 'cars.create' id='create-link'}}Create new car{{/link-to}}
      {{#link-to (query-params page='2') id='page2-link'}}Page 2{{/link-to}}
      {{outlet}}
    `);
    this.addTemplate('cars.create',
      `{{#link-to 'cars' id='close-link'}}Close create form{{/link-to}}`
    );

    this.router.map(function() {
      this.route('cars', function() {
        this.route('create');
      })
    });

    this.add('controller:cars', Controller.extend({
      queryParams: ['page'],
      page: 1
    }));

    return this.visit('/cars/create').then(() => {
      let router = this.appRouter;
      let carsController = this.getController('cars');

      assert.equal(router.currentRouteName, 'cars.create');

      this.click('#close-link');

      assert.equal(router.currentRouteName, 'cars.index');
      assert.equal(router.get('url'), '/cars');
      assert.equal(carsController.get('page'), 1, 'The page query-param is 1');

      this.click('#page2-link');

      assert.equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      assert.equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      assert.equal(carsController.get('page'), 2, 'The query params have been updated');
    });
  }

  ['@test the {{link-to}} applies activeClass when query params are not changed'](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params foo='cat') id='cat-link'}}Index{{/link-to}}
      {{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}}
      {{#link-to 'index' id='change-nothing'}}Index{{/link-to}}
    `);
    this.addTemplate('search', `
      {{#link-to (query-params search='same') id='same-search'}}Index{{/link-to}}
      {{#link-to (query-params search='change') id='change-search'}}Index{{/link-to}}
      {{#link-to (query-params search='same' archive=true) id='same-search-add-archive'}}Index{{/link-to}}
      {{#link-to (query-params archive=true) id='only-add-archive'}}Index{{/link-to}}
      {{#link-to (query-params search='same' archive=true) id='both-same'}}Index{{/link-to}}
      {{#link-to (query-params search='different' archive=true) id='change-one'}}Index{{/link-to}}
      {{#link-to (query-params search='different' archive=false) id='remove-one'}}Index{{/link-to}}
      {{outlet}}
    `);
    this.addTemplate('search.results', `
      {{#link-to (query-params sort='title') id='same-sort-child-only'}}Index{{/link-to}}
      {{#link-to (query-params search='same') id='same-search-parent-only'}}Index{{/link-to}}
      {{#link-to (query-params search='change') id='change-search-parent-only'}}Index{{/link-to}}
      {{#link-to (query-params search='same' sort='title') id='same-search-same-sort-child-and-parent'}}Index{{/link-to}}
      {{#link-to (query-params search='same' sort='author') id='same-search-different-sort-child-and-parent'}}Index{{/link-to}}
      {{#link-to (query-params search='change' sort='title') id='change-search-same-sort-child-and-parent'}}Index{{/link-to}}
      {{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}}
    `);

    this.router.map(function() {
      this.route('search', function() {
        this.route('results');
      })
    });

    this.add('controller:search', Controller.extend({
      queryParams: ['search', 'archive'],
      search: '',
      archive: false
    }));

    this.add('controller:search.results', Controller.extend({
      queryParams: ['sort', 'showDetails'],
      sort: 'title',
      showDetails: true
    }));

    return this.visit('/').then(() => {
      this.shouldNotBeActive(assert, '#cat-link');
      this.shouldNotBeActive(assert, '#dog-link');

      return this.visit('/?foo=cat');
    }).then(() => {
      this.shouldBeActive(assert, '#cat-link');
      this.shouldNotBeActive(assert, '#dog-link');

      return this.visit('/?foo=dog');
    }).then(() => {
      this.shouldBeActive(assert, '#dog-link');
      this.shouldNotBeActive(assert, '#cat-link');
      this.shouldBeActive(assert, '#change-nothing');

      return this.visit('/search?search=same');
    }).then(() => {
      this.shouldBeActive(assert, '#same-search');
      this.shouldNotBeActive(assert, '#change-search');
      this.shouldNotBeActive(assert, '#same-search-add-archive');
      this.shouldNotBeActive(assert, '#only-add-archive');
      this.shouldNotBeActive(assert, '#remove-one');

      return this.visit('/search?search=same&archive=true')
    }).then(() => {
      this.shouldBeActive(assert, '#both-same');
      this.shouldNotBeActive(assert, '#change-one');

      return this.visit('/search/results?search=same&sort=title&showDetails=true');
    }).then(() => {
      this.shouldBeActive(assert, '#same-sort-child-only');
      this.shouldBeActive(assert, '#same-search-parent-only');
      this.shouldNotBeActive(assert, '#change-search-parent-only');
      this.shouldBeActive(assert, '#same-search-same-sort-child-and-parent');
      this.shouldNotBeActive(assert, '#same-search-different-sort-child-and-parent');
      this.shouldNotBeActive(assert, '#change-search-same-sort-child-and-parent');
    });
  }

  ['@test the {{link-to}} applies active class when query-param is a number'](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params page=pageNumber) id='page-link'}}
        Index
      {{/link-to}}
    `);
    this.add('controller:index', Controller.extend({
      queryParams: ['page'],
      page: 1,
      pageNumber: 5
    }));

    return this.visit('/').then(() => {
      this.shouldNotBeActive(assert, '#page-link');
      return this.visit('/?page=5');
    }).then(() => {
      this.shouldBeActive(assert, '#page-link');
    });
  }

  ['@test the {{link-to}} applies active class when query-param is an array'](assert) {
    this.addTemplate('index', `
      {{#link-to (query-params pages=pagesArray) id='array-link'}}Index{{/link-to}}
      {{#link-to (query-params pages=biggerArray) id='bigger-link'}}Index{{/link-to}}
      {{#link-to (query-params pages=emptyArray) id='empty-link'}}Index{{/link-to}}
    `);

    this.add('controller:index', Controller.extend({
      queryParams: ['pages'],
      pages: [],
      pagesArray: [1, 2],
      biggerArray: [1, 2, 3],
      emptyArray: []
    }));

    return this.visit('/').then(() => {
      this.shouldNotBeActive(assert, '#array-link');

      return this.visit('/?pages=%5B1%2C2%5D');
    }).then(() => {
      this.shouldBeActive(assert, '#array-link');
      this.shouldNotBeActive(assert, '#bigger-link');
      this.shouldNotBeActive(assert, '#empty-link');

      return this.visit('/?pages=%5B2%2C1%5D')
    }).then(() => {
      this.shouldNotBeActive(assert, '#array-link');
      this.shouldNotBeActive(assert, '#bigger-link');
      this.shouldNotBeActive(assert, '#empty-link');

      return this.visit('/?pages=%5B1%2C2%2C3%5D');
    }).then(() => {
      this.shouldBeActive(assert, '#bigger-link');
      this.shouldNotBeActive(assert, '#array-link');
      this.shouldNotBeActive(assert, '#empty-link');
    });
  }
  ['@test the {{link-to}} helper applies active class to the parent route'](assert) {
    this.router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    this.addTemplate('application', `
      {{#link-to 'parent' id='parent-link'}}Parent{{/link-to}}
      {{#link-to 'parent.child' id='parent-child-link'}}Child{{/link-to}}
      {{#link-to 'parent' (query-params foo=cat) id='parent-link-qp'}}Parent{{/link-to}}
      {{outlet}}
    `);

    this.add('controller:parent.child', Controller.extend({
      queryParams: ['foo'],
      foo: 'bar'
    }));

    return this.visit('/').then(() => {
      this.shouldNotBeActive(assert, '#parent-link');
      this.shouldNotBeActive(assert, '#parent-child-link');
      this.shouldNotBeActive(assert, '#parent-link-qp');
      return this.visit('/parent/child?foo=dog');
    }).then(() => {
      this.shouldBeActive(assert, '#parent-link');
      this.shouldNotBeActive(assert, '#parent-link-qp');
    });
  }

  ['@test The {{link-to}} helper disregards query-params in activeness computation when current-when is specified'](assert) {
    let appLink;

    this.router.map(function() {
      this.route('parent');
    });
    this.addTemplate('application', `
      {{#link-to 'parent' (query-params page=1) current-when='parent' id='app-link'}}
        Parent
      {{/link-to}}
      {{outlet}}
    `);
    this.addTemplate('parent', `
      {{#link-to 'parent' (query-params page=1) current-when='parent' id='parent-link'}}
        Parent
      {{/link-to}}
      {{outlet}}
    `);
    this.add('controller:parent', Controller.extend({
      queryParams: ['page'],
      page: 1
    }));

    return this.visit('/').then(() => {
      appLink = this.$('#app-link');

      assert.equal(appLink.attr('href'), '/parent');
      this.shouldNotBeActive(assert, '#app-link');

      return this.visit('/parent?page=2');
    }).then(() => {
      appLink = this.$('#app-link');
      let router = this.appRouter;

      assert.equal(appLink.attr('href'), '/parent');
      this.shouldBeActive(assert, '#app-link');
      assert.equal(this.$('#parent-link').attr('href'), '/parent');
      this.shouldBeActive(assert, '#parent-link');

      let parentController = this.getController('parent');

      assert.equal(parentController.get('page'), 2);

      this.runTask(() => parentController.set('page', 3));

      assert.equal(router.get('location.path'), '/parent?page=3');
      this.shouldBeActive(assert, '#app-link');
      this.shouldBeActive(assert, '#parent-link');

      this.click('#app-link');

      assert.equal(router.get('location.path'), '/parent');
    });
  }

  ['@test link-to default query params while in active transition regression test'](assert) {
    this.router.map(function() {
      this.route('foos');
      this.route('bars');
    });
    let foos = RSVP.defer();
    let bars = RSVP.defer();

    this.addTemplate('application', `
      {{link-to 'Foos' 'foos' id='foos-link'}}
      {{link-to 'Baz Foos' 'foos' (query-params baz=true) id='baz-foos-link'}}
      {{link-to 'Quux Bars' 'bars' (query-params quux=true) id='bars-link'}}
    `);
    this.add('controller:foos', Controller.extend({
      queryParams: ['status'],
      baz: false
    }));
    this.add('route:foos', Route.extend({
      model() {
        return foos.promise;
      }
    }));
    this.add('controller:bars', Controller.extend({
      queryParams: ['status'],
      quux: false
    }));
    this.add('route:bars', Route.extend({
      model() {
        return bars.promise;
      }
    }));

    return this.visit('/').then(() => {
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

      this.runTask(() => barsLink.click());
      this.shouldNotBeActive(assert, '#bars-link');

      this.runTask(() => foosLink.click());
      this.shouldNotBeActive(assert, '#foos-link');

      this.runTask(() => foos.resolve());

      assert.equal(router.get('location.path'), '/foos');
      this.shouldBeActive(assert, '#foos-link');
    });
  }
});

moduleFor('The {{link-to}} helper + query params - globals mode app', class extends AutobootApplicationTestCase {
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

        this.addTemplate('application', `{{#link-to id='the-link'}}Index{{/link-to}}`);
      });
    }, /(You must provide one or more parameters to the link-to component.|undefined is not an object)/);
  }
});