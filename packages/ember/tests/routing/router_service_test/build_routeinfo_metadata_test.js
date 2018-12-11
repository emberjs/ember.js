import {
  EMBER_ROUTING_ROUTER_SERVICE,
  EMBER_ROUTING_BUILD_ROUTEINFO_METADATA,
} from '@ember/canary-features';
import { RouterTestCase, moduleFor } from 'internal-test-helpers';
import { inject as service } from '@ember/service';
import { Route } from '@ember/-internals/routing';

if (EMBER_ROUTING_BUILD_ROUTEINFO_METADATA && EMBER_ROUTING_ROUTER_SERVICE) {
  moduleFor(
    'buildRouteInfoMetadata',
    class extends RouterTestCase {
      '@test basic metadata'(assert) {
        assert.expect(4);
        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);
              this.router.on('routeWillChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.metadata, 'parent-index-page');
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.metadata, 'parent-index-page');
              });
            },
          })
        );

        this.add(
          `route:parent.index`,
          Route.extend({
            buildRouteInfoMetadata() {
              return 'parent-index-page';
            },
          })
        );

        return this.visit('/');
      }

      '@test hierarchical metadata'(assert) {
        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            buildRouteInfoMetadata() {
              return 'application-shell';
            },
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.metadata, 'parent-index-page');
                assert.equal(transition.to.parent.name, 'parent');
                assert.equal(transition.to.parent.metadata, 'parent-page');
                assert.equal(transition.to.parent.parent.name, 'application');
                assert.equal(transition.to.parent.parent.metadata, 'application-shell');
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.metadata, 'parent-index-page');
                assert.equal(transition.to.parent.name, 'parent');
                assert.equal(transition.to.parent.metadata, 'parent-page');
                assert.equal(transition.to.parent.parent.name, 'application');
                assert.equal(transition.to.parent.parent.metadata, 'application-shell');
              });
            },
          })
        );

        this.add(
          `route:parent`,
          Route.extend({
            buildRouteInfoMetadata() {
              return 'parent-page';
            },
          })
        );

        this.add(
          `route:parent.index`,
          Route.extend({
            buildRouteInfoMetadata() {
              return 'parent-index-page';
            },
          })
        );

        return this.visit('/');
      }

      '@test metadata can be complex objects'(assert) {
        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.metadata.name, 'parent-index-page');
                assert.equal(transition.to.metadata.title('PARENT'), 'My Name is PARENT');
              });

              this.router.on('routeDidChange', transition => {
                assert.equal(transition.to.name, 'parent.index');
                assert.equal(transition.to.metadata.name, 'parent-index-page');
                assert.equal(transition.to.metadata.title('PARENT'), 'My Name is PARENT');
              });
            },
          })
        );

        this.add(`route:parent`, Route.extend({}));

        this.add(
          `route:parent.index`,
          Route.extend({
            buildRouteInfoMetadata() {
              return {
                name: 'parent-index-page',
                title: name => `My Name is ${name}`,
              };
            },
          })
        );

        return this.visit('/');
      }

      '@test metadata is placed on the `from`'(assert) {
        assert.expect(12);
        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeWillChange', transition => {
                if (transition.to.name === 'parent.index') {
                  assert.equal(transition.to.metadata.name, 'parent-index-page');
                  assert.equal(transition.to.metadata.title('INDEX'), 'My Name is INDEX');
                } else {
                  assert.equal(transition.from.metadata.name, 'parent-index-page');
                  assert.equal(transition.from.metadata.title('INDEX'), 'My Name is INDEX');
                  assert.equal(transition.to.metadata.name, 'parent-child-page');
                  assert.equal(transition.to.metadata.title('CHILD'), 'My Name is CHILD!!');
                }
              });

              this.router.on('routeDidChange', transition => {
                if (transition.to.name === 'parent.index') {
                  assert.equal(transition.to.metadata.name, 'parent-index-page');
                  assert.equal(transition.to.metadata.title('INDEX'), 'My Name is INDEX');
                } else {
                  assert.equal(transition.from.metadata.name, 'parent-index-page');
                  assert.equal(transition.from.metadata.title('INDEX'), 'My Name is INDEX');
                  assert.equal(transition.to.metadata.name, 'parent-child-page');
                  assert.equal(transition.to.metadata.title('CHILD'), 'My Name is CHILD!!');
                }
              });
            },
          })
        );

        this.add(`route:parent`, Route.extend({}));

        this.add(
          `route:parent.index`,
          Route.extend({
            buildRouteInfoMetadata() {
              return {
                name: 'parent-index-page',
                title: name => `My Name is ${name}`,
              };
            },
          })
        );

        this.add(
          `route:parent.child`,
          Route.extend({
            buildRouteInfoMetadata() {
              return {
                name: 'parent-child-page',
                title: name => `My Name is ${name}!!`,
              };
            },
          })
        );

        return this.visit('/').then(() => {
          return this.visit('/child');
        });
      }

      '@test can be used with model data from `attributes`'(assert) {
        assert.expect(6);
        this.add(
          `route:application`,
          Route.extend({
            router: service('router'),
            init() {
              this._super(...arguments);

              this.router.on('routeDidChange', transition => {
                if (transition.to.name === 'parent.index') {
                  assert.equal(transition.to.metadata.name, 'parent-index-page');
                  assert.equal(
                    transition.to.metadata.title(transition.to.attributes),
                    'My Name is INDEX'
                  );
                } else {
                  assert.equal(transition.from.metadata.name, 'parent-index-page');
                  assert.equal(
                    transition.from.metadata.title(transition.from.attributes),
                    'My Name is INDEX'
                  );
                  assert.equal(transition.to.metadata.name, 'parent-child-page');
                  assert.equal(
                    transition.to.metadata.title(transition.to.attributes),
                    'My Name is CHILD!!'
                  );
                }
              });
            },
          })
        );

        this.add(`route:parent`, Route.extend({}));

        this.add(
          `route:parent.index`,
          Route.extend({
            model() {
              return { name: 'INDEX' };
            },
            buildRouteInfoMetadata() {
              return {
                name: 'parent-index-page',
                title: model => `My Name is ${model.name}`,
              };
            },
          })
        );

        this.add(
          `route:parent.child`,
          Route.extend({
            model() {
              return { name: 'CHILD' };
            },
            buildRouteInfoMetadata() {
              return {
                name: 'parent-child-page',
                title: model => `My Name is ${model.name}!!`,
              };
            },
          })
        );

        return this.visit('/').then(() => {
          return this.visit('/child');
        });
      }
    }
  );
}
