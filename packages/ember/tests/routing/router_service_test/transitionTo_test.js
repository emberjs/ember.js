import { inject } from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { Route, NoneLocation } from 'ember-routing';
import { Controller } from 'ember-runtime';
import {
  run,
  get,
  set
} from 'ember-metal';
import {
  RouterTestCase,
  moduleFor
} from 'internal-test-helpers';
import { Transition } from 'router';

import { EMBER_ROUTING_ROUTER_SERVICE } from 'ember/features';

if (EMBER_ROUTING_ROUTER_SERVICE) {
  moduleFor('Router Service - transitionTo', class extends RouterTestCase {
    constructor() {
      super();

      let testCase = this;
      testCase.state = [];

      this.add('location:test', NoneLocation.extend({
        setURL(path) {
          testCase.state.push(path);
          this.set('path', path);
        },

        replaceURL(path) {
          testCase.state.splice(testCase.state.length -1, 1, path);
          this.set('path', path);
        }
      }));
    }

    get routerOptions() {
      return {
        location: 'test'
      };
    }

    ['@test RouterService#transitionTo returns a Transition'](assert) {
      assert.expect(1);

      let transition;

      return this.visit('/')
        .then(() => {
          transition = this.routerService.transitionTo('parent.child');

          assert.ok(transition instanceof Transition);

          return transition;
        });
    }

    ['@test RouterService#transitionTo with basic route updates location'](assert) {
      assert.expect(1);

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.brother');
        })
        .then(() => {
          assert.deepEqual(this.state, ['/', '/child', '/sister', '/brother']);
        });
    }

    ['@test RouterService#transitionTo transitioning back to previously visited route updates location'](assert) {
      assert.expect(1);

      return this.visit('/')
        .then(() => {
          return this.routerService.transitionTo('parent.child');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.brother');
        })
        .then(() => {
          return this.routerService.transitionTo('parent.sister');
        })
        .then(() => {
          assert.deepEqual(this.state, ['/', '/child', '/sister', '/brother', '/sister']);
        });
    }

    ['@test RouterService#transitionTo with basic route'](assert) {
      assert.expect(1);

      let componentInstance;

      this.addTemplate('parent.index', '{{foo-bar}}');

      this.addComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToSister() {
              get(this, 'routerService').transitionTo('parent.sister');
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToSister');
        });

        assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');
      });
    }

    ['@test RouterService#transitionTo with basic route using URL'](assert) {
      assert.expect(1);

      let componentInstance;

      this.addTemplate('parent.index', '{{foo-bar}}');

      this.addComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToSister() {
              get(this, 'routerService').transitionTo('/sister');
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToSister');
        });

        assert.equal(this.routerService.get('currentRouteName'), 'parent.sister');
      });
    }

    ['@test RouterService#transitionTo with dynamic segment'](assert) {
      assert.expect(3);

      let componentInstance;
      let dynamicModel = { id: 1, contents: 'much dynamicism' };

      this.addTemplate('parent.index', '{{foo-bar}}');
      this.addTemplate('dynamic', '{{model.contents}}');

      this.addComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToDynamic() {
              get(this, 'routerService').transitionTo('dynamic', dynamicModel);
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToDynamic');
        });

        assert.equal(this.routerService.get('currentRouteName'), 'dynamic');
        assert.equal(this.routerService.get('currentURL'), '/dynamic/1');
        this.assertText('much dynamicism');
      });
    }

    ['@test RouterService#transitionTo with dynamic segment and model hook'](assert) {
      assert.expect(3);

      let componentInstance;
      let dynamicModel = { id: 1, contents: 'much dynamicism' };

      this.add('route:dynamic', Route.extend({
        model() {
          return dynamicModel;
        }
      }));

      this.addTemplate('parent.index', '{{foo-bar}}');
      this.addTemplate('dynamic', '{{model.contents}}');

      this.addComponent('foo-bar', {
        ComponentClass: Component.extend({
          routerService: inject.service('router'),
          init() {
            this._super();
            componentInstance = this;
          },
          actions: {
            transitionToDynamic() {
              get(this, 'routerService').transitionTo('dynamic', 1);
            }
          }
        }),
        template: `foo-bar`
      });

      return this.visit('/').then(() => {
        run(function() {
          componentInstance.send('transitionToDynamic');
        });

        assert.equal(this.routerService.get('currentRouteName'), 'dynamic');
        assert.equal(this.routerService.get('currentURL'), '/dynamic/1');
        this.assertText('much dynamicism');
      });
    }

    ['@test RouterService#transitionTo with basic query params does not remove query param defaults'](assert) {
      assert.expect(1);

      this.add('controller:parent.child', Controller.extend({
        queryParams: ['sort'],
        sort: 'ASC'
      }));

      let queryParams = this.buildQueryParams({ sort: 'ASC' });

      return this.visit('/').then(() => {
        return this.routerService.transitionTo('parent.child', queryParams);
      })
        .then(() => {
          assert.equal(this.routerService.get('currentURL'), '/child?sort=ASC');
        });
    }

    ['@test RouterService#transitionTo with unspecified query params'](assert) {
      assert.expect(1);

      this.add('controller:parent.child', Controller.extend({
        queryParams: ['sort', 'string', 'page', 'category', 'extra'],
        sort: 'ASC',
        string: '',
        page: null,
        category: undefined
      }));

      let queryParams = this.buildQueryParams({ sort: 'ASC' });

      return this.visit('/').then(() => {
        return this.routerService.transitionTo('parent.child', queryParams);
      })
        .then(() => {
          assert.equal(this.routerService.get('currentURL'), '/child?category=undefined&extra=undefined&page=null&sort=ASC&string=');
        });
    }

    ['@test RouterService#transitionTo with aliased query params uses the original provided key'](assert) {
      assert.expect(1);

      this.add('controller:parent.child', Controller.extend({
        queryParams: {
          'cont_sort': 'url_sort'
        },
        cont_sort: 'ASC'
      }));

      let queryParams = this.buildQueryParams({ url_sort: 'ASC' });

      return this.visit('/').then(() => {
        return this.routerService.transitionTo('parent.child', queryParams);
      })
        .then(() => {
          assert.equal(this.routerService.get('currentURL'), '/child?url_sort=ASC');
        });
    }

    ['@test RouterService#transitionTo with aliased query params uses the original provided key when controller property name'](assert) {
      assert.expect(1);

      this.add('controller:parent.child', Controller.extend({
        queryParams: {
          'cont_sort': 'url_sort'
        },
        cont_sort: 'ASC'
      }));

      let queryParams = this.buildQueryParams({ cont_sort: 'ASC' });

      return this.visit('/').then(() => {
        expectAssertion(() => {
          return this.routerService.transitionTo('parent.child', queryParams);
        }, 'You passed the `cont_sort` query parameter during a transition into parent.child, please update to url_sort');
      });
    }
  });
}
