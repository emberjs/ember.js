import { Controller } from 'ember-runtime';
import { Route } from 'ember-routing';
import { run, Mixin } from 'ember-metal';
import { QueryParamTestCase, moduleFor } from 'internal-test-helpers';

moduleFor('Query Params - overlapping query param property names', class extends QueryParamTestCase {
  setupBase() {
    this.router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    return this.visit('/parent/child');
  }

  ['@test can remap same-named qp props'](assert) {
    assert.expect(7);

    this.setMappedQPController('parent');
    this.setMappedQPController('parent.child', 'page', 'childPage');

    return this.setupBase().then(() => {
      this.assertCurrentPath('/parent/child');

      let parentController = this.getController('parent');
      let parentChildController = this.getController('parent.child');

      this.setAndFlush(parentController, 'page', 2);
      this.assertCurrentPath('/parent/child?parentPage=2');
      this.setAndFlush(parentController, 'page', 1);
      this.assertCurrentPath('/parent/child');

      this.setAndFlush(parentChildController, 'page', 2);
      this.assertCurrentPath('/parent/child?childPage=2');
      this.setAndFlush(parentChildController, 'page', 1);
      this.assertCurrentPath('/parent/child');

      run(() => {
        parentController.set('page', 2);
        parentChildController.set('page', 2);
      });

      this.assertCurrentPath('/parent/child?childPage=2&parentPage=2');

      run(() => {
        parentController.set('page', 1);
        parentChildController.set('page', 1);
      });

      this.assertCurrentPath('/parent/child');
    });
  }

  ['@test query params can be either controller property or url key'](assert) {
    assert.expect(3);

    this.setMappedQPController('parent');

    return this.setupBase().then(() => {
      this.assertCurrentPath('/parent/child');

      this.transitionTo('parent.child', { queryParams: { page: 2 } });
      this.assertCurrentPath('/parent/child?parentPage=2');

      this.transitionTo('parent.child', { queryParams: { parentPage: 3 } });
      this.assertCurrentPath('/parent/child?parentPage=3');
    });
  }

  ['@test query param matching a url key and controller property'](assert) {
    assert.expect(3);

    this.setMappedQPController('parent', 'page', 'parentPage');
    this.setMappedQPController('parent.child', 'index', 'page');

    return this.setupBase().then(() => {
      this.transitionTo('parent.child', { queryParams: { page: 2 } });
      this.assertCurrentPath('/parent/child?parentPage=2');

      this.transitionTo('parent.child', { queryParams: { parentPage: 3 } });
      this.assertCurrentPath('/parent/child?parentPage=3');

      this.transitionTo('parent.child', { queryParams: { index: 2, page: 2 } });
      this.assertCurrentPath('/parent/child?page=2&parentPage=2');
    });
  }

  ['@test query param matching same property on two controllers use the urlKey higher in the chain'](assert) {
    assert.expect(4);

    this.setMappedQPController('parent', 'page', 'parentPage');
    this.setMappedQPController('parent.child', 'page', 'childPage');

    return this.setupBase().then(() => {
      this.transitionTo('parent.child', { queryParams: { page: 2 } });
      this.assertCurrentPath('/parent/child?parentPage=2');

      this.transitionTo('parent.child', { queryParams: { parentPage: 3 } });
      this.assertCurrentPath('/parent/child?parentPage=3');

      this.transitionTo('parent.child', { queryParams: { childPage: 2, page: 2 } });
      this.assertCurrentPath('/parent/child?childPage=2&parentPage=2');

      this.transitionTo('parent.child', { queryParams: { childPage: 3, parentPage: 4 } });
      this.assertCurrentPath('/parent/child?childPage=3&parentPage=4');
    });
  }

  ['@test query params does not error when a query parameter exists for route instances that share a controller'](assert) {
    assert.expect(1);

    let parentController = Controller.extend({
      queryParams: { page: 'page' }
    });
    this.add('controller:parent', parentController);
    this.add('route:parent.child', Route.extend({controllerName: 'parent'}));

    return this.setupBase('/parent').then(() => {
      this.transitionTo('parent.child', { queryParams: { page: 2 } });
      this.assertCurrentPath('/parent/child?page=2');
    });
  }
  ['@test query params in the same route hierarchy with the same url key get auto-scoped'](assert) {
    assert.expect(1);

    this.setMappedQPController('parent');
    this.setMappedQPController('parent.child');

    expectAssertion(() => {
      this.setupBase();
    }, 'You\'re not allowed to have more than one controller property map to the same query param key, but both `parent:page` and `parent.child:page` map to `parentPage`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `page: { as: \'other-page\' }`');
  }

  ['@test Support shared but overridable mixin pattern'](assert) {
    assert.expect(7);

    let HasPage = Mixin.create({
      queryParams: 'page',
      page: 1
    });

    this.add('controller:parent', Controller.extend(HasPage, {
      queryParams: { page: 'yespage' }
    }));

    this.add('controller:parent.child', Controller.extend(HasPage));

    return this.setupBase().then(() => {
      this.assertCurrentPath('/parent/child');

      let parentController = this.getController('parent');
      let parentChildController = this.getController('parent.child');

      this.setAndFlush(parentChildController, 'page', 2);
      this.assertCurrentPath('/parent/child?page=2');
      assert.equal(parentController.get('page'), 1);
      assert.equal(parentChildController.get('page'), 2);

      this.setAndFlush(parentController, 'page', 2);
      this.assertCurrentPath('/parent/child?page=2&yespage=2');
      assert.equal(parentController.get('page'), 2);
      assert.equal(parentChildController.get('page'), 2);
    });
  }
});
