import { Controller } from 'ember-runtime';
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
    this.registerController('parent', Controller.extend({
      queryParams: { page: 'parentPage' },
      page: 1
    }));

    this.registerController('parent.child', Controller.extend({
      queryParams: { page: 'childPage' },
      page: 1
    }));

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

  // FIXME: The error should throw without having to do `transitionTo`.
  ['@test query params in the same route hierarchy with the same url key get auto-scoped'](assert) {
    this.registerController('parent', Controller.extend({
      queryParams: { foo: 'shared' },
      foo: 1
    }));

    this.registerController('parent.child', Controller.extend({
      queryParams: { bar: 'shared' },
      bar: 1
    }));

    return this.setupBase().then((...args) => {
      expectAssertion(() => {
        this.transitionTo('parent.child');
      }, 'You\'re not allowed to have more than one controller property map to the same query param key, but both `parent:foo` and `parent.child:bar` map to `shared`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `foo: { as: \'other-foo\' }`');
    });
  }

  ['@test Support shared but overridable mixin pattern'](assert) {
    let HasPage = Mixin.create({
      queryParams: 'page',
      page: 1
    });

    this.registerController('parent', Controller.extend(HasPage, {
      queryParams: { page: 'yespage' }
    }));

    this.registerController('parent.child', Controller.extend(HasPage));

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
